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
import functions from './actions/functions.js';
import actions from './actions/index.js';
import { approve, allowance } from './common.js';
import { ts, toBN, debug, getAddress, getToken, parseAmount, invalidAddresses, findContract, serialize, getProvider } from './helpers.js';

const OA = Object.assign;

/**
 * @typedef {Object} Call
 * @typedef {Object} View
 * @typedef {Object} Check
 * @typedef {Object} Strategy
 * @typedef {Object} StrategyExecs
 */

/**
 * Get
 * @param {string} id
 */
export async function getStrategy(id) {
    const api_url = state.config.apiBase+'/strategies/'+id;
    return (await axios.get(api_url, { responseType: 'json' })).data;
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
            starttime = Date.now(),
            id = (step.id ?? step.strategy_id),
            action = (step.method ?? step.methods[0]),
            addprops = { action, step: i, ...(i == steps.length) && {lastStep: true} };
        return (id && action && (get = actions[action][func]) && (get = await get(id, OA(maps, addprops))) && debug('get', action, Date.now() - starttime)) ?
            get.map((call) => OA(call, addprops)) :
            [];
    };
    // do it sequential or in parallel
    try {
        if (state.config.allowAsync) {
            calls = (await Promise.all(steps.map(get))).reduce((calls, items) => calls.concat(items), []);
        } else {
            let i = 0;
            for (const step of steps) calls = calls.concat(await get(step, i++));
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
    //debug('format', err.message, err.stack);
};

/**
 * Generate complete execution data based on strategy steps
 * @param {Strategy} strategy
 * @param {Object} maps
 * @param {boolean} noauto
 * @param {boolean} merge
 * @returns {Promise<StrategyExecs>}
 */
export async function process(strategy, maps = {}, noauto = false, merge = true) {
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
    const starttime = Date.now();
    const from = maps.retry?.realCall ?? maps.retry?.call ?? 0;
    const transfers = {ins: [], out: []};
    let temp;


    // default map values
    const addmaps = {
        user: maps.account,
        aggregator: getAddress(),
        ts: ts(),
        ...(maps.nonce === undefined && state.config.needNonce) && { nonce: await getProvider().getTransactionCount(maps.account) }
    };

    // initialize variables
    const _maps = { ...state.maps, ...maps, ...addmaps, auto: true, account: addmaps.aggregator };

    // Generate manual call/params and checks
    // Generate auto (aggregated) call/params and expectation
    [res.calls, res.auto.calls] = await Promise.all([
        optimizeCalls(allCalls(strategy.steps, 'calls', temp={ ...state.maps, ...maps, ...addmaps }), temp),
        noauto ? null : allCalls(strategy.steps, 'auto', _maps)
    ]);

    // encode auto calls for use with aggregator
    if (res.auto.calls && res.auto.calls.length) {
        let eth = '0';
        const target = getAddress();
        //
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
            const processTransfer = async (token, i) => {
                //if(!invalidAddresses.includes(token))
                // need a little optimization
                const input_amount = (_maps.amount ?? [])[i] ?? _maps.amount ?? '1000';
                debug('capital', token, input_amount);
                //
                const amount = await parseAmount(input_amount, token.target ?? token);
                const tx = (token.target) ? token : approve(token, target, amount).update({ account: _maps.account });
                const allowance = await tx.check?.view?.get() ?? toBN(0);
                // send eth along
                (invalidAddresses.includes(token)) && (eth = amount);
                return {
                    token,
                    amount,
                    tx: allowance.gte(amount) ? null : tx.get(_maps.account, ++_maps.nonce ?? null),
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
            res.auto.call = functions.aggregate.call.update({
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

    res.ran = Date.now() - starttime;
    // calls/auto maps
    res.maps = _maps;
    temp = { account: addmaps.user, nonce: addmaps.nonce };
    res.calls = (await Promise.all(res.calls.map(call => call.meta())))
        .map(call => formatCall(call, temp));

    // final result
    return res;
};

/**
 * Check if automatic execution is available for a strategy
 * @param {Strategy} strategy
 * @returns {Promise<boolean>}
 */
export async function autoAvailability(strategy) {
    //const starttime = Date.now();
    let avail = true;
    try {
        const defs = await Promise.all((strategy.steps ?? []).map(step => {
            const id = (step.id ?? step.strategy_id), action = (step.method ?? step.methods[0]);
            const [, target, token] = id.split('_');
            return (actions[action]?.find) ? findContract(target, action, { token }) : { delegate: true };
        }));
        avail = defs.filter((def) => def.delegate).length == defs.length;
    } catch (err) {
        debug('availablity', err.message);
        avail = false;
    }
    return avail;
};

// Error directory
const ErrorType = Object.freeze({
    UNKNOWN: 'unknown', // general failure
    PROVIDER: 'provider', // includes fee
    FUND: 'fund', // missing funds
    SLIPPAGE: 'slippage', // for swaps and borrows
    SLIPPAGE: 'app' // protocol specific faults
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
    } else if (contains('transfer|allowance|sub-underflow')) {
        error = ErrorType.FUND;
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

export { getAddress, invalidAddresses };
