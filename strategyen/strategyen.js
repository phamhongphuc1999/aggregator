'use strict'

import state from './state.js';
import funcs from './actions/funcs.js';
import actions from './actions/index.js';
import { ts, debug, getAddress, invalidTokens } from './helpers.js';
import { ethers } from 'ethers';

/**
 *
 * @param {Object} steps
 * @param {string} func
 * @param {number} count
 * @returns
 */
const all = async function (steps, func = 'calls', count = 0) {
    const seq = false;
    //
    const get = async (info) => {
        const id = (info.id ?? info.strategy_id), action = (info.method ?? info.methods[0]),
            get = actions[action][func],
            step = count++;
        //.map((call, i, arr) => Object.assign(call, { ...((arr.length-1) != i) && { check: null } })
        return (id && action && get) ? (await get(id, state.maps)).map(
            (call) => Object.assign(call, { step, action })
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
 * format
 * @param {*} call
 * @param {*} call
 * @returns
 */
const formatParam = (param, call) => {
    if (ethers.utils.isAddress(param)) {
        return param.slice(0,8)+'...'+param.slice(-6);
    } else if (false) {

    }
    return call
};


/**
 *
 * @param {Call} call
 * @returns Call
 */
const processCall = (call) => {
    Object.assign(call,
        {
            ...(call.check?.encode) && {
                check: Object.assign(call.check, {
                    encoded: call.check.encode()
                })
            },
            tx: {
                ...call.encode(state.maps.account),
                ...(!isNaN(state.maps.nonce)) && { nonce: state.maps.nonce++ }
            },
            title: call.descs?.title ?? '',
            params: call.params.map((param, i) => ({
                value: param,
                display: param,
                comment: call.descs?.params[i]
            })),
            descs: ''
        }
    );
    return call;
};

/**
 * Generate complete execution data based on strategy steps
 * @param {*} strategy
 * @returns {*} calls
 */
export async function process(strategy, maps = {}) {
    // initialize variables
    Object.assign(state.maps, maps);
    const starttime = Date.now();
    let [auto, ins, outs] = [null, [], []];

    // Generate manual call/params and checks
    const calls = await Promise.all(
        (await all(strategy.steps))
        .map(processCall)
        .map(call => call.meta())
    );

    // Generate auto call/params and expectation
    const acalls = await all(strategy.steps, 'autoCalls');

    // Generate necessary Checks
    const autoExpects = async () => {
        return [];
    }

    // encode auto calls for use with aggregator
    if (acalls && acalls.length) {
        const expects = await autoExpects(strategy);
        const eth = (ins.filter((e) => invalidTokens.includes(e[0]))[0] ?? [, '0'])[1];
        const call = funcs.aggregate.call.update({
            target: getAddress(),
            calls: acalls.map(call => call.encode()),
            expects: expects.map(check => check.encode()),
            ins,
            outs,
            eth
        });
        auto = {
            calls: acalls,
            expects: expects,
            transfers: [ins, outs],
            call: Object.assign(call, { tx: call.encode() })
        };
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
