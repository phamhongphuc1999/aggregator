/**
 * Automatic Strategy Encoder
 * For use with data from ScoringAPI of trava.finance (BRicher project)
 *
 *
 *
 *
 */


'use strict'

import state from './state.js';
import funcs from './actions/funcs.js';
import actions from './actions/index.js';
import { approve, allowance } from './common.js';
import { ts, toBN, debug, getAddress, getToken, parseAmount, invalidAddresses } from './helpers.js';

const OA = Object.assign;

// allow calls generation to be async
/** @type {boolean} */
const allowAsync = false;

export { allowAsync };

/**
 * @typedef {Object} Call
 * @typedef {Object} View
 * @typedef {Object} Check
 * @typedef {Object} Strategy
 * @typedef {Object} StrategyExecs
 */

/**
 * Get all helper
 * @param {Object[]} steps
 * @param {string} func
 * @param {number} count
 * @returns
 */
const all = async function (steps, func = 'calls', count = 0) {
    // merge calls helper
    const get = async (info) => {
        const
            id = (info.id ?? info.strategy_id), action = (info.method ?? info.methods[0]),
            step = count++;
        let get = actions[action][func];
        if (id && action && get && (get = await get(id, state.maps))) {
            return get.map((call) => OA(call, { step, action }));
        }
        return [];
    };
    // do it sequential or in parallel
    try {
        if (allowAsync) {
            return (await Promise.all(steps.map(get))).reduce((calls, items) => calls.concat(items), []);
        } else {
            let calls = [];
            for (const step of steps) calls = calls.concat(await get(step));
            return calls;
        }
    } catch(err) {
        debug(func, err.message, err.stack);
    }
    //
    return [];
};

/**
 * process single call
 * @param {Call} call
 * @returns Call
 */
const formatCall = async (call, notx = false) => {
    const formatParam = (val) => {
        return ''+val;
    };
    //
    try {
        let tx;
        if (notx !== true) {
            call = await call.meta();
            tx = call.get(state.maps.account, (++state.maps.nonce ?? null));
        }
        //
        OA(call,
            {
                //...(call.check?.encode) && { check: OA(call.check, { encoded: call.check.encode() }) },
                tx,
                title: call.descs.title ?? '',
                params: call.params.map((param, i) => ({
                    value: param,
                    display: (call.descs.values ?? [])[i] ?? formatParam(param) ?? param,
                    comment: (call.descs.params ?? [])[i] ?? ''
                })),
                descs: undefined
            }
        );
    } catch (err) {
        debug('format', err.message, err.stack);
    }
    //
    return call;
};

/**
 * Merge approve calls
 * @param {Call[]} calls
 * @returns Call
 */
const mergeApproves = async (calls) => {
    try {
        const method = approve().method;
        const approves = (await Promise.all(calls
            .filter(call => call.method === method)
            .filter((call, i, arr) => {
                let found = arr.findIndex((e, i) => e.target == call.target);
                if (found !== -1 && found != i && (found = arr[found].params)) {
                    found[1] = found[1].add(call.params[1]);
                    return false;
                }
                return true;
            })
            .map(async call =>
                OA(call, {_allowance: await allowance(call.target, state.maps.account, call.params[0]).get()}))
            ))
            .filter(call => {
                if (call._allowance.gte(toBN(call.params[1]))) {
                    return false;
                } else if (state.config.approveMax) {
                    call.params[1] = toBN('0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff');
                }
                return true;
            });
        //
        approves.forEach(call => {
            call.step = -1;
            call.action = 'approve';
        });
        // lodash would be useful here
        return approves.concat(calls.filter(call => call.method !== method));
    } catch (err) {
        debug('approves', err.message, err.stack);
    }
    //
    return calls;
};

/**
 * Generate complete execution data based on strategy steps
 * @param {Strategy} strategy
 * @params {Object} maps
 * @returns {StrategyExecs}
 */
export async function process(strategy, maps = {}, merge = true, quick = false) {
    // initialize variables
    maps = {...state.maps, ...maps};
    const autoTarget = getAddress();
    // run analysis
    const starttime = Date.now();
    let [auto, ins, outs] = [null, [], []];
    let temp;

    OA(state.maps, maps);
    // Generate manual call/params and checks
    const calls = (await Promise.all(
            (await mergeApproves(await all(strategy.steps)))
            .map(formatCall)
        ));

    OA(state.maps, maps);
    // Generate auto (aggregated) call/params and expectation
    const acalls = quick ? null : (await all(strategy.steps, 'auto'));

    // encode auto calls for use with aggregator
    if (acalls && acalls.length) {
        try {
            // only last check is needed
            const checks = [];
            const eth = (ins.filter((e) => invalidAddresses.includes(e[0]))[0] ?? [, '0'])[1];
            //
            for (const call of acalls.slice().reverse()) {
                if (call.check && call.check.encode) {
                    checks.push(call.check);
                    break;
                }
            }
            // Standardize transfers
            const processTransfer = async (token, i) => {
                //if(!invalidAddresses.includes(token))
                const amount = await parseAmount(maps['amount'+i] ?? maps['amount'], token);
                return {
                    token,
                    amount,
                    tx: approve(token, autoTarget, amount).get(state.maps.account),
                    ...getToken(token)
                };
            };
            const toArray = (e) => Object.values(e).slice(0,2);
            // ins
            if (strategy.strategy?.capital) {
                ins = await Promise.all(Object.keys(strategy.strategy?.capital ?? {}).map(processTransfer));
            }
            // outs
            if (true) {
                outs = [];
            }
            const call = funcs.aggregate.call.update({
                target: autoTarget,
                calls: acalls.map(call => call.encode()),
                checks: checks.map(check => check.encode()),
                ins: ins.map(toArray),
                outs: ins.map(toArray),
                eth
            });
            //
            acalls.forEach((call, i, arr) => OA(call, { ...(arr.length-1 != i) && { check: null } }));
            auto = {
                calls: await Promise.all(acalls.map(call => formatCall(call, true))),
                checks,
                transfers: {ins, outs},
                call,
                tx: call.get(autoTarget) ?? null
            };
        } catch(err) {
            debug('auto', err.message, err.stack);
        }
    }

    // final result
    return {
        id: strategy.id ?? strategy.strategy_id,
        title: strategy.strategy?.name ?? '',
        timestamp: ts(),
        ran: Date.now() - starttime,
        expiry: 360,
        maps: state.maps,
        calls,
        auto,
        ...(merge) && strategy
    };
};

// Error directory
const Error = Object.freeze({
    UNKNOWN: 'unknown', // general failure
    PROVIDER: 'provider', // includes fee
    FUND: 'fund', // missing funds
    SLIPPAGE: 'slippage', // for swaps and borrows
});

// Suggested actions dictionary
const Suggest = Object.freeze({
    NONE: 'none', // no action suggested
    REEXEC: 'reexec', // call process() and re-do
    INPUT: 'input', // alter some inputs
    WAIT: 'wait', // please wait and alter network condition
    STOP: 'stop', // stop execution
});

// Error prefixs
const Prefixs = Object.freeze([
    'Aggregate',
    'Expect',
    'View',
    'TransferIn',
    'TransferOut'
]);

export { Error, Suggest, Prefixs };

/**
 * Process and returns useful directions related to the error
 * @param {any} err
 * @param {Call|Call[]} callx
 * @returns
 */
export async function processError(err, callx = null) {
    //
    const code = err.error?.data?.code ?? err.error?.code ?? 0;
    let reason = err.error?.date?.message ?? err.reason ?? '';
    let reason_parts = reason.split(/:|,|;/).map(e => e.trim());
    //const stack = JSON.parse(err.error?.stack ?? '{}');
    //console.error(stack);
    const stack = [];
    let error = Error.UNKNOWN;
    let suggest = Suggest.NONE;

    // determine
    let index = -1;
    if (callx && callx.length) {
        index = 0;
        if (Prefixs.includes(reason_parts[0] ?? '')) {
            index = parseInt(reason_parts[1]);
        }
        reason = reason_parts[2] ?? reason_parts[1] ?? reason_parts[0] ?? '.';
        callx = callx[index];
    }

    //
    const at = {
        step: callx?.step ?? 0,
        title: callx?.title ?? '',
        ...(index != -1) && { call: index },
        contract: callx?.target ?? null,
        function: callx?.method ?? '',
    };

    //
    if (err.code == 4001) {
        [error, reason, reason_parts] = [Error.PROVIDER, 'Transaction request canceled.', []];
    } else if (err.method == 'estimateGas') {
        // Request still in preflight
        // Need simulation API to determine stack trace
        suggest = Suggest.REEXEC;
    } else {
        if (reason_parts.filter(e => e.match(/insufficient|enough/i)).length) {
            error = Error.SLIPPAGE;
        }
    }

    //
    return {
        suggest, // action
        error, // predefined error
        code, // integer
        at, // where fault is
        reason, // revert string
        reason_parts, // splitted
        stack // call stack from provider
    };
};

// default map values assign here
Object.entries({
    aggregator: getAddress(),
    ts: ts()
}).forEach(([name, val]) => (!state.maps[name]) && (state.maps[name] = val));

export { getAddress, invalidAddresses };
