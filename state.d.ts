declare namespace _default {
  export const chainId: any;
  export namespace maps {
    const account: string;
    const amount: string;
    const eth: string;
    const nonce: number;
  }
  export namespace config {
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
    const noautoSkipCalls: boolean;
    const fixCapitalField: boolean;
    namespace slippage {
      namespace max {
        const swaps: number;
        const providinglps: number;
        const mintlps: number;
        const borrows: number;
        const lendings: number;
      }
      namespace min {
        const swaps_1: number;
        export { swaps_1 as swaps };
        const providinglps_1: number;
        export { providinglps_1 as providinglps };
        const mintlps_1: number;
        export { mintlps_1 as mintlps };
        const borrows_1: number;
        export { borrows_1 as borrows };
        const lendings_1: number;
        export { lendings_1 as lendings };
      }
    }
  }
  export namespace timeout {
    export const process: number;
    export const execute: number;
    export const network: number;
    const swaps_2: number;
    export { swaps_2 as swaps };
  }
  export namespace slippage_1 {
    const swaps_3: number;
    export { swaps_3 as swaps };
    const providinglps_2: number;
    export { providinglps_2 as providinglps };
    const mintlps_2: number;
    export { mintlps_2 as mintlps };
    const borrows_2: number;
    export { borrows_2 as borrows };
    const lendings_2: number;
    export { lendings_2 as lendings };
    export const wraps: number;
  }
  export { slippage_1 as slippage };
  export namespace view {
    namespace options {
      const gasPrice_1: number;
      export { gasPrice_1 as gasPrice };
      export const gasLimit: number;
    }
  }
  export namespace cache {
    const names: {
      "0xfb4392e3431b9cc820362ad2b6a3fda4f8a7712d": string;
    };
    const provider: {};
    const def: {};
    const user: {};
    const ts: {};
  }
  export const logs: any[];
}
export default _default;
