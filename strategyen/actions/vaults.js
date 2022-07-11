import { Call, Check, View } from '../common.js';

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
            new View()
        ))
    },
    {
        title: 'Olympus compatible',
        detect: [
            new View('gOHM()', [], 'address')
        ],
        token: [ new View('OHM()', [], 'address') ],
        deposit: new Call(null, 'stake(address,uint256,bool,bool)', ['__account__', '__amount__', 'true', 'true'], '0', { title: 'Deposit native to pool', params: ['Receiver', 'Amount', 'Rebasing', 'Claim'] }, new Check(
            new View()
        ))
    },
    {
        title: 'Pancake compatible',
        detect: [
            new View('receiptToken()', [], 'address')
        ],
        token: [ new View('token()', [], 'address') ],
        deposit: new Call(null, 'deposit(uint256)', ['__amount__'], '0', { title: 'Deposit token to pool', params: ['Amount'] }, new Check(
            new View()
        ))
    },
    {
        title: 'Convex compatible',
        detect: [
            new View('convexPoolId()', [], 'uint256')
        ],
        token: [ new View('poolInfo(uint256)', [0], 'address,address,address,address,address,bool', 1) ],
        deposit: new Call(null, 'deposit(uint256)', ['__amount__'], '0', { title: 'Deposit token to pool', params: ['Amount'] }, new Check(
            new View()
        ))
    },
    {
        title: 'Trava veNFT quirk',
        detect: [
            new View('user_point_history__ts(uint256,uint256)', ['1', '1'], 'uint256')
        ],
        token: [ new View(() => '0x0391be54e72f7e001f6bbc331777710b4f2999ef') ],
        deposit: new Call(null, 'create_lock(address,uint256,uint256)', ['0x0391be54e72f7e001f6bbc331777710b4f2999ef', '__amount__', '__lock__'], '0', { title: 'Lock token to gain voting power and rewards', params: ['Token', 'Amount', 'Lock duration'] }, {}, {lock: { default: '0', title: 'Lock duration specifier', descs: '0,30,180,365' }}),
    },
    {
        title: 'Curve veNFT compatible',
        detect: [
            new View('user_point_epoch(uint256)', [1], 'uint256')
        ],
        token: [ new View('token()', [], 'address') ],
        deposit: new Call(null, 'create_lock(address,uint256)', ['__amount__', '__lock__'], '0', { title: 'Lock token to gain voting power and rewards', params: ['Amount', 'Lock duration'] }, {}, {lock: { default: '0', title: 'Lock duration specifier', descs: '0,30,180,365' }})
    }
];
