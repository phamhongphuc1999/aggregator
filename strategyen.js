'use strict'

import state from './state.js';
import funcs from './actions/funcs.js';
import actions from './actions/index.js';
import { ts, debug, getAddress, parseAmount, invalidAddresses } from './helpers.js';

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
    //
    const get = async (info) => {
        const id = (info.id ?? info.strategy_id), action = (info.method ?? info.methods[0]),
            get = actions[action][func],
            step = count++;
        return (id && action && get) ? (await get(id, state.maps)).map(
            (call) => OA(call, { step, action })
        ) : [];
    };
    //
    let arr = [];
    try {
        if (!allowAsync) {
            for (const step of steps) arr = arr.concat(await get(step));
        } else {
            arr = (await Promise.all(steps.map(get))).reduce((arr, calls) => arr.concat(calls), []);
        }
    } catch(err) {
        debug(func, err.message, err.stack);
    }
    return arr;
};

/**
 * process single call
 * @param {Call} call
 * @returns Call
 */
const processCall = (call) => {
    OA(call,
        {
            //...(call.check?.encode) && { check: OA(call.check, { encoded: call.check.encode() }) },
            tx: call.get(state.maps.account, (++state.maps.nonce ?? null)),
            title: call.descs.title ?? '',
            params: call.params.map((param, i) => ({
                value: param,
                display: (call.descs.values ?? [])[i] ?? formatParam(param) ?? param,
                comment: (call.descs.params ?? [])[i] ?? ''
            })),
            descs: undefined
        }
    );
    return call;
};

/**
 * Generate complete execution data based on strategy steps
 * @param {Strategy} strategy
 * @params {Object} maps
 * @returns {StrategyExecs}
 */
export async function process(strategy, maps = {}, merge = true, quick = false) {
    // initialize variables
    OA(state.maps, maps);
    const starttime = Date.now();
    let [auto, ins, outs] = [null, [], []];
    let temp;

    // Generate manual call/params and checks
    const calls = (await Promise.all(
            (await all(strategy.steps))
            .map(call => call.meta())
        ))
        .map(processCall);

    // Generate auto call/params and expectation
    const acalls = quick ? null : (await all(strategy.steps, 'autoCalls'));

    // encode auto calls for use with aggregator
    if (acalls && acalls.length) {
        // only last check needed
        const checks = [ acalls[acalls.length-1].check ];
        const eth = (ins.filter((e) => invalidAddresses.includes(e[0]))[0] ?? [, '0'])[1];
        try {
            if ((temp = Object.keys(strategy.strategy?.capital)).length) {
                for (const token of temp) {
                    let i = 0;
                    (!invalidAddresses.includes(token)) && ins.push([
                        token,
                        await parseAmount(state.maps['amount'+(++i)] ?? state.maps['amount'], token)
                    ]);
                }
            }
            if ((temp = Object.keys(strategy.steps[strategy.steps.length-1].reward_tokens)).length) {
                for (const token of temp) {
                    let i = 0;
                    (!invalidAddresses.includes(token)) && ins.push([
                        token,
                        '0'
                    ]);
                }
            }
            auto = {
                calls: acalls.map((call, i, arr) => OA(call, { ...(arr.length-1 != i) && { check: null } })),
                checks,
                transfers: [ins, outs],
                call: funcs.aggregate.call.update({
                    target: getAddress(),
                    calls: acalls.map(call => call.encode()),
                    checks: checks.map(check => check.encode()),
                    ins,
                    outs,
                    eth
                })
            };
            auto.call.tx = auto.call.encode();
        } catch(err) {
            debug('encode', err.message, err.stack);
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
    NETWORK: 'network', // alter network condition
    FREEZE: 'freeze', // stop execution
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
for (const [name, val] of Object.entries({
    aggregator: getAddress()
})) {
    (!state.maps[name]) && (state.maps[name] = val);
}

export { getAddress, invalidAddresses };
