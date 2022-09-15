import state from '../state.js';
import { approve, transfer } from '../common.js';
import { contract, ts, functions, invalidAddresses, toBN, parseAmount, subSlippage, lpAmount, getAddress, findContract, findSwapPair, findPairInfo, findPairAddress, findSwapPath, debug } from '../helpers.js';

const OA = Object.assign;

// reset common map names
const resetMaps = (maps) => {
    for (const name of ['eth', 'token']) delete maps[name];
};

// Check if address is special
const isEth = (address, erc = false) => invalidAddresses.concat(erc ? [getAddress('token.eth')] : []).includes(address.toLowerCase());

// Update new amount shortcut
const setAmount = (maps, val = maps.oamount) => ([maps._amount, maps.amount] = [maps.amount, val]);

/**
 * Action definitions
 */

/** @type {Action} */
const swaps = {
    abis: [],
    calls: async function (id, maps = {}, parent = {}, auto = false) {
        debug('swaps', id);
        //
        const funcs = await functions('swaps');
        const callTypes = ['call', 'calle2', 'call2e'];
        const calls = [];
        [maps.chain, maps.target, ...maps.tokens] = id.split('_');
        [maps.token, maps.otoken] = maps.tokens;
        //
        [maps.path, maps.oamount] = await findSwapPath(maps.target, [maps.token, maps.otoken], maps.amount = await parseAmount(maps.amount, maps.token));
        maps.ts = ts() + state.timeout?.['swaps'];
        //
        maps.oamount = subSlippage(maps.oamount, 'swaps', auto);
        //
        !isEth(maps.token) &&
            calls.push(approve().update(maps));
        calls.push(funcs[callTypes[maps.tokens.indexOf(invalidAddresses[0]) + 1]].update(maps));
        //
        setAmount(maps);
        return calls;
    },
    auto: function (id, maps = {}, parent = {}) {
        return state.config.optimizeSwaps ? (async () => {
            debug('swaps', 'auto', id);
            //
            const funcs = await functions('swaps');
            const calls = [];
            [maps.chain, maps.target, ...maps.tokens] = id.split('_');
            [maps.token, maps.otoken] = maps.tokens;
            //
            const [path, aouts] = await findSwapPath(maps.target, [maps.token, maps.otoken], maps.amount = await parseAmount(maps.amount, maps.token), false);
            //
            const pairs = await Promise.all(path.map((token, i) => i != 0 && findSwapPair(maps.target, [path[i-1], token])));
            const token0s = await Promise.all(pairs.map((pair, i) => i != 0 && contract(pair, 'swaps').token0()));
            //
            for (let i = 1; i != path.length; i++) {
                const i_ = i-1;
                maps.amounts = [aouts[i_], aouts[i]];
                [maps.iamount, maps.oamount] = [maps.amounts[0], maps.amounts[1]];
                (token0s[i].toLowerCase() == path[i]) && maps.amounts.reverse();
                [maps.target, maps.itoken, maps.otoken] = [pairs[i], path[i_], path[i]];
                //
                [].push.apply(calls, funcs.auto.map(call => call.update(maps)));
            }
            //
            setAmount(maps);
            return calls;
        })() : swaps.calls(id, maps, parent, true);
    }
};

/** @type {Action} */
const providinglps = {
    abis: [],
    calls: async function (id, maps = {}, parent = {}, auto = false) {
        debug('providinglps', id);
        const funcs = await functions('providinglps');
        const calls = [];
        // first half are almost same as auto calls
        [maps.chain, maps.target, ...maps.tokens] = id.split('_');
        [maps.token, maps.pair] = maps.tokens;
        [maps.amount, maps.amounts, maps.split] = [await parseAmount(maps.amount, maps.token), ['0', '0'], false];
        //
        try {
            // one input token, need to, swap half
            [maps.tokens, maps.reserves] = await findPairInfo(maps.pair);
            maps.tokens[1] == (isEth(maps.token) ? getAddress('token.eth') : maps.token) && maps.tokens.reverse();
            [maps.otoken, maps.split] = [maps.tokens[1], true];
        } catch (err) {
            [maps.pair, maps.otoken] = [await findSwapPair(maps.target, maps.tokens), maps.tokens[1]];
            //debug('!lps', err.message);
        }
        if (maps.split) {
            const _id = id.replace(maps.pair, maps.otoken);
            // inaccurate split due to unaccounted fee!
            if (state.config.optimalSplit) throw 'noimpl';
            else maps.amounts[0] = toBN(maps.amount).div(2);
            //
            const amount = toBN(maps.amount).sub(maps.amounts[0]);
            [].push.apply(calls,
                await swaps.calls(_id, { ...maps, amount })
            );
            const swap = calls[calls.length - 1];
            // find swap calls output amount
            maps.amounts[1] = maps.oamount ?? swap.params[swap._params.indexOf('__oamount__')];
            if (state.config.optimalSplit) throw 'noimpl';
            else maps.amounts[0] = (await findSwapPath(maps.target, [maps.otoken, maps.token], maps.amounts[1]))[1];
        } else {
            // both tokens provided
            //maps.amounts[0] = maps.amount;
            //[maps.pair, [, maps.amounts[1]]] = await Promise.all([
            //    findSwapPair(maps.target, [maps.token, maps.otoken]),
            //    findSwapPath(maps.target, [maps.token, maps.otoken], maps.amounts[0])
            //]);
            throw 'pair not existed';
        }
        //
        maps.minamounts = maps.amounts.map(amount => subSlippage(amount, 'providinglps', auto));
        maps.oamount = await lpAmount(maps.pair, maps.minamounts);
        maps.ts = ts() + state.timeout?.['providinglps'];
        //
        maps.eth = '0';
        [maps.token, maps.otoken].forEach((token, i) => {
            isEth(token) ?
                (maps.eth = maps.amounts[i]) :
                calls.push(approve(token).update(OA(maps, { amount: maps.amounts[i] }))) &&
                (maps.token = token)
        });
        calls.push(funcs[ maps.eth !== '0' ? 'calle' : 'call' ].update(maps))
        //
        setAmount(maps);
        return calls;
    },
    auto: function (id, maps = {}, parent = {}) {
        return state.config.optimizeLPs ? (async () => {
            debug('providinglps', 'auto', id);
            const funcs = await functions('providinglps');
            const calls = [];
            // first half are almost same as normal calls
            [maps.chain, maps.target, ...maps.tokens] = id.split('_');
            [maps.token, maps.otoken, maps.pair] = maps.tokens;
            [maps.amount, maps.amounts, maps.split] = [await parseAmount(maps.amount, maps.token), ['0', '0'], false];
            //
            try {
                // one input token, need to, swap half
                [maps.tokens, maps.reserves] = await findPairInfo(maps.otoken);
                maps.token == maps.tokens[1] && maps.tokens.reverse();
                [maps.pair, maps.otoken] = [maps.otoken, maps.tokens[1]];
                maps.split = true;
            } catch (err) {
                // pair might not existed, rarely happen
                debug('!lps', 'auto', err.stack);
                if (false) {
                    calls.push(funcs.create.update(maps));
                    maps.pair = await findPairAddress(maps.target, maps.tokens[0], maps.tokens[1]);
                } else {
                    throw 'noimpl';
                }
            }
            if (maps.split) {
                const _id = id.replace(maps.pair, maps.otoken);
                //
                if (state.config.optimalSplit) throw 'noimpl';
                else maps.amounts[0] = toBN(maps.amount).div(2);
                const amount = toBN(maps.amount).sub(maps.amounts[0]);
                [].push.apply(calls,
                    await swaps.calls(_id, { ...maps, amount })
                );
                //
                const swap = calls[calls.length - 1];
                maps.amounts[1] = maps.oamount ?? swap.params[swap._params.indexOf('__oamount__')];
                //
                if (state.config.optimalSplit) throw 'noimpl';
                else maps.amounts[0] = (await findSwapPath(maps.target, [maps.otoken, maps.token], maps.amounts[1]))[1];
            }
            maps.lpamount = await lpAmount(maps.pair, maps.amounts);
            maps.oamount = subSlippage(maps.lpamount, 'providinglps', true);
            //
            maps.target = maps.pair;
            if (isEth(maps.token)) {
                const _maps = { amount: maps.amounts[0] };
                [].push.apply(calls, await wraps.auto(`_${getAddress('token.eth')}_${maps.token}`, _maps, null));
            }
            [].push.apply(calls, funcs.auto.map(call => call.update(maps)));
            //
            setAmount(maps);
            return calls;
        })() : providinglps.calls(id, maps, parent, true);
    }
};

/** @type {Action} */
const wraps = {
    abis: [],
    calls: async function (id, maps = {}, parent = {}) {
        debug('wraps', id);
        const funcs = await functions('wraps');
        [maps.chain, maps.target, maps.token] = id.split('_');
        //
        maps.amount = await parseAmount(maps.amount, maps.token);
        //if (maps.target != getAddress('token.eth')) throw 'noimpl';
        return [
            funcs[maps.token == maps.target ? 'unwrap' : 'call'].update(maps)
        ];
    },
    get auto() {
        return this.calls;
    }
};

/** @type {Action} */
const vaults = {
    abis: [],
    find: true,
    calls: async function (id, maps = {}, parent = {}, auto = false) {
        debug('vaults', id);
        const calls = [];
        [maps.chain, maps.target, maps.token] = id.split('_');
        //
        const def = await findContract(maps.target, 'vaults', maps, ['target', 'token', 'deposittoken', 'outputtoken']);
        if (def) {
            const { deposit:call } = def;
            maps.amount = await parseAmount(maps.amount, maps.token);
            //
            if (true) {
                maps.oamount = maps.amount ?? '0';
            }
            //[maps.otoken, maps.oamount] = [, ];
            //
            isEth(maps.token) ?
                (maps.eth = maps.amount) :
                calls.push(approve().update(maps));
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
        return vaults.calls(id, maps, parent, true);
    }
};

/** @type {Action} */
const lendings = {
    abis: [],
    find: true,
    mapNames: ['target', 'itarget', 'otarget', 'token', 'deposittoken', 'outputtoken', 'debttoken'],
    calls: async function (id, maps = {}, parent = {}, auto = false) {
        debug('lendings', id);
        const calls = [];
        [maps.chain, maps.target, maps.token] = id.split('_');
        const def = await findContract(maps.target, 'lendings', maps, lendings.mapNames);
        if (def) {
            const { deposit:call } = def;
            //
            maps.amount = await parseAmount(maps.amount, maps.token);
            //
            isEth(maps.token) ?
                (maps.eth = maps.amount) :
                calls.push(approve().update(maps));
            calls.push(call.update(maps));
            //
            if (def.delegate) {
                maps.ins.push([maps.token, maps.amount]);
                maps.outs.push([maps.outputtoken ?? maps.otoken, '0']);
            } else if (auto) {
                return null;
            }
        }
        setAmount(maps, maps.amount);
        return calls;
    },
    auto: function (id, maps = {}, parent = {}) {
        return lendings.calls(id, maps, parent, true);
    }
};

/** @type {Action} */
const borrows = {
    abis: [],
    find: true,
    calls: async function (id, maps = {}, parent = {}, auto = false) {
        debug('borrows', id);
        [maps.chain, maps.target, ...maps.tokens] = id.split('_');
        const _id = id;
        const calls = await lendings.calls(_id, maps, { id });
        const def = await findContract(maps.target, 'lendings', OA(maps, { token: maps.tokens[1] }), lendings.mapNames);
        // need a reset from previous lendings calls
        [maps.itoken, maps.otoken] = maps.tokens, maps.token = maps.otoken, maps.eth = '0';
        if (calls.length && def) {
            const { borrow:call } = def;
            //
            [maps.iamount, maps.itarget, maps.otarget] = [maps.amount, calls.slice(-1)[0].target, def.target ?? maps.target];
            //
            const res = await def.available.get(maps);
            [, maps.borrowable, ] = res;
            calls.push(call.update(OA(maps, { amount: maps.borrowable })));
            //debug('borrows', maps.targets ?? maps.target, maps.tokens, res, calls.map(call => call.target));
            //
            if (def.delegate) {
                // set user approve delegated borrows
                def.approve && (maps.approve = def.approve.update({ ...maps, account: maps.user })) && (maps.approve.amount = maps.approve.params[1]);
                maps.ins.push([maps.itoken, maps.iamount]);
                maps.outs.push([maps.debttoken ?? maps.otoken, '0']);
            } else if (auto) {
                return null;
            }
        }
        setAmount(maps, maps.amount);
        return calls;
    },
    auto: function (id, maps = {}, parent = {}) {
        // Auto borrowing is still dangerous
        return borrows.calls(id, maps, parent, true);
    }
    /*

    autoCalls: async function (id, maps = {}, parent = {}) {
        let [cid, target, token, otoken] = id.split('_');
        const calls = [];
        const def = await findContract(target, 'lendings', { token: otoken });
        if (def) {
            [].push.apply(calls, await lendings.autoCalls(id, maps));
            const { borrow:call } = def;
        }
        return [];
    }

    */
};

const actions = {
    swaps,
    providinglps,
    wraps,
    vaults,
    lendings,
    borrows
};

export default actions;
