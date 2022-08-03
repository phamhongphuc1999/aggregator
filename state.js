const env = {};

// default state
export default Object.seal({
    chainId: env.CHAIN ?? 56,
    maps: {
        account: '0xFFfFfFffFFfffFFfFFfFFFFFffFFFffffFfFFFfF',
        amount: '1000',
        eth: '0',
        nonce: 0
    },
    config: {
        // allow calls generation to be async
        apiBase: 'https://scoringapi.trava.finance/aggregator',
        allowAsync: false,
        optimizeSwaps: false,
        optimizeLPs: false,
        approveMax: true,
        formatHtml: true,
        optimalSplit: false,
        gasPrice: false,
        needNonce: true
    },
    timeout: {
        process: 40,
        execute: 3600,
        network: 20,
        swaps: 3600
    },
    slippage: {
        'swaps': 0.005,
        'providinglps': 0.005,
        'mintlps': 0.002,
        'borrows': 0.05,
        'lendings': 0.025,
        'wraps': 0.0
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
    },
    log: {
        start: null,
        entries: [],
        timestamps: []
    }
});
