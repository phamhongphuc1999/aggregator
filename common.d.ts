/**
 * Contract call holder
 * @param {*} target
 * @param {*} method
 * @param {*} params
 * @param {*} eth
 * @param {*} descs
 * @param {*} check
 * @returns class
 */
export function Call(target: any, method?: any, params?: any, eth?: any, descs?: any, check?: any, inputs?: any): this & {
    target: any;
    method: any;
    params: any;
    eth: any;
    descs: any;
    check: any;
    inputs: any;
    targetName: string;
    fee: string;
};
export class Call {
    /**
     * Contract call holder
     * @param {*} target
     * @param {*} method
     * @param {*} params
     * @param {*} eth
     * @param {*} descs
     * @param {*} check
     * @returns class
     */
    constructor(target: any, method?: any, params?: any, eth?: any, descs?: any, check?: any, inputs?: any);
    name(): any;
    update(maps?: {}, params?: any): any;
    contract(signer?: any): any;
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
        data: any;
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
 * @param {*} view
 * @param {*} expecting
 * @param {*} value
 * @param {*} vpos
 * @param {*} vtype
 * @returns class
 */
export function Check(view: any, expecting?: any, value?: any, vtype?: any): this & {
    view: any;
    expecting: any;
    value: any;
    vtype: any;
};
export class Check {
    /**
     * Expectation wrapper
     * @param {*} view
     * @param {*} expecting
     * @param {*} value
     * @param {*} vpos
     * @param {*} vtype
     * @returns class
     */
    constructor(view: any, expecting?: any, value?: any, vtype?: any);
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
 * @param {*} method
 * @param {*} params
 * @param {*} returns
 * @param {*} index
 * @returns class
 */
export function View(method?: any, params?: any, returns?: any, index?: any, target?: any): this & {
    method: any;
    params: any;
    returns: any;
    index: any;
    target: any;
};
export class View {
    /**
     * View only call holder
     * @param {*} method
     * @param {*} params
     * @param {*} returns
     * @param {*} index
     * @returns class
     */
    constructor(method?: any, params?: any, returns?: any, index?: any, target?: any);
    get: any;
    name(): any;
    update(maps?: {}, index?: any): any;
    contract(address?: any): any;
    encode(address?: any, maps?: {}): any[];
}
export function approve(token: any, spender: any, amount?: string, name?: string, check?: string): Call;
export function transfer(token: any, to: any, amount?: string): Call;
export function getBalance(account: any, token: any): any;
export function getBalanceEth(account: any): any;
