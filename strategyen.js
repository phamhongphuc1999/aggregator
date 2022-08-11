/**
 * Automatic Strategy Encoder
 * For use with data from ScoringAPI of trava.finance (BRicher project)
 *
 *
 *
 *
 */

//use strict'

import state from './state.js';
import config from './config.js';

import * as helpers from './helpers.js';
const { ts, serialize, toBN, debug, functions, getAddress, getToken, parseAmount, invalidAddresses, findContract, getProvider } = helpers;
import * as common from './common.js';
const { approve, allowance } = common;

import actions from './actions/index.js';

const OA = Object.assign;
const time = Date.now;

/**
 * @typedef {Object} Step
 * @typedef {Object} Call
 * @typedef {Object} View
 * @typedef {Object} Check
 * @typedef {Object} Strategy
 * @typedef {Object} StrategyExecs
 */

export const version = config.package.version;

export { state, config, helpers };

/**
 * Get
 * @param {string} id
 */
export async function getStrategy(id, amount = state.maps.amount) {
    const api_url = `${state.config.apiBase}/strategies/${id}?amount=${amount}`;
    return (await (await import('axios')).default.get(api_url, { responseType: 'json' })).data;
}

/**
 * Get all helper
 * @param {Object[]} steps
* @param {string} func
 * @param {Object} maps
 * @param {number} i
 * @returns
 */
async function allCalls (steps, func, maps) {
    let calls = [];
    // merge calls helper
    const get = async (step, i, get) => {
        const
            ms = time(),
            id = (step.id ?? step.strategy_id),
            action = (step.method ?? step.methods[0]),
            addprops = { action, step: i, ...(i == steps.length) && {lastStep: true} };
        return id && action && (get = actions[action][func]) &&
            (get = await get(id, OA(maps, addprops))) &&
        debug(func, action, (time() - ms) + 'ms') ?
            get.map((call) => OA(call, addprops)) :
            [];
    };
    // do it sequential or in parallel
    try {
        if (state.config.allowAsync) {
            calls = (await Promise.all(steps.map(get))).reduce((calls, items) => calls.concat(items), []);
        } else {
            let i = 0;
            for (const step of steps){
                calls = calls.concat(await get(step, i++));
            }
        }
    } catch(err) {
        debug('all.'+func, err.message, err.stack);
    }
    //
    return calls;
};

/**
 * Merge approve calls
 * @param {Promise<Call[]>} calls
 * @returns {Promise<Call[]>}
 */
async function optimizeCalls (calls, maps) {
    calls = await calls;
    try {
        const method = approve().method;
        const approves = (await Promise.all(calls
            .filter(call => call.method === method)
            .filter((call, i, arr) => {
                let found = arr.findIndex((e, i) => e.target == call.target);
                if (found !== -1 && found != i && (found = arr[found].params)) {
                    return (found[1] = found[1].add(call.params[1])) && false;
                }
                return true;
            })
            .map(async call =>
                OA(call, {_allowance: await (call.check?.view ?? allowance(call.target, maps.account, call.params[0])).get()}))
            ))
            .filter(call => {
                if (call._allowance.gte(toBN(call.params[1]))) {
                    return false;
                } else if (state.config.approveMax) {
                    call.params[1] = toBN('0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff');
                }
                return true;
            })
            .map(call => OA(call, {step: -1, action: 'approve'}));
        // lodash would be useful here
        return approves.concat(calls.filter(call => call.method !== method));
    } catch (err) {
        debug('approves', err.message, err.stack);
    }
    //
    return calls;
};

/**
 * Format single call
 * @param {Call} call
 * @param {Object} maps
 * @returns {Call}
 */
function formatCall (call, maps) {
    const formatParam = (val) => { return ''+val; };
    //
    return OA(call, {
        //...(call.check?.encode) && { check: OA(call.check, { encoded: call.check.encode() }) },
        title: call.descs.title ?? '',
        params: call.params.map((value, i) => ({
            value,
            display: call.descs?.values?.[i] ?? formatParam(value) ?? value,
            comment: call.descs?.params?.[i] ?? '',
            ...(call.descs?.editable == i) && { _value: value, editable: true }
        })),
        tx: call.get(maps.account, ++maps.nonce),
        descs: undefined
    });
};

/**
 * Generate complete execution data based on strategy steps
 * @param {Strategy|string} strategy
 * @param {Object} maps
 * @param {boolean=} noauto
 * @param {boolean=} merge
 * @returns {Promise<StrategyExecs>}
 */
export async function process(strategy, maps = {}, noauto = null, merge = true, logs = false) {
    (typeof strategy === 'string') && (strategy = await getStrategy(strategy, maps.amount));
    //
    maps = Object.freeze(maps);
    // result object
    const res = {
        id: strategy.id ?? strategy.strategy_id,
        title: strategy.strategy?.name ?? strategy.name ?? '',
        timestamp: ts(),
        ran: 0,
        expiry: ts() + state.timeout.execute,
        calls: [],
        auto: {},
        ...(merge == true) && strategy
    };
    // run analysis
    const logstart = state.logs.length;
    const ms = time();
    const from = maps.retry?.realCall ?? maps.retry?.call ?? null;
    const transfers = {ins: [], out: []};
    const steps = strategy.steps ?? [];
    let temp;

    // default map values
    const addmaps = {
        user: maps.account,
        receiver: maps.account,
        aggregator: getAddress(),
        steps: steps.length,
        ts: ts(),
        strategy: res.id,
        ins: [],
        outs: [],
        ...(maps.nonce === undefined && state.config.needNonce) && { nonce: await getProvider().getTransactionCount(maps.account) }
    };

    // initialize variables
    const _maps = { ...state.maps, ...maps, ...addmaps, auto: !noauto, account: addmaps.aggregator };

    if (from !== null) {
        //
    }

    // Generate manual call/params and checks
    // Generate auto (aggregated) call/params and expectation
    [res.calls, res.auto.calls] = await Promise.all([
        (noauto === false && state.config.noautoSkipCalls) ? [] : optimizeCalls(allCalls(steps, 'calls', temp={ ...state.maps, ...maps, ...addmaps }), temp),
        noauto ? [] : allCalls(steps, 'auto', _maps)
    ]);

    // encode auto calls for use with aggregator
    if (res.auto.calls?.length) {
        let eth = '0';
        const target = getAddress();
        // hacky
        if (true){
            OA(_maps, maps);
        }
        try {
            // only last check is needed, must be a check available
            res.auto.checks = [
                res.auto.calls.slice().reverse().find(call =>
                    call.check && call.check.encode
                ).check
            ];
            // Standardize transfers
            const processTransfer = async (a, i) => {
                //if(!invalidAddresses.includes(token))
                // need a little optimization
                const input_amount = _maps.amounts?.[i] ?? _maps.amount ?? state.maps.amount;
                const token = a.target ?? a;
                debug('capital', token, input_amount);
                //
                const amount = await parseAmount(input_amount, token);
                const tx = a.target ? a : approve(token, target, amount).update({ account: _maps.account });
                // send eth along
                invalidAddresses.includes(token) && (eth = amount);
                return {
                    token,
                    amount,
                    tx: (await tx.check?.view?.get() ?? toBN(0)).gte(amount) ? null : tx.get(_maps.account, ++_maps.nonce ?? null),
                    ...getToken(token)
                };
            };
            // tramsfer ins: from capital property and weth
            if (temp = strategy.strategy?.capital ?? strategy.capital ?? {}) {
                transfers.ins = await Promise.all(
                    Object.keys(temp)
                    // a custom approval needed
                    .concat(_maps.approve ? [_maps.approve] : [])
                    .map(processTransfer));
                //transfers.ins.push();
            }
            // transfer outs, NOT USED anymore, calls already has transfer or equivalent
            if (temp = {}) {
                transfers.outs = Object.keys(temp).map(processTransfer);
            }
            //
            res.auto.calls = res.auto.calls
                .map((call, i, arr) => OA(call, { ...(arr.length-1 != i) && { check: null } }))
                .map(call => formatCall(call, _maps))
            res.auto.transfers = transfers;
            res.auto.call = (await functions('aggregate')).call.update({
                target,
                eth,
                calls: res.auto.calls.map(call => Object.values(call.tx).slice(0,3)),
                checks: res.auto.checks.map(check => check.encode()),
                ins: transfers.ins.map(e => Object.values(e).slice(0,2)),
                //outs: transfers.outs.map(e => Object.values(e).slice(0,2))
            });
            res.auto.call.tx = res.auto.call.get(_maps.account, ++_maps.nonce ?? NaN);
        } catch(err) {
            debug('auto', err.message, err.stack);
        }
    } else {
        res.auto = null;
    }

    res.ran = time() - ms;
    // calls/auto maps
    res.maps = _maps;

    if (res.calls?.length) {
        temp = { account: addmaps.user, nonce: addmaps.nonce };
        res.calls = (await Promise.all(
                res.calls.map(call => call.meta())
            ))
            .map(call => formatCall(call, temp));
    }
    if (logs) {
        res.logs = state.logs.slice(logstart).map(([time, log]) => time + ': ' + log);
    }

    // final result
    return res;
};

/**
 * Allow update to state
 */
export function setState(func = state=>state) {
    OA(state, func(state));
};

/**
 * Check if automatic execution is available for a strategy
 * @param {Strategy} strategy
 * @returns {Promise<boolean>}
 */
export async function autoAvailability(strategy) {
    (typeof strategy === 'string') && (strategy = await getStrategy(strategy));
    //const ms = time();
    let avail = true;
    // if works correctly, findContract never throws
    const defs = await Promise.all((strategy.steps ?? []).map(step => {
        const id = (step.id ?? step.strategy_id), action = (step.method ?? step.methods[0]);
        const [, target, token] = id.split('_');
        return (actions[action]?.find) ?
            findContract(target, action, { token }) :
            { title: '', delegate: true };
    }));
    avail = defs.filter((def) => def.delegate).length == defs.length;
    debug('availability', defs.map(e => e.delegate));
    return avail;
};

// Error directory
const ErrorType = Object.freeze({
    UNKNOWN: 'unknown', // general failure
    PROVIDER: 'provider', // includes fee
    FUND: 'fund', // missing funds
    SLIPPAGE: 'slippage', // for swaps and borrows
    APP: 'app' // protocol specific faults
});

// Suggested actions dictionary
const Suggest = Object.freeze({
    NONE: 'none', // no action suggested or 'wait', please wait and alter network condition
    REEXEC: 'reexec', // call process() and re-do
    INPUT: 'input', // alter some inputs
    STOP: 'stop' // stop execution
});

// Error prefixs
const AutoPrefixs = Object.freeze([
    'Aggregate',
    'Expect',
    'View',
    'TransferIn',
    'TransferOut'
]);

export { ErrorType, Suggest, AutoPrefixs };

/**
 * Process and returns useful directions related to the error
 * @param {any} err
 * @param {Call|Call[]} callx
 * @returns
 */
export async function processError(err, callx = null) {
    //
    const code = err.error?.data?.code ?? err.error?.code ?? 0;
    /** @type {string} */
    let reason = (err.error?.date?.message ?? err.reason ?? '').replace(/\u0000|\x00/g, '');
    let reason_parts = reason.split(/:|,|;/).map(e => e.trim());
    if (reason_parts[0] == 'execution reverted') {
        reason_parts.shift(0);
    }
    //const stack = JSON.parse(err.error?.stack ?? '{}');
    //debug(stack);
    /** @type {string[]} */
    const stack = [];
    let error = ErrorType.UNKNOWN;
    let suggest = Suggest.NONE;

    // determine
    let index = -1;
    if (callx && callx.length) {
        index = 0;
        if (AutoPrefixs.includes(reason_parts[0] ?? '')) {
            index = parseInt(reason_parts[1]);
        }
        reason = reason_parts[2] ?? reason_parts[1] ?? reason_parts[0] ?? '.';
        callx = callx[index];
    }

    //
    const at = {
        /** @type {number} */
        step: callx?.step ?? 0,
        /** @type {number=} */
        ...(index != -1) && { call: index },
        /** @type {string} */
        title: callx?.title ?? '',
        /** @type {string} */
        contract: callx?.target ?? null,
        /** @type {string} */
        function: callx?.method ?? '',
    };

    const contains = (spec) => reason_parts.filter(e => e.match(spec, 'i')).length > 0;

    //
    if (err.code == 4001) {
        [error, reason, reason_parts] = [ErrorType.PROVIDER, 'Transaction request canceled.', []];
    } else if (err.method == 'estimateGas') {
        // Request still in preflight
        // Need simulation API to determine stack trace
        suggest = Suggest.REEXEC;
    } else {
    }

    if (contains('liquidity|locked|paused|failed')) {
        error = ErrorType.APP;
    } else if (contains('insufficient|enough|small')) {
        error = ErrorType.SLIPPAGE;
    } else if (contains('transfer|safeerc20|safebep20|allowance|sub-underflow')) {
        error = ErrorType.FUND;
    } else if (true) {
        //
    }

    //
    return {
        /** @type {string} */
        suggest, // action
        /** @type {string} */
        error, // predefined error
        /** @type {number} */
        code, //
        at, // where fault is
        reason, // revert string
        reason_parts, // splitted
        stack // call stack from provider
    };
};

export { debug, serialize, getAddress, invalidAddresses };
