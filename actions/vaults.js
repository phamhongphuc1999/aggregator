import { Call, Check, View, Expecting, getBalanceView } from '../common.js';

/**
 * Supported vaults
 */
export default [
    {
        title: 'AAVE compatible',
        detect: [
            new View('REWARD_TOKEN()', [], 'address')
        ],
        token: [ new View('STAKED_TOKEN()', [], 'address') ],
        deposit: new Call(null, 'stake(address,uint256)', ['__account__', '__amount__'], '0', { title: 'Deposit token to pool', params: ['Receiver', 'Amount'] }, new Check(
            getBalanceView('__account__', '__token__'),
            Expecting.INCREASE,
            '0'
        ))
    },
    {
        title: 'Olympus compatible',
        detect: [
            new View('OHM()', [], 'address')
        ],
        token: [ new View('gOHM()', [], 'address') ],
        deposit: new Call(null, 'stake(address,uint256,bool,bool)', ['__account__', '__amount__', 'true', 'true'], '0', { title: 'Deposit native to pool', params: ['Receiver', 'Amount', 'Rebasing', 'Claim'] }, new Check(
            getBalanceView('__account__', '__token__'),
            Expecting.INCREASE,
            '0'
        ))
    },
    {
        title: 'Pancake compatible',
        detect: [
            new View('receiptToken()', [], 'address')
        ],
        nodelegate: true,
        token: [ new View('token()', [], 'address') ],
        deposit: new Call(null, 'deposit(uint256)', ['__amount__'], '0', { title: 'Deposit token to pool', params: ['Amount'] }, new Check(
            new View('userInfo(address)', ['__account__'], '(uint256,uint256,uint256,uint256)', 0),
            Expecting.INCREASE,
            '0'
        ))
    },
    {
        title: 'Convex compatible',
        detect: [
            new View('convexPool()', [], 'address')
        ],
        token: [ new View('poolInfo(uint256)', [0], 'address,address,address,address,address,bool', 1) ],
        deposit: new Call(null, 'deposit(uint256,address)', ['__amount__', '__account__'], '0', { title: 'Deposit token to pool', params: ['Amount', 'Receiver'] }, new Check(
            getBalanceView('__account__', '__token__'),
            Expecting.INCREASE,
            '__amount__'
        ))
    },
    {
        title: 'Trava veNFT quirk',
        detect: [
            new View('user_point_history__ts(uint256,uint256)', ['1', '1'], 'uint256')
        ],
        token: [ { get: () => '0x0391be54e72f7e001f6bbc331777710b4f2999ef' } ],
        deposit: new Call(null, 'create_lock(address,uint256,uint256)', ['0x0391be54e72f7e001f6bbc331777710b4f2999ef', '__amount__', '__lock__'], '0', { title: 'Lock token to gain voting power and rewards', params: ['Token', 'Amount', 'Lock duration'] }, new Check(
            getBalanceView('__account__', '__target__'),
            Expecting.INCREASE,
            '1'
        ), {lock: { default: '0', title: 'Lock duration specifier', descs: '0,30,180,365' }}),
    },
    {
        title: 'Curve veNFT compatible',
        detect: [
            new View('user_point_epoch(uint256)', [1], 'uint256')
        ],
        token: [ new View('token()', [], 'address') ],
        deposit: new Call(null, 'create_lock(address,uint256)', ['__amount__', '__lock__'], '0', { title: 'Lock token to gain voting power and rewards', params: ['Amount', 'Lock duration'] }, new Check(
            new View('locked(address)', ['__account__'], 'uint256'),
            Expecting.INCREASE,
            '0'
        ), {lock: { default: '0', title: 'Lock duration specifier', descs: '0,30,180,365' }})
    }
];
