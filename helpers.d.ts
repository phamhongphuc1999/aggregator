/**
 * Helper functions
 *
 * @typedef {address} string
 * @typedef {ethers.BigNumber|string} bn
 */
export function contract(address: any, abi?: string): any;
export function functions(name: any): Promise<any>;
/**
 * Return first valid swap path and expected out amounts
 * @param {address} router
 * @param {address} from
 * @param {address} to
 * @param {bn=} amount
 * @param {boolean=} final
 * @returns [path, amounts]
 */
export function findSwapPath(router: any, from: any, to: any, amount?: bn | undefined, final?: boolean | undefined): any;
export function findSwapPair(router: any, token: any, otoken: any): Promise<any>;
export function findPairInfo(pair: any): Promise<[[any, any], any]>;
/**
 * find contract definition (onchain)
 * @param {address} target
 * @param {string} action
 * @param {Object} maps
 * @returns {Object}
 */
export function findContract(target: any, action?: string, maps?: any): any;
/**
 * Helper functions
 */
export type string = any;
/**
 * Helper functions
 */
export type bn = any;
export function ts(): number;
export const invalidAddresses: any[];
export const toBN: any;
export const isBN: any;
export function parseAmount(amount: any, token?: any): Promise<any>;
export function getDecimals(token: any): any;
export function getABI(name: any): any;
export function getChain(id?: any): {
    name: string;
    chainId: number;
    shortName: string;
    networkId: number;
    nativeCurrency: {
        name: string;
        symbol: string;
        decimals: number;
    };
    rpc: string[];
    faucets: string[];
    infoURL: string;
    archive?: undefined;
    avgBlockTime?: undefined;
    explorer?: undefined;
} | {
    name: string;
    chainId: number;
    shortName: string;
    networkId: number;
    nativeCurrency: {
        name: string;
        symbol: string;
        decimals: number;
    };
    rpc: string[];
    faucets: string[];
    infoURL: string;
    archive: string[];
    avgBlockTime: number;
    explorer: {
        url: string;
        api_url: string;
        api_key: string;
    };
};
export function getAddress(name?: string, id?: any): any;
export function getToken(address?: any, id?: any): any;
/**
 * Return, cache provider and fixes
 * @param {number=} id
 * @returns {ethers.providers.Provider}
 */
export function getProvider(id?: number | undefined): any;
/**
 * Get signer
 * @param {number|string} id
 * @returns {ethers.Wallet}
 */
export function getSigner(id?: number | string): any;
/**
 * Get transaction simulation/backtracing API instance
 * @param {Object} maps
 * @param {number} id
 */
export function getScanApi(maps?: any, id?: number): any;
export namespace types {
    const bignumber: any;
}
/**
 * Simple object cache
 * @param {Function} get
 * @param {prototype} type
 * @param {string} name
 * @param {number} expire
 * @returns
 */
export function cached(get?: Function, type?: any, name?: string, expire?: number): Promise<any>;
export function debug(...args: any[]): IArguments;
export function ran(get?: () => any): Promise<any>;
export function serialize(obj: any): string;
