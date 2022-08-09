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
    config: Object.seal({
        debug: true,
        apiBase: 'https://scoringapi.trava.finance/aggregator',
        // allow calls generation to be async
        allowAsync: false,
        optimizeSwaps: false,
        optimizeLPs: false,
        approveMax: true,
        formatHtml: true,
        optimalSplit: false,
        gasPrice: false,
        needNonce: true,
        autoSkipCalls: true,
        fixCapitalField: true,
        slippage: {
            max: {
                'swaps': 0.05,
                'providinglps': 0.05,
                'mintlps': 0.02,
                'borrows': 0.25,
                'lendings': 0.125
            },
            min: {
                'swaps': 0.0025,
                'providinglps': 0.0025,
                'mintlps': 0.001,
                'borrows': 0.025,
                'lendings': 0.0125
            }
        }
    }),
    timeout: Object.seal({
        process: 40,
        execute: 3600,
        network: 20,
        swaps: 3600
    }),
    slippage: Object.seal({
        'swaps': 0.005,
        'providinglps': 0.005,
        'mintlps': 0.002,
        'borrows': 0.05,
        'lendings': 0.025,
        'wraps': 0.0
    }),
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
    logs: []
});
