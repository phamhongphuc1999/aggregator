///import * as swapsdk from '@uniswap/sdk';
import state from '../state.js';
import { approve, transfer } from '../common.js';
import { contract, ts, functions, invalidAddresses, toBN, parseAmount, getAddress, findContract, findSwapPair, findPairInfo, findSwapPath, debug } from '../helpers.js';

const OA = Object.assign;

//
const setAmount = (maps, val = maps.oamount) => ([maps._amount, maps.amount] = [maps.amount, val]);

//
const cutAmount = (out, pct = 0.0) => toBN(out).mul(toBN(parseInt((1.0 - pct) * 10000))).div(toBN(10).pow(4))

//
const lpAmount = async (pair, amounts) => {
    debug('lpa', pair, amounts.join());
    const min = (a, b) => a.gt(b) ? b : a;
    const con = contract(pair, 'swaps');
    const [ts, [r0, r1]] = await Promise.all([con.totalSupply(), con.getReserves()]);
    return cutAmount(min(amounts[0].mul(ts).div(r0), amounts[1].mul(ts).div(r1)), state.slippage?.mintlps ?? 0.00001);
};

//
const updateIf = (maps, def, names) => {
    for (const name of names) (def[name]) && ({ [name]: maps[name] } = def)
};

/**
 * Action definitions
 */
const actions = {
    /** @type {Action} */
    swaps: {
        abis: [],
        calls: async function (id, maps = {}, parent = {}) {
            debug('swaps', id);
            [maps.cid, maps.target, maps.token, maps.otoken] = id.split('_');
            let [path, aout] = await findSwapPath(maps.target, maps.token, maps.otoken, maps.amount = await parseAmount(maps.amount, maps.token));
            //
            (state.slippage?.swaps) && (aout = cutAmount(aout, state.slippage.swaps));
            [maps.otoken, maps.oamount] = [maps.otoken, aout];
            //
            const calls = [
                approve(maps.token, maps.target, maps.amount),
                (await functions('swaps')).call.update({...maps, target: maps.target}, [maps.amount, aout, path, maps.account, ts() + state.timeout.swaps])
            ].map(call => call.update(maps));
            //
            setAmount(maps);
            return calls;
        },
        auto: async function (id, maps = {}, parent = {}) {
            if (state.config.optimizeSwaps) {
                debug('swaps.auto', id);
                [maps.cid, maps.target, maps.token, maps.otoken] = id.split('_');
                const calls = [];
                const [path, aouts] = await findSwapPath(maps.target, maps.token, maps.otoken, maps.amount = await parseAmount(maps.amount, maps.token), false);
                const pairs = await Promise.all(path.map((address, i) => i != 0 && findSwapPair(maps.target, path[i-1], address)));
                const token0s = await Promise.all(pairs.map((pair, i) => i != 0 && contract(pair, 'swaps').token0()));
                //
                for (let i = 1; i != path.length; i++) {
                    const j = i-1;
                    const amounts = [aouts[j], aouts[j]];
                    //
                    amounts[(token0s[i].toLowerCase() == path[i]) ? 0 : 1] = aouts[i];
                    maps.target = pairs[i];
                    [maps.otoken, maps.oamount] = [path[i], amounts[1]];
                    //
                    calls.push.apply(calls, [
                        transfer(path[j], maps.target, maps.amount),
                        (await functions('swaps')).swaps.auto.update(maps, [amounts[0], amounts[1], maps.account, []])
                    ]);
                }
                //
                setAmount(maps);
                return calls;
            }
            return await actions.swaps.calls(id, maps, parent, true);
        }
    },
    /** @type {Action} */
    providinglps: {
        abis: [],
        calls: async function (id, maps = {}, parent = {}) {
            debug('providinglps', id);
            [maps.cid, maps.target, maps.token, maps.otoken, maps.pair] = id.split('_');
            //
            const calls = [];
            const amounts = ['0', '0'];
            try {
                maps.amount = await parseAmount(maps.amount, maps.token);
                // one input token, need to, swap half
                [maps.tokens, maps.reserves] = await findPairInfo(maps.otoken);
                [maps.pair, maps.otoken] = [maps.otoken, maps.tokens[(maps.token == maps.tokens[0]) ? 1 : 0]];
                // inaccurate split due to unaccounted fee!
                amounts[0] = toBN(maps.amount).div(2);
                calls.push.apply(calls, await actions.swaps.calls(`_${maps.target}_${maps.token}_${maps.otoken}`, {
                    account: maps.account,
                    amount: toBN(maps.amount).sub(amounts[0])
                }));
                amounts[1] = calls[1].params[1];
                if (state.config.optimalSplit) {
                    //
                } else {
                    amounts[0] = (await findSwapPath(maps.target, maps.otoken, maps.token, amounts[1]))[1];
                }
            } catch (err) {
                debug('lps', err.stack);
                // both  tokens provided, preferably
                amounts[0] = maps.amount;
                [maps.pair, [, amounts[1]]] = await Promise.all([findSwapPair(maps.target, maps.token, maps.otoken), findSwapPath(maps.target, maps.token, maps.otoken, amounts[0])]);
            }
            //
            const amountx = amounts.map((e) => cutAmount(e, state.slippage?.providinglps ?? 0.00001));
            amounts.forEach((e, i) => (maps['amount'+i] = e));
            maps.oamount = await lpAmount(maps.pair, amountx);
            //
            calls.push.apply(calls, [
                approve(maps.token, maps.target, amounts[0]),
                approve(maps.otoken, maps.target, amounts[1]),
                (await functions('providinglps')).call.update({...maps, target: maps.target}, [maps.token, maps.otoken, amounts[0], amounts[1], amountx[0], amountx[1], maps.account, ts() + state.timeout.swaps])
            ].map(call => call.update(maps)));
            //
            setAmount(maps);
            return calls;
        },
        auto: async function (id, maps = {}, parent = {}) {
            if (state.config.optimizeLPs) {
                debug('providinglps.auto', id);
                [maps.cid, maps.target, maps.token, maps.otoken, maps.pair] = id.split('_');
                //
                const calls = [];
                const amounts = ['0', '0'];
                try {
                    maps.amount = await parseAmount(maps.amount, maps.token);
                    // one input token
                    maps.pair = maps.otoken;
                    [maps.tokens, maps.reserves] = await findPairInfo(maps.otoken);
                    maps.otoken = maps.tokens[(maps.token == maps.tokens[0]) ? 1 : 0];
                    // inaccurate split due to unaccounted fee!
                    amounts[0] = toBN(maps.amount).div(2);
                    //
                    calls.push.apply(calls, await actions.swaps.auto(`_${maps.target}_${maps.token}_${maps.otoken}`, {
                        account: maps.account,
                        amount: toBN(maps.amount).sub(amounts[0])
                    }));
                    amounts[1] = calls[1].params[1];
                    if (state.config.optimalSplit) {
                        //
                    } else {
                        amounts[0] = (await findSwapPath(maps.target, maps.otoken, maps.token, amounts[1]))[1];
                    }
                } catch (err) {
                    debug('lps.auto', err.stack);
                    //
                    amounts[0] = toBN(maps.amount);
                    [maps.pair, [, amounts[1]]] = await Promise.all([findSwapPair(maps.target, maps.token, maps.otoken), findSwapPath(maps.target, maps.token, maps.otoken, amounts[0])]);
                }
                maps.oamount = cutAmount(await lpAmount(maps.pair, amounts), state.slippage?.providinglps ?? 0.00001);
                //
                calls.push.apply(calls, [
                    transfer(maps.token, maps.pair, amounts[0]),
                    transfer(maps.otoken, maps.pair, amounts[1]),
                    (await functions('providinglps')).auto.update({...maps, target: maps.pair})
                ]);
                //
                setAmount(maps);
                return calls;
            }
            return await actions.providinglps.calls(id, maps, parent, true);
        }
    },
    /** @type {Action} */
    vaults: {
        abis: [],
        find: true,
        calls: async function (id, maps = {}, parent = {}, auto = false) {
            const action = 'vaults';
            debug(action, id);
            [maps.cid, maps.target, maps.token] = id.split('_');
            //
            const calls = [];
            const def = await findContract(maps.target, action, { token: maps.token });
            if (def) {
                const { deposit:call } = def;
                updateIf(maps, def, ['target', 'token', 'deposittoken', 'outputtoken']);
                maps.amount = await parseAmount(maps.amount, maps.token);
                //
                if (true) {
                    maps.oamount = maps.amount ?? '0';
                }
                //[maps.otoken, maps.oamount] = [, ];
                //
                invalidAddresses.includes(maps.token) ? (maps.eth = maps.amount) : calls.push(approve(maps.token, maps.target, maps.amount).update(maps));
                calls.push(call.update(maps));
                //
                maps.ins.push([maps.token, maps.amount]);
                if (auto) {
                    if (!def.delegate) {
                        return null;
                    }
                    (maps.otoken = def.outputtoken ?? def.otoken ?? def.token1) && maps.outs.push([maps.otoken, maps.oamount]);
                    if (maps.lastStep) {
                        if (def.delegate == 'transfer') {
                            calls.push(transfer(maps.otoken, maps.user, maps.oamount));
                        } else {
                            // replace aggregator with user address
                            calls[calls.length-1] = call.update({...maps, account: maps.user});
                        }
                    }
                }
            }
            setAmount(maps, maps.amount);
            return calls;
        },
        auto: function (id, maps = {}, parent = {}) {
            return actions.vaults.calls(id, maps, parent, true);
        }
    },
    /** @type {Action} */
    lendings: {
        abis: [],
        find: true,
        tokenNames: ['target', 'token', 'deposittoken', 'outputtoken', 'debttoken'],
        calls: async function (id, maps = {}, parent = {}, auto = false) {
            debug('lendings', id);
            [maps.cid, maps.target, maps.token] = id.split('_');
            const calls = [];
            const def = await findContract(maps.target, 'lendings', maps);
            if (def) {
                const { deposit:call } = def;
                // sometimes target needs update
                updateIf(maps, def, actions.lendings.tokenNames);
                maps.amount = await parseAmount(maps.amount, maps.token);
                //
                invalidAddresses.includes(maps.token) ? (maps.eth = maps.amount) : calls.push(approve(maps.token, maps.target, maps.amount).update(maps));
                calls.push(call.update(maps));
                //
                if (def.delegate) {
                    maps.ins.push([maps.token, maps.amount]);
                    maps.outs.push([maps.outputtoken ?? maps.tokens?.[1] ?? maps.otoken, '0']);
                } else if (auto) {
                    return null;
                }
            }
            setAmount(maps, maps.amount);
            return calls;
        },
        auto: function (id, maps = {}, parent = {}) {
            return actions.lendings.calls(id, maps, parent, true);
        }
    },
    /** @type {Action} */
    borrows: {
        abis: [],
        find: true,
        calls: async function (id, maps = {}, parent = {}, auto = false) {
            debug('borrows', id);
            [maps.cid, maps.target, maps.itoken, maps.otoken] = id.split('_');
            const [calls, def] = await Promise.all([
                actions.lendings.calls(`${maps.cid}_${maps.target}_${maps.itoken}`, OA(maps, {token: maps.itoken})),
                findContract(maps.target, 'lendings', OA(maps, {token: maps.otoken}))
            ]);
            if (def && calls.length) {
                const { borrow:call } = def;
                // sometimes target needs update
                updateIf(maps, def, actions.lendings.tokenNames);
                [maps.iamount, maps.itarget, maps.otarget] = [maps.amount, calls.slice(-1)[0].target, def.target ?? maps.target];
                //
                [maps.available, maps.borrowable] = await def.available.get(maps);
                //
                if (def.delegate) {
                    def.approve && (maps.approve = def.approve.update(maps)) && (maps.approve.amount = maps.approve.params[1]);
                    maps.ins.push([maps.itoken, maps.iamount]);
                    maps.outs.push([maps.debttoken ?? maps.tokens?.[1] ?? maps.otoken, '0']);
                } else if (auto) {
                    return null;
                }
                //
                calls.push(call.update(OA(maps, {amount: maps.borrowable})));
            }
            setAmount(maps, maps.amount);
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
