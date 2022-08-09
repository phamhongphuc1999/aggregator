import { Call, Check, View, Expecting, getBalanceView } from '../common.js';

let temp;
/**
 * Supported vaults
 */
export default [
    {
        id: '88952b043c344c38aa57c36fb392ccc4',
        title: 'Aave/Trava compatible',
        detect: [
            new View('REWARD_TOKEN()', [], 'address')
        ],
        delegate: true,
        url: 'https://github.com/aave/aave-stake-v2',
        tokens: {
            deposit: new View('STAKED_TOKEN()', [], 'address')
        },
        deposit: new Call(null, 'stake(address,uint256)', ['__account__', '__amount__'], '0', { title: 'Deposit token to pool', params: ['Receiver', 'Amount'], editable: 1 }, new Check(
            getBalanceView('__account__', '__target__'),
            Expecting.INCREASE,
            '__amount__'
        )),
        redeem: new Call(null, 'redeem(address,uint256)', ['__account__', '__amount__'], '0', { title: 'Redeem', params: ['Receiver', 'Amount'] })
    },
    {
        id: '766a9d887b464cd0960b1fc4aab211d3',
        title: 'Olympus compatible',
        detect: [
            new View('OHM()', [], 'address')
        ],
        delegate: true,
        url: 'https://github.com/OlympusDAO/olympus-contracts',
        tokens: {
            deposit: new View('gOHM()', [], 'address')
        },
        deposit: new Call(null, 'stake(address,uint256,bool,bool)', ['__account__', '__amount__', 'true', 'true'], '0', { title: 'Deposit native to pool', params: ['Receiver', 'Amount', 'Rebasing', 'Claim'], editable: 1 }, new Check(
            getBalanceView('__account__', '__deposittoken__'),
            Expecting.INCREASE,
            '0'
        )),
        redeem: new Call(null, 'unstake(address,uint256,bool)', ['__account__', '__amount__', false], '0', { title: 'Unstake', params: ['Receiver', 'Amount', 'Trigger rebasing'] })
    },
    {
        id: 'cd7907a180b14082850be75bac891857',
        title: 'Pancake compatible',
        detect: [
            new View('receiptToken()', [], 'address')
        ],
        delegate: false,
        url: 'https://github.com/pancakeswap/pancake-farm',
        tokens: {
            deposit: new View('token()', [], 'address')
        },
        deposit: new Call(null, 'deposit(uint256)', ['__amount__'], '0', { title: 'Deposit token to pool', params: ['Amount'], editable: 0 }, new Check(
            new View('userInfo(address)', ['__account__'], '(uint256,uint256,uint256,uint256)', 0),
            Expecting.INCREASE,
            '0'
        )),
        redeem: new Call(null, 'withdrawAll()', [], '0', { title: 'Withdraw all' })
    },
    {
        id: '0c36be9a7355486fb1e1350a9ef6b670',
        title: 'Convex compatible',
        detect: [
            new View('convexPool()', [], 'address')
        ],
        delegate: true,
        url: 'https://github.com/convex-eth/platform',
        tokens: {
            deposit: new View('poolInfo(uint256)', ['0'], 'address,address,address,address,address,bool', 1)
        },
        deposit: new Call(null, 'deposit(uint256,address)', ['__amount__', '__account__'], '0', { title: 'Deposit token to pool', params: ['Amount', 'Receiver'], editable: 0 }, new Check(
            getBalanceView('__account__', '__token__'),
            Expecting.INCREASE,
            '__amount__'
        )),
        redeem: new Call(null, 'withdraw(uint256,uint256)', ['0', '__amount__'], '0', { title: 'Withdraw', params: ['PID', 'Amount'] })
    },
    {
        id: '2665ef392a5d4cf2bb7a0b72ff9b43e8',
        title: 'ALPACA vault',
        detect: [
            new View('', [''], '')
        ],
        tokens: {
            deposit: new View('token()', [], 'address'),
            output: { get(maps, target) { return target } }
        },
        delegate: true,
        url: 'https://github.com/alpaca-finance/bsc-alpaca-contract',
        deposit: new Call(null, 'deposit(uint256,uint256,address,uint256,bytes)', [], '0', { title: '', params: ['', '', '', '', '', ''] }, new Check()),
        redeem: new Call(null, 'withdraw(uint256,uint256,uint256,bytes)', [], '0', { title: '', params: [''] }, new Check())
    },
    {
        id: '2665ef392a5d4cf2bb7a0b72ff9b43e8',
        title: 'ALPACA neutral vault',
        detect: [
            new View('valueToShare(uint256)', ['100000000'], 'uint256')
        ],
        delegate: true,
        url: 'https://github.com/alpaca-finance/bsc-alpaca-contract',
        tokens: {
        },
        deposit: new Call(null, 'deposit(uint256,uint256,address,uint256,bytes)', [], '0', { title: '', params: ['', '', '', '', '', ''] }, new Check()),
        redeem: new Call(null, 'withdraw(uint256,uint256,uint256,bytes)', [], '0', { title: '', params: [''] }, new Check())
    },
    {
        id: 'ad9141c23e664dffb7635e5894f34bc0',
        title: 'Curve Governance compatible',
        detect: [
            new View('user_point_epoch(uint256)', [1], 'uint256')
        ],
        delegate: false,
        url: 'https://github.com/curvefi/curve-veBoost',
        tokens: {
            deposit: new View('token()', [], 'address'),
            output: { get(maps) { return maps.target } }
        },
        deposit: new Call(null, 'create_lock(uint256,uint256)', ['__amount__', '__time__'], '0', { title: 'Lock token for voting power and rewards', params: ['Amount', 'Lock duration'], editable: 0 }, new Check(
            new View('locked(address)', ['__account__'], 'uint128,uint256', 0),
            Expecting.INCREASE,
            '__amount__'
        ), { time: { default: '31536000', title: 'Lock duration specifier', descs: 'In seconds: 604800 (a week), 2592000 (a month), 31536000 (a year), 126144000 (4 years)' } }),
        redeem: new Call(null, 'withdraw()', [], '0', { title: 'Withdraw when lock has expired' })
    },
    {
        id: '568623537d124769a4d00190fd7e35c5',
        title: 'Trava Goverance NFT vault',
        detect: [
            new View('user_point_history__ts(uint256,uint256)', ['1', '1'], 'uint256')
        ],
        delegate: true,
        url: 'https://github.com/TravaLendingPool/GovernanceContract',
        tokens: {
            deposit: new View('tokens(uint256)', [0], 'address'),
            output: { get(maps) { return maps.target } },
            reward: new View('rewardToken()', [], 'address')
        },
        deposit: new Call(null, 'create_lock_for(address,uint256,uint256,address)', ['__deposittoken__', '__amount__', '__time__', '__account__'], '0', { title: 'Lock token for voting power and rewards', params: ['Token', 'Amount', 'Lock duration', 'Receiver'], editable: 1 }, new Check(
            getBalanceView('__account__', '__target__'),
            Expecting.INCREASE,
            '1'
        ), { time: { default: '31536000', title: 'Lock duration specifier', descs: 'In seconds: 604800 (a week), 2592000 (a month), 31536000 (a year), 126144000 (4 years)' } }),
        redeem: new Call(null, 'withdraw(uint256)', ['0'], '0', { title: 'Withdraw when lock has expired', params: ['Token ID'] })
    },
    {
        id: '7ab2efe0a8974153a773eef60172c839',
        title: 'ALPACA Governance vault',
        detect: [
            new View('', [], '')
        ],
        delegate: false,
        url: 'https://github.com/alpaca-finance/xALPACA-contract',
        tokens: {
            deposit: new View('token()', [], 'address'),
            output: { get(maps) { return maps.target } }
        },
        deposit: new Call(null, 'createLock(uint256,uint256)', ['__amount__', '__time__'], '0', { title: 'Lock token for voting /power and rewards', params: ['Amount', 'Lock duration'], editable: 0 }, temp=new Check(
            new View('locks(address)', ['__account__'], 'uint256'),
            Expecting.INCREASE,
            '__amount__'
        ), { time: { default: '31536000', title: 'Lock duration specifier', descs: 'In seconds: 604800 (a week), 2592000 (a month), 31536000 (a year), 126144000 (4 years)' } }),
        depositx: new Call(null, 'depositFor(address,uint256)', ['__account__', '__amount__'], '0', { title: 'Increase lock balance without extend time', params: ['Account holder', 'Amount'], editable: 1 }, temp),
        redeem: new Call(null, 'withdraw()', [], '0', { title: 'Withdraw when lock has expired' })
    }
];
