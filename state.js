import { env } from 'process';

// default state
export default {
    chainId: env.CHAIN ?? 56,
    maps: {
        account: '0xFFfFfFffFFfffFFfFFfFFFFFffFFFffffFfFFFfF',
        amount: '1',
        eth: '0',
        nonce: 0
    },
    timeout: {
        'network': 20000,
        'swaps': 3600
    },
    slippage: {
        'swaps': 0.003,
        'providinglps': 0.006,
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
