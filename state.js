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
    deprecate: false,
    config: Object.seal({
        debug: true,
        priceAPI: {
            base: 'https://api.coingecko.com/api/v3',
            platform: {
                '1': ['ethereum', 'ethereum'],
                '56': ['binance-smart-chain', 'binancecoin']
            },
            to: 'usd'
        },
        baseAPI: 'https://scoringapi.trava.finance/aggregator_test',
        // allow calls generation to be async
        enableAsync: false,
        optimizeSwaps: false,
        optimizeLPs: true,
        approveMax: true,
        approveMaxValue: '0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff',
        formatHtml: false,
        optimalSplit: false,
        gasPrice: false,
        needNonce: true,
        noautoSkipCalls: true,
        fixCapitalField: true,
        existingLiquidity: false,
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
        },
        fixedGasEthLeft: '1000000000000000',
        findCache: false
    }),
    timeout: Object.seal({
        process: 40,
        execute: 3600,
        network: 20,
        'swaps': 3600,
        'providinglps': 7200
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
        names: {
            '0xfb4392e3431b9cc820362ad2b6a3fda4f8a7712d': 'Automatic Aggregator Contract'
        },
        provider: {},
        def: {},
        user: {},
        ts: {}
    },
    logs: []
});
