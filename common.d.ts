export type Transaction = any;
/**
 * Contract call holder
 * @param {string} target
 * @param {string} method
 * @param {Array} params
 * @param {number=} eth
 * @param {Object=} descs
 * @param {Check=} check
 * @param {Array=} uinputs
 * @return {Object}
 */
export function Call(target: string, method?: string, params?: any[], eth?: number | undefined, descs?: any | undefined, check?: typeof Check | undefined, uinputs?: any[] | undefined): any;
export const Expecting: Readonly<{
    PASS: number;
    EQUAL: number;
    INCREASE: number;
    DECREASE: number;
    MORETHAN: number;
    FAIL: number;
    NOTEQUAL: number;
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
    FAIL: number;
    NOTEQUAL: number;
}>, value?: string, vtype?: any, last?: any): any;
/**
 * View only call holder
 * @param {string} method
 * @param {Array} params
 * @param {string=} returns
 * @param {number=} index
 * @param {target=} target
 * @return {Object}
 */
export function View(method?: string, params?: any[], returns?: string | undefined, index?: number | undefined, target?: any): any;
export function approve(token?: string, spender?: string, amount?: string, name?: string, checkName?: string): any;
export function transfer(token?: string, to?: string, amount?: string): any;
export function getBalance(account?: string, token?: any): any;
export function allowance(token?: string, owner?: string, spender?: string, name?: string): any;
export function getBalanceEth(account?: string): any;
export function getBalanceView(account?: string, token?: any): any;
