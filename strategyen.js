'use strict'

import state from './state.js';
import funcs from './actions/funcs.js';
import actions from './actions/index.js';
import { ts, debug, getAddress, invalidTokens } from './helpers.js';
import { ethers } from 'ethers';

const OA = Object.assign;

/**
 * Get all helper
 * @param {Array} steps
 * @param {string} func
 * @param {number} count
 * @returns
 */
const all = async function (steps, func = 'calls', count = 0) {
    const seq = true;
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
        if (seq) {
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
            ...(call.check?.encode) && {
                check: OA(call.check, {
                    encoded: call.check.encode()
                })
            },
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
 * @typedef {Object} Strategy
 */

/**
 * @typedef {Object} StrategyExecs
 */

/**
 * Generate complete execution data based on strategy steps
 * @param {Strategy} strategy
 * @params {Object} maps
 * @returns {StrategyExecs}
 */
export async function process(strategy, maps = {}) {
    // initialize variables
    OA(state.maps, maps);
    const starttime = Date.now();
    let [auto, ins, outs] = [null, [], []];

    // Generate manual call/params and checks
    const calls = (await Promise.all(
            (await all(strategy.steps))
            .map(call => call.meta())
        ))
        .map(processCall);

    // Generate auto call/params and expectation
    const acalls = (await all(strategy.steps, 'autoCalls'))
        .map((call, i, arr) => OA(call, { ...(arr.length-1 != i) && { check: null } }));

    // Generate necessary Checks
    const autoExpects = async () => {
        return [];
    }

    // encode auto calls for use with aggregator
    if (acalls && acalls.length) {
        const expects = await autoExpects(strategy);
        const eth = (ins.filter((e) => invalidTokens.includes(e[0]))[0] ?? [, '0'])[1];
        auto = {
            calls: acalls,
            expects: expects,
            transfers: [ins, outs],
            call: funcs.aggregate.call.update({
                target: getAddress(),
                calls: acalls.map(call => call.encode()),
                expects: expects.map(check => check.encode()),
                ins,
                outs,
                eth
            })
        };
        try {
            auto.call.tx = auto.call.encode();
        } catch(err) {
            debug(err.message, err.stack, auto.call.method, auto.call.params);
        }
    }

    //
    return {
        id: strategy.id ?? strategy.strategy_id,
        title: strategy.strategy?.name ?? '',
        timestamp: ts(),
        ran: Date.now() - starttime,
        expiry: 300,
        maps: state.maps,
        calls,
        auto
    };
}

//
for (const [name, val] of Object.entries({
    aggregator: getAddress()
})) {
    (!state.maps[name]) && (state.maps[name] = val);
}
