const env = {};

// default state
export default Object.seal({
    chainId: env.CHAIN ?? 56,
    maps: {
        account: '0x68a6c841040B05D60434d81000f523Bf6355b31D',
        amount: '1',
        eth: '0',
        nonce: 0
    },
    deprecate: false,
    config: Object.seal({
        debug: true,
        debugExtra: true,
        enforceAmountValue: null,
        priceAPI: {
            enabled: false,
            base: 'https://api.coingecko.com/api/v3',
            platform: {
                '1': ['ethereum', 'ethereum'],
                '56': ['binance-smart-chain', 'binancecoin']
            },
            to: 'usd'
        },
        baseAPI: 'https://scoringapi.trava.finance/aggregator',
        enableAsync: false,
        optimizeSwaps: false,
        optimizeLPs: true,
        approveMax: true,
        approveMaxValue: '0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff',
        formatHtml: false,
        optimalSplit: false,
        gasPrice: false,
        needNonce: true,
        optimizeApproves: true,
        splitApproves: true,
        removeApproves: false,
        orderedApproves: false,
        noautoSkipCalls: true,
        fixCapitalField: true,
        existingLiquidity: false,
        slippage: {
            max: {
                'swaps': 0.05,
                'providinglps': 0.05,
                //'mintlps': 0.02,
                'borrows': 0.25,
                'lendings': 0.125,
                'autoAdj': 1.0
            },
            min: {
                'swaps': 0.0025,
                'providinglps': 0.0025,
                //'mintlps': 0.001,
                'borrows': 0.025,
                'lendings': 0.0125,
                'autoAdj': 0.0
            }
        },
        fixedGasEthLeft: '500000000000000000',
        gasDefault: '21000',
        gasEstimate: true,
        gasEstimateUSD: true,
        findCache: false,
        autoSlippage: true,
        autoSlippageActions: ['swaps', 'providinglps'],
        autoApproveAdd: 0.0,
        customApproveAdd: 0.002,
        noTransferOuts: false,
        noAutoExpects: true,
        includeBlacklist: true
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
        //'mintlps': 0.002,
        'borrows': 0.05,
        'lendings': 0.025,
        'wraps': 0.0,
        'autoAdj': 0.9
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
        ts: {},
        prices: {
            '0x0000000000000000000000000000000000000000': 280,
            '0xbb4cdb9cbd36b01bd1cbaebf2de08d9173bc095c': 280,
            '0x55d398326f99059ff775485246999027b3197955': 1,
            '0xe9e7cea3dedca5984780bafc599bd69add087d56': 1,
            '0x7083609fce4d1d8dc0c979aab8c869ea2c873402': 7,
            '0x7130d2a12b9bcbfae4f2634d864a1ee1ce3ead9c': 20000,
            '0x0e09fabb73bd3ade0a17ecc321fd13a19e81ce82': 1450,
            '0xcf6bb5389c92bdda8a3747ddb454cb7a64626c63': 4,
            '': 0.1
        }
    },
    logs: []
});
