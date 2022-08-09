import { Call, Check, Expecting, getBalanceView, View } from '../common.js';
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
            { get(maps, target) {
                // must be null otherwise
                return (target.toLowerCase() == getAddress('token.eth')) ?? null;
            } }
        ],
        delegate: 'transfer',
        tokens: {
            deposit: { get() { return '0x0000000000000000000000000000000000000000' } },
            output: { get(maps) { return maps.target } }
        },
        deposit: new Call(null, '', [], '__amount__', { title: 'Wrap native token' }, new Check(
            getBalanceView('__account__', '__target__'),
            Expecting.INCREASE,
            '__amount__'
        )),
        redeem: new Call(null, 'burn(uint256)', ['__amount__'], '0', { title: 'Unwrap native token', params: ['Amount'] }, new Check(
            getBalanceView('__account__', '__target__'),
            Expecting.DECREASE,
            '__amount__'
        ))
    }
];
