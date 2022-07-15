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
export function process(strategy: Strategy, maps?: {}, merge?: boolean, quick?: boolean): StrategyExecs;
/**
 * Process and returns useful directions related to the error
 * @param {any} err
 * @param {Call|Call[]} callx
 * @returns
 */
export function processError(err: any, callx?: Call | Call[]): Promise<{
    suggest: string;
    error: string;
    code: any;
    at: {
        contract: any;
        function: any;
        call: number;
        step: any;
        title: any;
    };
    reason: any;
    reason_parts: any;
    stack: any[];
}>;
export type Strategy = any;
export type StrategyExecs = any;
export type Call = typeof import("./common.js").Call;
/** @type {boolean} */
export const allowAsync: boolean;
export const Error: Readonly<{
    UNKNOWN: string;
    PROVIDER: string;
    FUND: string;
    SLIPPAGE: string;
}>;
export const Suggest: Readonly<{
    NONE: string;
    REEXEC: string;
    INPUT: string;
    NETWORK: string;
    FREEZE: string;
}>;
