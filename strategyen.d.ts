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
export function process(strategy: Strategy, maps?: {}): StrategyExecs;
export type Strategy = any;
export type StrategyExecs = any;
