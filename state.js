const env = {};

// default state
export default {
    chainId: env.CHAIN ?? 56,
    maps: {
        account: '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266',
        amount: '1',
        eth: '0',
        nonce: 0
    },
    config: {
        approveMax: true,
        formatHtml: true
    },
    timeout: {
        'network': 20000,
        'swaps': 3600
    },
    slippage: {
        'swaps': 0.005,
        'providinglps': 0.005,
        'borrow': 0.05,
        'lendings': 0.025
    },
    view: {
        options: {
            gasPrice: 1,
            gasLimit: 10000000
        }
    },
    cache: {
        provider: {},
        def: {},
        user: {},
        ts: {}
    }
};
