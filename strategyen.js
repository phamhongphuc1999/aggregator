/**
 * Automatic Strategy Encoder
 * For use with data from ScoringAPI of trava.finance (BRicher project)
 *
 *
 *
 *
 */

'use strict';

import state from './state.js';
import config from './config.js';

import * as helpers from './helpers.js';
const { ts, serialize, toBN, debug, str, functions, getAddress, getToken, parseAmount, invalidAddresses, findContract, getProvider, axios } = helpers;
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
    return (await axios({ url: `${state.config.baseAPI}/strategies/${id}?amount=${amount}`, responseType: 'json' })).data;
}

/**
 * Get all helper
 * @param {Object[]} steps
* @param {string} funcname
 * @param {Object} maps
 * @param {number} i
 * @returns
 */
async function allCalls (steps, funcname, maps, process = null) {
    let calls = [];
    // merge calls helper
    const get = async (step, i, get) => {
        const ms = time();
        const id = (step.id ?? step.strategy_id);
        const action = (step.method ?? step.methods[0]);
        const callprops = { action, step: i, ...(i == steps.length) && { lastStep: true } };
        const addprops = { ...step.maps, ...callprops };
        const parentprops = { [funcname]: true };
        //
        return id &&
            action &&
            (get = actions[action][funcname]) &&
            (get = await get(id, OA(maps, addprops))) &&
            debug(funcname, action, (time() - ms) + 'ms') &&
            get.map(call => OA(call, callprops));
    };
    // do it sequential or in parallel
    try {
        if (state.config.enableAsync) {
            calls = (await Promise.all(steps.map(get))).reduce((calls, items) => calls.concat(items), []);
        } else {
            let i = 0;
            for (const step of steps){
                calls = calls.concat(await get(step, i++));
            }
        }
    } catch(err) {
        debug('!all.' + funcname, err.message, err.stack);
    }
    //
    if (process instanceof Function) {
        calls = await process(calls, maps);
    }
    return calls;
};

/**
 * Merge approve calls
 * @param {Promise<Call[]>} calls
 * @returns {Promise<Call[]>}
 */
async function optimizeApproves (calls, maps, method = approve().method) {
    try {
        return (await Promise.all(calls
            .filter(call => call.method === method) //startsWith('approve')
            //
            .filter((call, i, approves) => {
                let found = approves.findIndex(call => call.target == call.target);
                return (found !== -1 && found != i && (found = approves[found].params)) ?
                    (found[1] = found[1].add(call.params[1])) && false :
                    true;
            })
            .map(async call =>
                OA(call, {_allowance: await (call.check?.view ?? allowance(call.target, maps.account, call.params[0])).get()}))
            ))
            //
            .filter(call => {
                if (call._allowance && call._allowance.gte(toBN(call.params[1]))) {
                    //debug('skip', call.method, [call.target, call._allowance]);
                    return false;
                } else if (state.config.approveMax) {
                    call.params[1] = toBN(state.config.approveMaxValue);
                }
                return true;
            })
            .map(call => OA(call, { step: -1, action: 'approve' }))
            //
            .concat(calls.filter(call => call.method !== method));
    } catch (err) {
        debug('!approves', err.message, err.stack);
    }
    //
    return calls;
};

/**
 * Standardize transfers
 * Need a little optimization
 * Can process both custom approve and normal, tx might be address or call
 */
async function processTransfer (maps, tx, i) {
    const res = { token: null, amount: null, custom: false };
    // !input
    if (tx.target) {
        [res.token, res.tx, res.custom] = [tx.target, tx, true];
        res.amount = tx.params[1];
    } else {
        res.input = maps['amount' + i] ?? maps.amount ?? state.maps.amount;
        res.tx = approve(res.token = tx, getAddress());
        res.amount = await parseAmount(res.input, res.token);
    }
    // amount update here
    res.tx = res.tx.update({...maps, amount: res.amount});
    debug(res.custom ? 'approval' : 'capital', res.token, [res.input ?? res.tx.method, res.amount]);
    // native or token
    if (invalidAddresses.includes(res.token)) {
        const balance = await getProvider().getBalance(maps.user);
        if (res.amount.add(state.config.fixedGasEthLeft ?? '0').gte(balance)) {
            throw 'Not enough eth left';
        }
        // send eth along
        res.tx = null, maps.send = res.amount;
    } else {
        // remove call if unnecessary, only for corner cases
        const allowance = await res.tx.check?.view?.get() ?? toBN(0);
        res.tx = allowance.gte(res.amount) ? null : res.tx.get(maps.account, ++maps.nonce ?? null);
    }
    //
    OA(res, await getToken(res.token));
    return res;
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
        auto: null,
        _maps: maps,
        ...(merge == true) && strategy
    };
    // run analysis
    const logstart = state.logs.length;
    const ms = time();
    const from = maps.retry?.realCall ?? maps.retry?.call ?? null;
    const transfers = {ins: [], out: []};
    const steps = strategy.steps ?? [];
    let auto = {};
    let temp;

    // default map values
    const addmaps = {
        ...maps,
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

    // initialize properties for calls/auto maps
    res.maps = { ...state.maps, ...addmaps };
    auto.maps = { ...res.maps, auto: true, account: addmaps.aggregator };

    if (from !== null) {
        //
    }

    // Generate manual call/params and checks
    // Generate auto (aggregated) call/params and expectation
    [res.calls, auto.calls] = await Promise.all([
        (noauto === false && state.config.noautoSkipCalls) ?
            [] :
            allCalls(steps, 'calls', res.maps, optimizeApproves),
        // If no auto is default then auto-check for availability
        noauto || (noauto === null && (noauto = !(await autoAvailability(strategy)))) ? [] : allCalls(steps, 'auto', auto.maps)
    ]);

    // encode auto calls for use with aggregator
    if (auto.calls?.length) {
        if (true){
            // reset to input values
            OA(auto.maps, maps);
        }
        try {
            // only last check is needed, must be a check available
            auto.checks = [
                auto.calls.slice().reverse().find(call => {
                    if (!call) {
                        throw 'auto is broken';
                    }
                    return call.check && call.check.encode;
                }).check
            ];
            // tramsfer ins: from capital property and weth
            if (temp = strategy.strategy?.capital ?? strategy.capital ?? {}) {
                temp = (auto.maps.approve ? [auto.maps.approve] : []).concat(Object.keys(temp));
                transfers.ins = await Promise.all(temp.map(processTransfer.bind(this, auto.maps)));
            }
            // transfer outs, NOT USED anymore, calls already has transfer or equivalent
            if (temp = {}) {
                transfers.outs = Object.keys(temp).map(processTransfer.bind(this, auto.maps));
            }
            //
            auto.calls = auto.calls
                .map((call, i, arr) => OA(call, { ...(arr.length-1 != i) && { check: null } }))
                .map(call => formatCall(call, auto.maps))
            auto.call = (await functions('aggregate')).call.update({
                ...auto.maps,
                target: getAddress(),
                eth: auto.maps.send ?? "0",
                calls: auto.calls.map(call => Object.values(call.tx).slice(0,3)),
                checks: auto.checks.map(check => check.encode()),
                ins: transfers.ins.filter(tf => !tf.custom).map(tf => Object.values(tf).slice(0,2)),
                outs: []
            });
            auto.transfers = transfers;
            auto.call.tx = auto.call.get(auto.maps.account, ++auto.maps.nonce ?? NaN);
            // final
            res.auto = auto;
        } catch (err) {
            debug('!auto', err.message, err.stack);
        }
    }
    //
    if (res.calls?.length) {
        temp = { ...res.maps, ...addmaps };
        res.calls = (await Promise.all(res.calls.map(call => call.meta())))
            .map(call => formatCall(call, temp));
    }
    if (logs) {
        res.logs = state.logs.slice(logstart).map(([time, log]) => time + ': ' + log);
    }

    // final result
    res.ran = time() - ms;
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
    const [steps, logs] = [strategy.steps ?? [], []];
    let avail = true;
    // if works correctly, findContract never throws
    const defs = await Promise.all(steps.map(step => {
        const maps = {...step.maps},
            id = (step.id ?? step.strategy_id),
            action = (step.method ?? step.methods[0]);
        [, maps.target, ...maps.tokens] = id.split('_'), maps.token = maps.tokens[0];
        return (actions[action]?.find) ?
            findContract(maps.target, action, maps) :
            { title: action, delegate: true };
    }));
    // count eligiblity
    const founds = defs.map(def => def);
    if (founds.length !== defs.length) {
        return null;
    }
    const delegates = founds.map(def => def.delegate).filter(e => e);
    avail = delegates.length === defs.length;
    debug('availability', avail, logs, str(defs.map(def => def.title)), delegates);
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

//
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
