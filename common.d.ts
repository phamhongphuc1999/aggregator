/**
 * Contract call holder
 * @param {string=} target
 * @param {string} method
 * @param {Array} params
 * @param {number} eth
 * @param {Object} descs
 * @param {Check} check
 * @returns class
 */
export function Call(target?: string | undefined, method?: string, params?: any[], eth?: number, descs?: any, check?: Check, inputs?: any): this;
export class Call {
    /**
     * Contract call holder
     * @param {string=} target
     * @param {string} method
     * @param {Array} params
     * @param {number} eth
     * @param {Object} descs
     * @param {Check} check
     * @returns class
     */
    constructor(target?: string | undefined, method?: string, params?: any[], eth?: number, descs?: any, check?: Check, inputs?: any);
    name(): any;
    update(maps?: {}, params?: any): any;
    contract(signer?: ethers.ethers.Wallet): ethers.ethers.Contract;
    /**
     * Get metadata of call/target
     * @returns Call
     */
    meta(): Promise<Call>;
    targetName: any;
    get(from?: any): {
        chainId: string | number;
        from: any;
        to: any;
        data: string;
        value: any;
    };
    encode(): any[];
}
export namespace Expecting {
    const PASS: number;
    const EQUAL: number;
    const INCREASE: number;
    const DECREASE: number;
    const MORETHAN: number;
}
/**
 * Expectation wrapper
 * @param {View} view
 * @param {Expecting} expecting
 * @param {string} value
 * @param {*} vtype
 * @returns class
 */
export function Check(view: View, expecting?: {
    PASS: number;
    EQUAL: number;
    INCREASE: number;
    DECREASE: number;
    MORETHAN: number;
}, value?: string, vtype?: any): this;
export class Check {
    /**
     * Expectation wrapper
     * @param {View} view
     * @param {Expecting} expecting
     * @param {string} value
     * @param {*} vtype
     * @returns class
     */
    constructor(view: View, expecting?: {
        PASS: number;
        EQUAL: number;
        INCREASE: number;
        DECREASE: number;
        MORETHAN: number;
    }, value?: string, vtype?: any);
    update(maps?: {}, value?: any): any;
    /**
     * Evaluate a check/expectation
     * @param {address} target
     * @param {object} maps
     * @returns boolean
     */
    eval(target: any, maps?: object): Promise<boolean>;
    /**
     * Encode to use in aggregated calls
     * @returns array tuple
     */
    encode(): any[];
}
/**
 * View only call holder
 * @param {string} method
 * @param {Array} params
 * @param {index=} returns
 * @param {number=} index
 * @param {target=} target
 * @returns class
 */
export function View(method?: string, params?: any[], returns?: number | undefined, index?: number | undefined, target?: any): this;
export class View {
    /**
     * View only call holder
     * @param {string} method
     * @param {Array} params
     * @param {index=} returns
     * @param {number=} index
     * @param {target=} target
     * @returns class
     */
    constructor(method?: string, params?: any[], returns?: number | undefined, index?: number | undefined, target?: any);
    get: any;
    name(): any;
    update(maps?: {}, index?: any): any;
    contract(address?: any): ethers.ethers.Contract;
    encode(address?: any, maps?: {}): any[];
}
export function approve(token: any, spender: any, amount?: string, name?: string, check?: string): Call;
export function transfer(token: any, to: any, amount?: string): Call;
export function getBalance(account: any, token: any): any;
export function getBalanceEth(account: any): any;
import * as ethers from "ethers";
