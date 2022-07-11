import swapsdk from '@uniswap/sdk';
import state from '../state.js';
import funcs from './funcs.js';
import { Call, approve, transfer } from '../common.js';
import { contract, ts, invalidTokens, toBN, parseAmount, getAddress, findContract, findSwapPair, findSwapPath, debug } from '../helpers.js';

// init uniswap sdk
if (swapsdk) {
    swapsdk.ChainId = state.chainId;
    swapsdk.FACTORY_ADDRESS = getAddress('swap.factory');
    swapsdk.WETH[state.chainId] = new swapsdk.Token(state.chainId, getAddress('token.eth'), 18, 'WETH', 'Wrapped');
}

/**
 * splitted function
 */
const findPairTokens = async (pair) => {
    const con = contract(pair, 'swaps');
    return (await Promise.all([con.token0(), con.token1()])).map(e => e.toLowerCase())
};

const actions = {
    swaps: {
        abis: [],
        calls: async function (id, maps = {}, parent = {}) {
            let [cid, target, token, otoken] = id.split('_');
            let [path, out] = await findSwapPath(target, token, otoken, maps.amount = await parseAmount(maps.amount, token));
            //
            if (state.slippage?.swaps) {
                out = out.mul(toBN(parseInt((1.0 - state.slippage.swaps) * 10000))).div(toBN(10).pow(4));
            }
            const calls = [
                approve(token, target, maps.amount),
                new Call(target, funcs.swaps.call.method, [maps.amount, out, path, maps.account, ts() + state.timeout.swaps], 0, funcs.swaps.call.desc)
            ].map(call => call.update(maps));
            //
            maps.amount = out;
            return calls;
        },
        autoCalls: async function (id, maps = {}, parent = {}) {
            let [cid, target, token, otoken] = id.split('_');
            const calls = [];
            const [path, outs] = await findSwapPath(target, token, otoken, maps.amount = await parseAmount(maps.amount, token), false);
            const pairs = await Promise.all(path.map((address, i) => i != 0 && findSwapPair(target, path[i-1], address)));
            const token0s = await Promise.all(pairs.map((pair, i) => i != 0 && contract(pair, 'swaps').token0()));
            //
            for (let i = 1; i != path.length; i++) {
                const im = i-1;
                const amounts = [outs[im], outs[im]];
                amounts[(token0s[i].toLowerCase() == path[i]) ? 0 : 1] = outs[i];
                calls.push.apply(calls, [
                    transfer(path[im], pairs[i], maps.amount),
                    new Call(pairs[i], funcs.swaps.auto.method, [amounts[0], amounts[1], getAddress(), []], 0, funcs.swaps.auto.desc).update(maps)
                ]);
            }
            //
            maps.amount = outs[outs.length-1];
            return calls;
        },
        autoTransfers: async function (id, ins = [], outs = []) {
            return [ins, outs];
        }
    },
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
                debug('lps:', 'm', err.message);
                // both  tokens provided
                amounts[0] = maps.amount;
                amounts[1] = (await findSwapPath(target, token, otoken, maps.amount))[1];
            }
            calls.push.apply(calls, [
                approve(token, target, amounts[0]),
                approve(otoken, target, amounts[1]),
                new Call(target, funcs.providinglps.call.method, [token, otoken, amounts[0], amounts[1], amounts[0], amounts[1], maps.account, ts() + state.timeout.swaps], 0, funcs.providinglps.call.desc)
            ].map(call => call.update(maps)));
            //maps.amount = toBN(0);
            return calls;
        },
        autoCalls: async function (id, maps = {}, parent = {}) {
            let [cid, target, token, otoken] = id.split('_');
            //
            maps.amount = await parseAmount(maps.amount, token);
            let pair;
            const calls = [];
            const amounts = ['0', '0'];
            try {
                // one input token
                pair = otoken;
                const tokens = await findPairTokens(otoken);
                otoken = tokens[(token == tokens[0]) ? 1 : 0];
                //
                calls.push.apply(calls, await actions.swaps.autoCalls(`_${target}_${token}_${otoken}`, {
                    account: maps.account,
                    amount: toBN(maps.amount).sub(amounts[0])
                }));
                amounts[1] = calls[1].params[1];
            } catch (err) {
                debug('lps:', 'a', err.message);
                //
                pair = await findSwapPair(target, token, otoken);
                amounts[0] = maps.amount;
                amounts[1] = (await findSwapPath(target, token, otoken, maps.amount))[1];
            }
            calls.push.apply(calls, [
                transfer(token, pair, amounts[0]),
                transfer(otoken, pair, amounts[1]),
                new Call(pair, funcs.providinglps.auto.method, [getAddress()], 0, funcs.providinglps.auto.desc).update(maps)
            ]);
            //maps.amount = toBN(0);
            return calls;
        },
        autoTransfers: async function (id, ins = [], outs = []) {
            return [ins, outs];
        }
    },
    vaults: {
        abis: [],
        calls: async function (id, maps = {}, parent = {}) {
            let [cid, target] = id.split('_');
            //
            const calls = [];
            const def = await findContract(target);
            if (def) {
                const { token, deposit:call } = def;
                [maps.target, maps.token, maps.amount] = [target, token, await parseAmount(maps.amount, token)];
                //
                invalidTokens.includes(token) ? (maps.eth = maps.amount) : calls.push(approve(token, target, maps.amount).update(maps));
                calls.push(call.update(maps));
            }
            //maps.amount = toBN(0);
            return calls;
        },
        autoCalls: function (id, maps = {}, parent = {}) {
            return actions.vaults.calls(id, maps, parent, true);
        },
        autoTransfers: async function (id, ins = [], outs = []) {
            const def = await findContract(id.split('_')[1]);
            if (def) {
                const { token } = def;
                ins.push([token, '__amount__']);
                if (otoken && def.nodelegate) {
                    // 0 may means all
                    outs.push([otoken, '0']);
                }
            }
            return [ins, outs];
        }
    },
    lendings: {
        abis: [],
        calls: async function (id, maps = {}, parent = {}) {
            let [cid, target, token] = id.split('_');
            const calls = [];
            const def = await findContract(target, 'lendings', { token });
            if (def) {
                const { deposit:call } = def;
                // sometimes target needs update
                (def.target) && ({ target } = def);
                [maps.target, maps.token, maps.amount] = [target, token, await parseAmount(maps.amount, token)];
                //
                invalidTokens.includes(token) ? (maps.eth = maps.amount) : calls.push(approve(token, target, maps.amount).update(maps));
                calls.push(call.update(maps));
            }
            //maps.amount = toBN(0);
            return calls;
        },
        autoCalls: function (id, maps = {}, parent = {}) {
            return actions.lendings.calls(id, maps, parent);
        },
        autoTransfers: async function (id, ins = [], outs = []) {
            let [cid, target, token] = id.split('_');
            const def = await findContract(target);
            if (def) {
                const { token:otoken } = def;
                ins.push([token, '__amount__']);
                if (otoken && def.nodelegate) {
                    outs.push([otoken, '0']);
                }
            }
            return [ins, outs];
        }
    },
    borrows: {
        abis: [],
        calls: async function (id, maps = {}, parent = {}) {
            let [cid, target, token, otoken] = id.split('_');
            const [def, calls] = await Promise.all([
                findContract(target, 'lendings', { token: otoken }),
                actions.lendings.calls(`${cid}_${target}_${token}`, maps)
            ]);
            if (def && calls.length) {
                const { borrow:call } = def;
                // sometimes target needs update
                (def.target) && ({ target } = def);
                //
                [maps.target, maps.token, maps.itarget, maps.itoken] = [target, otoken, calls[calls.length-1].target, token];
                maps.amount = await def.available.get(maps);
                calls.push.apply(calls, [
                    call.update(maps)
                ]);
            }
            //maps.amount = toBN(0);
            return calls;
        },
        autoCalls: async function (id, maps = {}, parent = {}) {
            // Auto borrowing is still dangerous
            let [cid, target, token, otoken] = id.split('_');
            const calls = [];
            const def = await findContract(target, 'lendings', { token: otoken });
            if (def) {
                calls.push.apply(calls, await actions.lendings.autoCalls(`${cid}_${target}_${token}`, maps));
                const { borrow:call } = def;
            }
            //
            return [];
        },
        autoTransfers: async function (id, ins = [], outs = []) {
            return [ins, outs];
        }
    }
};

export default actions;
