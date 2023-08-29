/**
 * Get
 * @param {string} id
 */
export function getStrategy(id: string, amount?: string): Promise<any>;
/**
 * Generate complete execution data based on strategy steps
 * @param {Strategy|string} strategy
 * @param {Object} maps
 * @param {boolean=} noauto
 * @param {boolean=} merge
 * @returns {Promise<StrategyExecs>}
 */
export function process(strategy: Strategy | string, maps?: any, noauto?: boolean | undefined, merge?: boolean | undefined, logs?: boolean): Promise<StrategyExecs>;
/**
 * Allow update to state
 */
export function setState(func?: (state: any) => any): void;
/**
 * Check if automatic execution is available for a strategy
 * @param {Strategy} strategy
 * @returns {Promise<boolean>}
 */
export function autoAvailability(strategy: Strategy): Promise<boolean>;
/**
 * Process and returns useful directions related to the error
 * @param {any} err
 * @param {Call|Call[]} callx
 * @returns
 */
export function processError(
  err: any,
  callx?: Call | Call[]
): Promise<{
  /** @type {string} */
  suggest: string;
  /** @type {string} */
  error: string;
  /** @type {number} */
  code: number;
  at: {
    /** @type {string} */
    title: string;
    /** @type {string} */
    contract: string;
    /** @type {string} */
    function: string;
    call: number;
    /** @type {number} */
    step: number;
  };
  reason: string;
  reason_parts: string[];
  stack: string[];
}>;
/**
 * @typedef {Object} Step
 * @typedef {Object} Call
 * @typedef {Object} View
 * @typedef {Object} Check
 * @typedef {Object} Strategy
 * @typedef {Object} StrategyExecs
 */
export const version: string;
export type Step = any;
export type Call = any;
export type View = any;
export type Check = any;
export type Strategy = any;
export type StrategyExecs = any;
import state from "./state.js";
import config from "./config.js";
export const ErrorType: Readonly<{
  UNKNOWN: string;
  PROVIDER: string;
  FUND: string;
  SLIPPAGE: string;
  APP: string;
}>;
export const Suggest: Readonly<{
  NONE: string;
  REEXEC: string;
  INPUT: string;
  STOP: string;
}>;
export const AutoPrefixs: readonly string[];
import { debug } from "./helpers.js";
import { serialize } from "./helpers.js";
import { getAddress } from "./helpers.js";
import { invalidAddresses } from "./helpers.js";
export { state, config, debug, serialize, getAddress, invalidAddresses };
