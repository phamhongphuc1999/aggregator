declare namespace _default {
    const chainId: any;
    namespace maps {
        const account: string;
        const amount: string;
        const eth: string;
        const nonce: number;
    }
    namespace config {
        const apiBase: string;
        const allowAsync: boolean;
        const optimizeSwaps: boolean;
        const optimizeLPs: boolean;
        const approveMax: boolean;
        const formatHtml: boolean;
        const optimalSplit: boolean;
        const gasPrice: boolean;
        const needNonce: boolean;
    }
    namespace timeout {
        const process: number;
        const network: number;
        const swaps: number;
    }
    namespace slippage {
        const swaps_1: number;
        export { swaps_1 as swaps };
        export const providinglps: number;
        export const mintlps: number;
        export const borrows: number;
        export const lendings: number;
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
}
export default _default;
