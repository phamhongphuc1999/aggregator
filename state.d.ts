declare namespace _default {
    const chainId: any;
    namespace maps {
        const account: string;
        const amount: string;
        const eth: string;
        const nonce: number;
    }
    namespace timeout {
        const network: number;
        const swaps: number;
    }
    namespace slippage {
        const swaps_1: number;
        export { swaps_1 as swaps };
        export const providinglps: number;
        export const borrow: number;
        export const lendings: number;
    }
    namespace view {
        namespace options {
            const gasPrice: number;
            const gasLimit: number;
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
