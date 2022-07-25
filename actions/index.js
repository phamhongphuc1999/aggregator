//import * as swapsdk from '@uniswap/sdk';
import state from '../state.js';
import funcs from './funcs.js';
import { approve, transfer } from '../common.js';
import { contract, ts, invalidAddresses, toBN, parseAmount, getAddress, findContract, findSwapPair, findSwapPath, debug } from '../helpers.js';

// get pair tokens
const findPairTokens = async (pair) => {
    const con = contract(pair, 'swaps');
    return (await Promise.all([con.token0(), con.token1()])).map(e => e.toLowerCase())
};

//
const setAmount = (maps, val) => ([maps._amount, maps.amount] = [maps.amount, val]);

//
const cutAmount = (out, pct = 0.0) => toBN(out).mul(toBN(parseInt((1.0 - pct) * 10000))).div(toBN(10).pow(4))

//
const lpAmount = async (pair, amounts) => {
    const con = contract(pair, 'swaps');
    const [ts, [r0, r1]] = await Promise.all([con.totalSupply(), con.getReserves()]);
    return ((a, b) => a.gt(b) ? b : a).apply(null, [amounts[0].mul(ts).div(r0), amounts[1].mul(ts).div(r1)]);
};

/**
 * Action definitions
 */
const actions = {
    /** @type {Action} */
    swaps: {
        abis: [],
        calls: async function (id, maps = {}, parent = {}) {
            let [cid, target, token, otoken] = id.split('_');
            let [path, out] = await findSwapPath(target, token, otoken, maps.amount = await parseAmount(maps.amount, token));
            //
            (state.slippage?.swaps) && (out = cutAmount(out, state.slippage.swaps));
            const calls = [
                approve(token, target, maps.amount),
                funcs.swaps.call.update({...maps, target}, [maps.amount, out, path, maps.account, ts() + state.timeout.swaps])
            ].map(call => call.update(maps));
            //
            setAmount(maps, out);
            return calls;
        },
        auto: async function (id, maps = {}, parent = {}) {
            let [cid, target, token, otoken] = id.split('_');
            const [calls, ins, outs] = [[], [], []];
            const [path, aouts] = await findSwapPath(target, token, otoken, maps.amount = await parseAmount(maps.amount, token), false);
            const pairs = await Promise.all(path.map((address, i) => i != 0 && findSwapPair(target, path[i-1], address)));
            const token0s = await Promise.all(pairs.map((pair, i) => i != 0 && contract(pair, 'swaps').token0()));
            //
            for (let i = 1; i != path.length; i++) {
                const im = i-1;
                const amounts = [aouts[im], aouts[im]];
                amounts[(token0s[i].toLowerCase() == path[i]) ? 0 : 1] = aouts[i];
                maps.target = pairs[i];
                calls.push.apply(calls, [
                    transfer(path[im], maps.target, maps.amount),
                    funcs.swaps.auto.update(maps, [amounts[0], amounts[1], getAddress(), []])
                ]);
            }
            //
            setAmount(maps, aouts[aouts.length-1]);
            return calls;
        }
    },
    /** @type {Action} */
    providinglps: {
        abis: [],
        calls: async function (id, maps = {}, parent = {}) {
            let [cid, target, token, otoken] = id.split('_');
            //
            maps.amount = await parseAmount(maps.amount, token);
            const calls = [];
            const amounts = ['0', '0'];
            try {
                // one input token, need to, swap half
                const tokens = await findPairTokens(otoken);
                otoken = tokens[(token == tokens[0]) ? 1 : 0];
                // inaccurate split due to unaccounted fee!
                amounts[0] = toBN(maps.amount).div(2);
                calls.push.apply(calls, await actions.swaps.calls(`${cid}_${target}_${token}_${otoken}`, {
                    account: maps.account,
                    amount: toBN(maps.amount).sub(amounts[0])
                }));
                amounts[1] = calls[1].params[1];
            } catch (err) {
                debug('lps:', err.stack);
                // both  tokens provided
                amounts[0] = maps.amount;
                amounts[1] = (await findSwapPath(target, token, otoken, maps.amount))[1];
            }
            //
            const amountx = amounts.map((e) => cutAmount(e, state.slippage?.providinglps ?? 0.00001));
            amounts.forEach((e, i) => (maps['amount'+i] = e));
            //
            calls.push.apply(calls, [
                approve(token, target, amounts[0]),
                approve(otoken, target, amounts[1]),
                funcs.providinglps.call.update({...maps, target}, [token, otoken, amounts[0], amounts[1], amountx[0], amountx[1], maps.account, ts() + state.timeout.swaps])
            ].map(call => call.update(maps)));
            //
            setAmount(maps, await lpAmount(await findSwapPair(target, token, otoken), amountx));
            return calls;
        },
        auto: async function (id, maps = {}, parent = {}) {
            let [cid, target, token, otoken] = id.split('_');
            //
            maps.amount = await parseAmount(maps.amount, token);
            const [calls, ins, outs] = [[], [], []];
            const amounts = ['0', '0'];
            let pair;
            try {
                // one input token
                pair = otoken;
                const tokens = await findPairTokens(otoken);
                otoken = tokens[(token == tokens[0]) ? 1 : 0];
                // inaccurate split due to unaccounted fee!
                amounts[0] = toBN(maps.amount).div(2);
                //
                calls.push.apply(calls, await actions.swaps.auto(`_${target}_${token}_${otoken}`, {
                    account: maps.account,
                    amount: toBN(maps.amount).sub(amounts[0])
                }));
                amounts[1] = calls[1].params[1];
            } catch (err) {
                debug('lps.auto:', err.stack);
                //
                pair = await findSwapPair(target, token, otoken);
                amounts[0] = toBN(maps.amount);
                amounts[1] = (await findSwapPath(target, token, otoken, maps.amount))[1];
            }
            //
            calls.push.apply(calls, [
                transfer(token, pair, amounts[0]),
                transfer(otoken, pair, amounts[1]),
                funcs.providinglps.auto.update({...maps, target: pair}, [getAddress()])
            ]);
            //
            setAmount(maps, cutAmount(await lpAmount(pair, amounts), state.slippage?.providinglps ?? 0.00001));
            return calls;
        }
    },
    /** @type {Action} */
    vaults: {
        abis: [],
        calls: async function (id, maps = {}, parent = {}, auto = false) {
            let [cid, target] = id.split('_');
            //
            const [calls, ins, outs] = [[], [], []];
            const def = await findContract(target);
            if (def) {
                const { token, deposit:call } = def;
                [maps.target, maps.token, maps.amount] = [target, token, await parseAmount(maps.amount, token)];
                //
                invalidAddresses.includes(token) ? (maps.eth = maps.amount) : calls.push(approve(token, target, maps.amount).update(maps));
                calls.push(call.update(maps));
                if (!def.nodelegate) {
                    ins.push([maps.token, maps.amount]);
                    outs.push([def.token1 ?? def.token, '0']);
                } else if (auto) {
                    return null;
                }
            }
            //maps.amount = toBN(0);
            return calls;
        },
        auto: function (id, maps = {}, parent = {}) {
            return actions.vaults.calls(id, maps, parent, true);
        }
    },
    /** @type {Action} */
    lendings: {
        abis: [],
        calls: async function (id, maps = {}, parent = {}, auto = false) {
            let [cid, target, token] = id.split('_');
            const [calls, ins, outs] = [[], [], []];
            const def = await findContract(target, 'lendings', { token });
            if (def) {
                const { deposit:call } = def;
                // sometimes target needs update
                (def.target) && ({ target } = def);
                [maps.target, maps.token, maps.amount] = [target, token, await parseAmount(maps.amount, token)];
                //
                invalidAddresses.includes(token) ? (maps.eth = maps.amount) : calls.push(approve(token, target, maps.amount).update(maps));
                calls.push(call.update(maps));
                if (!def.nodelegate) {
                    ins.push([maps.token, maps.amount]);
                    outs.push([def.token1 ?? def.token, '0']);
                } else if (auto) {
                    return null;
                }
            }
            //maps.amount = toBN(0);
            return calls;
        },
        auto: function (id, maps = {}, parent = {}) {
            return actions.lendings.calls(id, maps, parent, true);
        }
    },
    /** @type {Action} */
    borrows: {
        abis: [],
        calls: async function (id, maps = {}, parent = {}, auto = false) {
            let [cid, target, token, otoken] = id.split('_');
            const [calls, def, ins, outs] = await Promise.all([
                actions.lendings.calls(`${cid}_${target}_${token}`, maps),
                findContract(target, 'lendings', { token: otoken }),
                [],
                []
            ]);
            if (def && calls.length) {
                const { borrow:call } = def;
                // sometimes target needs update
                (def.target) && ({ target } = def);
                //
                [maps.target, maps.token, maps.itarget, maps.itoken] = [target, otoken, calls[calls.length-1].target, token];
                maps.amount = await def.available.get(maps, target);
                calls.push(call.update(maps));
                if (!def.nodelegate) {
                    ins.push([maps.token, maps.amount]);
                    outs.push([def.token1 ?? def.token, '0']);
                } else if (auto) {
                    return null;
                }
            }
            //maps.amount = toBN(0);
            return calls;
        },
        auto: function (id, maps = {}, parent = {}) {
            // Auto borrowing is still dangerous
            return actions.borrows.calls(id, maps, parent, true);
        }
        /*
        autoCalls: async function (id, maps = {}, parent = {}) {
            let [cid, target, token, otoken] = id.split('_');
            const calls = [];
            const def = await findContract(target, 'lendings', { token: otoken });
            if (def) {
                calls.push.apply(calls, await actions.lendings.autoCalls(`${cid}_${target}_${token}`, maps));
                const { borrow:call } = def;
            }
            return [];
        }
        */
    }
};

export default actions;

// init uniswap sdk
if (typeof swapsdk === 'object') {
    swapsdk.ChainId = state.chainId;
    swapsdk.FACTORY_ADDRESS = getAddress('swap.factory');
    swapsdk.WETH[state.chainId] = new swapsdk.Token(state.chainId, getAddress('token.eth'), 18, 'WETH', 'Wrapped');
}
