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
const {
	axios,
	debug,
	findContract,
	functions,
	getAddress,
	getPrice,
	getProvider,
	getToken,
	IA,
	invalidAddresses,
	parseAmount,
	sameToken,
	serialize,
	str,
	toBN,
	toPow,
	ts,
} = helpers;
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

export const version =
	config.package.version + (state.config.debug ? '-dbg' : '-rel');

export { state, config, helpers, common };

/**
 * Get
 * @param {string} id
 */
export async function getStrategy(id, amount = state.maps.amount) {
	const ib = 'includeBlacklist';
	return (
		await axios({
			url: `${state.config.baseAPI}/strategies/${id}?amount=${amount}&${
				state.config[ib] ? ib + '=1' : ''
			}`,
			responseType: 'json',
		})
	).data;
}

/**
 * Get all helper
 * @param {Object[]} steps
 * @param {string} funcname
 * @param {Object} maps
 * @param {number} i
 * @returns
 */
async function allCalls(steps, funcname, maps, mutate = (o) => o) {
	let calls = [];
	// merge calls helper
	const get = async (step, i, get) => {
		const ms = time();
		const id = step.id ?? step.strategy_id;
		const action = step.method ?? step.methods[0];
		const callprops = {
			action,
			step: i,
			...(i == steps.length - 1 && { lastStep: true }),
		};
		const props = { ...step.maps, ...callprops };
		const parent = { [funcname]: true };
		//
		return (
			id &&
			action &&
			(get = actions[action][funcname]) &&
			(get = await get(id, OA(maps, props, parent))) &&
			debug(funcname, action, time() - ms + 'ms') &&
			get.map((call) => OA(call, callprops))
		);
	};
	// do it sequential or in parallel
	try {
		if (state.config.enableAsync) {
			// allow calls generation to be async
			calls = (await Promise.all(steps.map(get))).reduce(
				(calls, items) => calls.concat(items),
				[]
			);
		} else {
			let i = 0;
			for (const step of steps) {
				calls = calls.concat(await get(step, i++));
			}
		}
	} catch (err) {
		debug('!all.' + funcname, err.message ?? err, err.stack);
	}
	//
	if (mutate) {
		calls = await mutate(calls, maps);
	}
	return calls;
}

/**
 * Merge approve calls
 * @param {Promise<Call[]>} calls
 * @returns {Promise<Call[]>}
 */
async function optimizeApproves(
	calls,
	maps = {},
	methods = [approve().method]
) {
	if (state.config.optimizeApproves) {
		try {
			return (
				(
					await Promise.all(
						calls
							//
							.filter((call) => methods.includes(call.method)) //startsWith('approve')
							.filter((call, i, approves) => {
								let found = approves.findIndex(
									(e) => e.target == call.target
								);
								let index;
								// if approve already existed
								return found !== -1 &&
									found != i &&
									(found = approves[found].params) &&
									(index = 1)
									? (found[index] = found[index].add(
											call.params[1]
									  )) && false
									: true;
							})
							.map(async (call) =>
								OA(call, {
									_allowance: await (
										call.check?.view ??
										allowance(
											call.target,
											maps.account,
											call.params[0]
										)
									).get(),
								})
							)
					)
				)
					//
					.filter((call) => {
						if (
							call._allowance &&
							call._allowance.gte(toBN(call.params[1]))
						) {
							if (state.config.removeApproves) {
								debug(
									'remove',
									call.method,
									str([call.target, call._allowance])
								);
								return false;
							} else {
								(call.tx = null), (call.check = null);
							}
						} else if (state.config.approveMax) {
							// max value will not be set if approve is not needed
							const index = 1;
							call.params[index] = toBN(
								state.config.approveMaxValue
							);
						}
						return true;
					})
					//
					.sort((call) =>
						!state.config.orderedApproves && call.tx === null
							? -1
							: 0
					)
					.map((call) => OA(call, { step: -1, action: 'approve' }))
					.concat(
						calls.filter((call) => !methods.includes(call.method))
					)
			);
		} catch (err) {
			debug('!approves', err.message, err.stack);
		}
	}
	//
	return calls;
}

/**
 * Standardize transfers
 * Need a little optimization
 * Can process both custom approve and normal, tx might be address or call
 */
async function processTransfer(maps, tx, i) {
	const res = { token: null, amount: null, custom: false };
	// ! input
	if (tx.target) {
		[res.token, res.tx, res.custom] = [tx.target, tx, true];
		res.amount = tx.params[1];
	} else {
		res.input = maps['amount' + i] ?? maps.amount ?? state.maps.amount;
		res.tx = approve((res.token = tx), getAddress());
		res.amount = await parseAmount(res.input, res.token);
	}
	// amount update here
	res.tx = res.tx.update({ ...maps, amount: res.amount });
	debug(
		res.custom ? 'approval' : 'capital',
		res.token,
		str([res.input ?? res.tx.method, res.amount])
	);
	// native or token
	if (invalidAddresses.includes(res.token)) {
		if (
			res.amount
				.add(state.config.fixedGasEthLeft ?? '0')
				.gte((maps.balance = await getProvider().getBalance(maps.user)))
		) {
			throw new Error('fund: ' + 'not enough eth left');
		}
		// send eth along
		(res.tx = null), (maps.send = res.amount);
	} else {
		// remove call if unnecessary, only for corner cases
		const allowance = (await res.tx.check?.view?.get()) ?? toBN(0);
		res.tx = allowance.gte(res.amount)
			? null
			: res.tx.get(maps.account, ++maps.nonce ?? null);
	}
	//
	OA(res, await getToken(res.token));
	return res;
}

/**
 * Format single call
 * @param {Call} call
 * @param {Object} maps
 * @returns {Call}
 */
function formatCall(call, maps) {
	const formatParam = (val) => {
		return '' + val;
	};
	//
	return OA(call, {
		//...(call.check?.encode) && { check: OA(call.check, { encoded: call.check.encode() }) },
		title: call.descs.title ?? '',
		params: call.params.map((value, i) => ({
			value,
			display: call.descs?.values?.[i] ?? formatParam(value) ?? value,
			comment: call.descs?.params?.[i] ?? '',
			...(call.descs?.editable == i && { _value: value, editable: true }),
		})),
		...(call.tx !== null && {
			tx: call.get(maps.auto ? null : maps.account, ++maps.nonce),
		}),
		descs: undefined,
	});
}

/**
 * sum of average gas for each call
 * @param {Call[]} calls
 * @returns {object} gas
 */
async function sumGas(calls = []) {
	const gas = {};
	// gas might update in meta or remove in format
	if (state.config.gasEstimate && calls?.length) {
		debug(
			'gas',
			str(calls.map((call) => call.method + ' ' + call.descs?.gas))
		);
		gas.value = calls.reduce(
			(num, call) => num.add(call.descs?.gas ?? state.config.gasDefault),
			toBN(0)
		);
		gas.cost = gas.value.mul(
			(sumGas.g = sumGas.g ?? (await getProvider().getGasPrice()))
		);
		state.config.gasEstimateUSD &&
			(gas.usd =
				gas.cost
					.mul(
						(sumGas.p =
							sumGas.p ??
							(await getPrice(invalidAddresses[0], true)))
					)
					.div(toPow(18)) / 1e8);
	}
	//
	return gas;
}

/**
 * Generate complete execution data based on strategy steps
 * @param {Strategy|string} strategy
 * @param {Object} maps
 * @param {boolean=} noauto
 * @param {boolean=} merge
 * @returns {Promise<StrategyExecs>}
 */
export async function process(
	strategy,
	maps = {},
	noauto = null,
	merge = true,
	logs = false
) {
	typeof strategy === 'string' &&
		(strategy = await getStrategy(strategy, maps.amount));
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
		...(merge == true && strategy),
	};
	// run analysis
	const logslen = state.logs.length;
	const ms = time();
	const transfers = { ins: [], outs: [] };
	const capitals = strategy.strategy?.capital ?? strategy.capital ?? {};
	const steps = strategy.steps ?? [];
	const auto = {};

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
		...(maps.nonce === undefined &&
			state.config.needNonce && {
				nonce: await getProvider().getTransactionCount(maps.account),
			}),
	};

	if ((!maps.amount || maps.amount == 0) && !maps.amounts?.[0]) {
		debug('!process', 'zero amount');
		return res;
	}

	// initialize properties for calls/auto maps
	res.maps = { ...state.maps, ...addmaps };
	auto.maps = { ...res.maps, auto: true, account: addmaps.aggregator };

	if (maps.retry) {
		// not work yet
		const from = maps.retry?.realCall ?? maps.retry?.call ?? null;
	}

	// test:1
	if (maps.test?.swapFrom) {
		// also handled by inner functions
		debug('SWAPFROM:', maps.test.swapFrom);
		const from = (
			IA(maps.test.swapFrom)
				? maps.test.swapFrom
				: getAddress('token.usd')[0]
		).toLowerCase();
		const to = Object.keys(capitals)[0];
		if (from != to) {
			steps.unshift({
				id: `_${getAddress('swaps.router')}_${from}_${to}`,
				maps: {},
			});
		}
	}

	// Generate manual call/params and checks
	// Generate auto (aggregated) call/params and expectation
	[res.calls, auto.calls] = await Promise.all([
		noauto === false && state.config.noautoSkipCalls
			? []
			: allCalls(steps, 'calls', res.maps, optimizeApproves),
		// If no auto is default then auto-check for availability
		noauto ||
		(noauto === null && (noauto = !(await autoAvailability(strategy))))
			? []
			: allCalls(steps, 'auto', auto.maps),
	]);

	// encode auto calls for use with aggregator
	if (auto.calls?.length) {
		// test:2
		const toCalls = (views) =>
			views.map(
				(view) =>
					(view = common.update(view, auto.maps)) &&
					new common.Call(view[0], view[1], view[2])
			);
		maps.test?.preViews?.length &&
			debug('PREEPEND:', []) &&
			[].unshift.apply(auto.calls, toCalls(maps.test.preViews));
		maps.test?.addViews?.length &&
			debug('APPEND:', []) &&
			[].push.apply(auto.calls, toCalls(maps.test.addViews));
		//
		if (true) {
			// reset to input values
			OA(auto.maps, maps);
		}
		try {
			// only last check is needed, must be a check available
			//debug('acalls', str(auto.calls.map(call => call?.method ?? call)));
			auto.checks = [
				auto.calls
					.slice()
					.reverse()
					.find((call) => {
						if (!call) {
							throw new Error('auto is broken');
						}
						return call.check && call.check.encode;
					}).check,
			];
			// tramsfer ins: from capital property and weth
			if (capitals) {
				transfers.ins = await Promise.all(
					(auto.maps.approves?.length ? auto.maps.approves : [])
						.concat(Object.keys(capitals))
						.map(processTransfer.bind(this, auto.maps))
				);
				state.config.autoApproveOrder &&
					transfers.ins.sort((a) => (a.tx === null ? -1 : 0));
				delete auto.maps.approves;
			}
			// transfer outs, NOT USED anymore, calls already has transfer or equivalent
			const hasOuts =
				!state.config.noTransferOuts && auto.maps.outs?.length;
			if (hasOuts) {
				//transfers.outs = Object.keys(maps.outs).map(processTransfer.bind(this, auto.maps));
			}
			//
			auto.maps.nonce = null;
			//
			auto.gas = await sumGas(auto.calls);
			auto.calls = auto.calls
				.map((call, i, arr) =>
					OA(call, { ...(arr.length - 1 != i && { check: null }) })
				)
				.map((call) => formatCall(call, auto.maps));
			auto.call = (await functions('aggregate')).call.update({
				...auto.maps,
				target: getAddress(),
				eth: auto.maps.send ?? '0',
				calls: auto.calls.map((call) =>
					Object.values(call.tx).slice(0, 3)
				),
				expects: state.config.noAutoExpects
					? []
					: auto.checks.map((check) => check.encode()),
				ins: transfers.ins
					.filter((tf) => !tf.custom)
					.map((tf) => Object.values(tf).slice(0, 2)),
				outs: hasOuts
					? auto.maps.outs
							.map((out) => out[0])
							.filter((token) => IA(token))
							.filter((token, i, arr) => arr.indexOf(token) === i)
					: [],
			});
			debug('outs', str(auto.maps.outs));
			//
			auto.transfers = transfers;
			auto.call.tx = auto.call.get(
				auto.maps.account,
				++auto.maps.nonce ?? NaN
			);
			// final
			res.auto = auto;
		} catch (err) {
			debug('!auto', err.message ?? err, err.stack);
		}
	}
	// final calls
	if (res.calls?.length) {
		const _maps = { ...res.maps, ...addmaps };
		//
		try {
			res.gas = await sumGas(res.calls);
			res.calls = (
				await Promise.all(res.calls.map((call) => call.meta()))
			).map((call) => formatCall(call, _maps));
		} catch (err) {
			debug('!misc:', err.message);
		}
	}
	if (logs) {
		res.logs = state.logs
			.slice(logslen)
			.map(([time, log]) => time + ': ' + log);
	}

	// final result
	res.ran = (time() - ms) / 1000;
	return res;
}

/**
 * Allow update to state
 */
export function setState(func = (state) => state) {
	OA(state, func(state));
}

/**
 * Check if automatic execution is available for a strategy
 * @param {Strategy} strategy
 * @returns {Promise<boolean>}
 */
export async function autoAvailability(strategy) {
	typeof strategy === 'string' && (strategy = await getStrategy(strategy));
	//const ms = time();
	const [steps, logs] = [strategy.steps ?? [], []];
	let avail = true;
	// if works correctly, findContract never throws
	const defs = await Promise.all(
		steps.map((step) => {
			const maps = { ...step.maps },
				id = step.id ?? step.strategy_id,
				action = step.method ?? step.methods[0];
			([, maps.target, ...maps.tokens] = id.split('_')),
				(maps.token = maps.tokens[0]);
			return actions[action]?.find
				? findContract(maps.target, action, maps)
				: { title: action, delegate: true };
		})
	);
	// count eligiblity
	const founds = defs.map((def) => def);
	if (founds.length !== defs.length) {
		return null;
	}
	const delegates = founds.map((def) => def && def.delegate).filter((e) => e);
	//debug('finds', steps.length, founds.length, delegates.length, defs.length);
	avail = delegates.length === defs.length;
	debug(
		'availability',
		avail,
		logs,
		str(defs.map((def) => def?.title)),
		delegates
	);
	return avail;
}

// Error directory
const ErrorType = Object.freeze({
	UNKNOWN: 'unknown', // general failure
	PROVIDER: 'provider', // includes fee
	FUND: 'fund', // missing funds
	SLIPPAGE: 'slippage', // for swaps and borrows
	APP: 'app', // protocol specific faults
});

// Suggested actions dictionary
const Suggest = Object.freeze({
	NONE: 'none', // no action suggested or 'wait', please wait and alter network condition
	REEXEC: 'reexec', // call process() and re-do
	INPUT: 'input', // alter some inputs
	STOP: 'stop', // stop execution
});

// Error prefixs
const AutoPrefixs = Object.freeze([
	'Aggregate',
	'Expect',
	'TransferIn',
	'TransferOut',
	//'View'
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
	let reason = (err.error?.date?.message ?? err.reason ?? '').replace(
		/\u0000|\x00/g,
		''
	);
	let reason_parts = reason.split(/:|,|;/).map((e) => e.trim());
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
		...(index != -1 && { call: index }),
		/** @type {string} */
		title: callx?.title ?? '',
		/** @type {string} */
		contract: callx?.target ?? null,
		/** @type {string} */
		function: callx?.method ?? '',
	};

	const contains = (spec) =>
		reason_parts.filter((e) => e.match(spec, 'i')).length > 0;

	//
	if (err.code == 4001) {
		[error, reason, reason_parts] = [
			ErrorType.PROVIDER,
			'Transaction request canceled.',
			[],
		];
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
	} else if (
		contains('transfer|safeerc20|safebep20|allowance|sub-underflow')
	) {
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
		stack, // call stack from provider
	};
}

export { debug, serialize, getAddress, invalidAddresses };
