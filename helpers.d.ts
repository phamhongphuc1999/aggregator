/**
 * Helper functions
 *
 * @typedef {address} string
 * @typedef {ethers.BigNumber|string} bn
 */
export function contract(address: any, abi?: string): any;
/**
 * Return first valid swap path and expected out amounts
 * @param {address} router
 * @param {address} from
 * @param {address} to
 * @param {bn=} amount
 * @param {boolean=} final
 * @returns [path, amounts]
 */
export function findSwapPath(router: address, from: address, to: address, amount?: bn | undefined, final?: boolean | undefined): any;
export function findSwapPair(router: any, token: any, otoken: any): Promise<any>;
/**
 * find contract definition (onchain)
 * @param {address} target
 * @param {string} type
 * @param {Object} maps
 * @returns
 */
export function findContract(target: address, type?: string, maps?: any): Promise<any>;
/**
 * Helper functions
 */
export type string = address;
/**
 * Helper functions
 */
export type bn = ethers.BigNumber | string;
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
    explorer: {
        api_url: string;
        api_key: string;
    };
};
export function getAddress(name?: string, id?: any): any;
export function getToken(address?: any): any;
/**
 * Return, cache provider and fixes
 * @param {number=} id
 * @returns ethers.providers.Provider
 */
export function getProvider(id?: number | undefined): any;
export function getSigner(id?: number): any;
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
export function cached(get?: Function, type?: prototype, name?: string, expire?: number): Promise<any>;
export function debug(...args: any[]): void;
export function serialize(obj: any): string;
