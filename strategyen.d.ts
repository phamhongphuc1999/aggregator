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
export function getStrategy(id: string): Promise<any>;
/**
 * Generate complete execution data based on strategy steps
 * @param {Strategy} strategy
 * @param {Object} maps
 * @param {boolean} noauto
 * @param {boolean} merge
 * @returns
 */
export function process(strategy: Strategy, maps?: any, noauto?: boolean, merge?: boolean): Promise<any>;
/**
 * Check if automatic execution is available for a strategy
 * @param {Strategy} strategy
 * @returns {boolean}
 */
export function autoAvailability(strategy: Strategy): boolean;
/**
 * Process and returns useful directions related to the error
 * @param {any} err
 * @param {Call|Call[]} callx
 * @returns
 */
export function processError(err: any, callx?: Call | Call[]): Promise<{
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
export type Call = any;
export type View = any;
export type Check = any;
export type Strategy = any;
export type StrategyExecs = any;
export const ErrorType: Readonly<{
    UNKNOWN: string;
    PROVIDER: string;
    FUND: string;
    SLIPPAGE: string;
}>;
export const Suggest: Readonly<{
    NONE: string;
    REEXEC: string;
    INPUT: string;
    STOP: string;
}>;
export const AutoPrefixs: readonly string[];
import { getAddress } from "./helpers.js";
import { invalidAddresses } from "./helpers.js";
export { getAddress, invalidAddresses };
