export type Transaction = any;
/**
 * Contract call holder
 * @param {string} target
 * @param {string} method
 * @param {Array} params
 * @param {number=} eth
 * @param {Object=} descs
 * @param {Check=} check
 * @param {Array=} inputs
 * @return {Object}
 */
export function Call(target: string, method?: string, params?: any[], eth?: number | undefined, descs?: any | undefined, check?: typeof Check | undefined, inputs?: any[] | undefined): any;
export const Expecting: Readonly<{
    PASS: number;
    EQUAL: number;
    INCREASE: number;
    DECREASE: number;
    MORETHAN: number;
}>;
/**
 * Expectation wrapper
 * @param {View} view
 * @param {Expecting} expecting
 * @param {string} value
 * @param {*} vtype
 * @return {Object}
 */
export function Check(view: typeof View, expecting?: Readonly<{
    PASS: number;
    EQUAL: number;
    INCREASE: number;
    DECREASE: number;
    MORETHAN: number;
}>, value?: string, vtype?: any): any;
/**
 * View only call holder
 * @param {string} method
 * @param {Array} params
 * @param {index=} returns
 * @param {number=} index
 * @param {target=} target
 * @return {Object}
 */
export function View(method?: string, params?: any[], returns?: number | undefined, index?: number | undefined, target?: any): any;
export function approve(token: any, spender: any, amount?: string, name?: string, check?: string): any;
export function transfer(token: any, to: any, amount?: string): any;
export function getBalance(account: any, token: any): any;
export function getBalanceEth(account: any): any;
