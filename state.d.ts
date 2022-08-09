declare namespace _default {
    const chainId: any;
    namespace maps {
        const account: string;
        const amount: string;
        const eth: string;
        const nonce: number;
    }
    namespace config {
        const debug: boolean;
        const apiBase: string;
        const allowAsync: boolean;
        const optimizeSwaps: boolean;
        const optimizeLPs: boolean;
        const approveMax: boolean;
        const formatHtml: boolean;
        const optimalSplit: boolean;
        const gasPrice: boolean;
        const needNonce: boolean;
        const autoSkipCalls: boolean;
        const fixCapitalField: boolean;
        namespace maxSlippage {
            const swaps: number;
            const providinglps: number;
            const mintlps: number;
            const borrows: number;
            const lendings: number;
        }
    }
    namespace timeout {
        export const process: number;
        export const execute: number;
        export const network: number;
        const swaps_1: number;
        export { swaps_1 as swaps };
    }
    namespace slippage {
        const swaps_2: number;
        export { swaps_2 as swaps };
        const providinglps_1: number;
        export { providinglps_1 as providinglps };
        const mintlps_1: number;
        export { mintlps_1 as mintlps };
        const borrows_1: number;
        export { borrows_1 as borrows };
        const lendings_1: number;
        export { lendings_1 as lendings };
        export const wraps: number;
    }
    namespace view {
        namespace options {
            const gasPrice_1: number;
            export { gasPrice_1 as gasPrice };
            export const gasLimit: number;
        }
    }
    namespace cache {
        const provider: {};
        const def: {};
        const user: {};
        const ts: {};
    }
    const logs: any[];
}
export default _default;
