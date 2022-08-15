import { Call, Check, getBalanceView, View } from '../common.js';
//import { getAddress } from '../helpers.js';

/**
 * Supported wraps
 */
//const weth = getAddress('token.eth');
export default [
    {
        id: 'caf71ed0c3de468480c29731a41f98b8',
        title: 'Wrapped ETH',
        detect: [
            { get(maps) {
                // must be null otherwise
                return (maps.target.toLowerCase() == getAddress('token.eth')) ?? null;
            } }
        ],
        delegate: 'transfer',
        url: 'https://github.com/tomochain/dex-smart-contract/blob/master/contracts/utils/WETH.sol',
        tokens: {
            deposit: { get() { return '0x0000000000000000000000000000000000000000' } },
            output: { get: maps => maps.target }
        },
        deposit: new Call(null, '', [], '__amount__', { title: 'Wrap native token' }, new Check(
            getBalanceView('__account__', '__target__'),
            View.INCREASE,
            '__amount__'
        )),
        redeem: new Call(null, 'burn(uint256)', ['__amount__'], '0', { title: 'Unwrap native token', params: ['Amount'] }, new Check(
            getBalanceView('__account__', '__target__'),
            View.DECREASE,
            '__amount__'
        ))
    }
];
