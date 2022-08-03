import * as ethers from 'ethers';
import axios from 'axios';
import state from '../state.js';
import { Call, Check, View, approve, Expecting, getBalanceView } from '../common.js';
import { contract, toBN, getAddress, getDecimals, invalidAddresses, debug } from '../helpers.js';

const toPow = (n) => toBN(10).pow(n);

/**
 * splitted function:
 */
async function aave_available (maps = {}, target, abi = 'lendings.a') {
    debug('available', target, maps.token, maps.amount);
    // should be integrate to some contract
    const con = contract(maps.target, abi);
    try {
        const [ap, [total, debt, liquidity, threshold, ltv, hf], idecimals, decimals] = await Promise.all([con.getAddressesProvider(), con.getUserAccountData(maps.account), getDecimals(maps.itoken), getDecimals(maps.token)]);
        //
        const oracle = con.attach(await Promise.any(this.oracle.map(view => view.get(false, ap))));
        const [idata] = await this.reservedata
            .update({ token: maps.itoken }, 0)
            .get({}, maps.itarget ?? maps.target);
        const iltv = parseInt(idata.toHexString().slice(-4), 16);
        //
        const [iprice, price] = await Promise.all([oracle.getAssetPrice(maps.itoken), oracle.getAssetPrice(maps.token)]);
        //
        const borrowable = toBN(liquidity)
            .mul(ltv).div(1e4)
            .add(
                toBN(maps.amount).mul(iltv).div(1e4).mul(iprice).div(toPow(idecimals))
            ).mul(toPow(decimals)).div(price)
            .mul(parseInt(state.slippage[maps.action] * 1e4)).div(1e4);
        //
        return [liquidity, borrowable];
    } catch (err) {
        debug('aave', maps, err.stack);
    }
    return toBN(0);
};

/**
 * splitted function:
 */
async function comp_available (maps = {}, target, abi = 'lendings.c') {
    debug('available', target, maps.token, maps.amount);
    // target should be correct pool (ctoken)
    const con = contract(maps.target, abi);
    try {
        //debug('--------->', maps.target, target, maps.token);
        let token = invalidAddresses[0];
        try {
            token = await con.underlying();
        } catch(err) {}
        const ctrl =  con.attach(await con.comptroller());
        //const bbr = await con.borrowRatePerBlock();
        const oracle = con.attach(await ctrl.oracle());
        const [{ 1:cfactor }, { 1:liquidity }, price, decimals] = await Promise.all([ctrl.markets(maps.target), ctrl.getAccountLiquidity(maps.account), oracle.getUnderlyingPrice(maps.target), getDecimals(token)]);
        // price: x decimals, liquidity: 18 decimals
        //debug('------------->', maps, price);
        const borrowable = toBN(liquidity)
                .mul(toPow(6)).div(price)
                .mul(toPow(decimals)).div(toPow(18))
                .add(
                    toBN(maps.amount).mul(cfactor).div(toPow(18))
                ).mul(parseInt(state.slippage[maps.action] * 1e4)).div(1e4);
        //
        await ctrl.borrowAllowed(maps.target, maps.user ?? maps.account, borrowable);
        return [liquidity, borrowable];
    } catch (err) {
        debug('comp', maps, err.stack);
    }
    return toBN(0);
};

/**
 * splitted function: compound need special function to determine correct target and interface
 */
async function comp_ref (maps = {}) {
    // find target by our own api
    const token_get_pool = async (api_url, token) => {
        try {
            token = token.toLowerCase();
            let res = (await axios.get(api_url, { responseType: 'json' })).data;
            res = res['lendings'] ?? res;
            res = res['reserves_list'] ?? res;
            res = res[ (token == getAddress('token.eth')) ? invalidAddresses[0] : token ];
            if (res) return res['cToken'] ?? res['vToken'] ?? res;
        } catch (err) {}
        return invalidAddresses[0];
    };
    try {
        if (maps.index > 1) {
            let target;
            // target not a ctoken
            if (ethers.utils.isAddress(maps.target)) {
                const def = {...this};
                //
                if (target = await token_get_pool(this.tokensUrl+maps.target, maps.itoken ?? maps.token)) {
                    const obj = invalidAddresses.concat([getAddress('token.eth')])
                        .includes(maps.token.toLowerCase()) ? this.ether : this;
                    Object.assign(def, {
                        deposit: obj.deposit.update({target}),
                        reddem: obj.redeem.update({target}),
                        target
                    });
                }
                //
                if (target = await token_get_pool(this.tokensUrl+maps.target, maps.otoken ?? maps.token)) {
                    Object.assign(def, {
                        borrow: this.borrow.update({target}),
                        repay: this.repay.update({target}),
                        target
                    });
                }
                return def;
            }
        } else if (maps.index == 1) {
            // target is cether
            return {
                ...this,
                ...this.ether
            };
        }
    } catch(err) {
        //console.error('--------------->', err);
        debug('ref', err.stack);
    }
    // target is normal
    return this;
};

let temp;

/**
 * Supported lendings
 */
export default [
    {
        id: '1984b1cee1c74a5c896cf1f1051dab19',
        title: 'AAVE compatible v2',
        detect: [
            new View('FLASHLOAN_PREMIUM_TOTAL()', [], 'uint256')
        ],
        nodelegate: false,
        url: 'https://github.com/aave/protocol-v2',
        tokens: {
            deposit: temp=new View('getReserveData(address)', ['__token__'], '(uint256),uint128,uint128,uint128,uint128,uint128 stable,uint40,address,address stable,address,address,uint8 id', 7),
            stabledebt: temp.update({}, 8),
            debt: temp.update({}, 9)
        },
        deposit: new Call(null, 'deposit(address,uint256,address,uint16)', ['__token__', '__amount__', '__account__', '0'], '0', { title: 'Deposit asset to pool', params: ['Asset address', 'Asset amount', 'On behalf of', 'Referral code'], editable: 1 }, new Check(
            getBalanceView('__account__', '__token__'),
            Expecting.PASS
        )),
        approve: approve('__debttoken__', '__aggregator__', '__available__', 'approveDelegation', 'borrowAllowance'),
        borrow: new Call(null, 'borrow(address,uint256,uint256,uint16,address)', ['__token__', '__amount__', '1', '0', '__account__'], '__eth__', { title: 'Borrow reserve asset', params: ['Asset address', 'Amount', 'Interest rate mode', 'Referal code', 'On behalf of'], editable: 1 }, new Check(
            getBalanceView('__account__', '__token__'),
            Expecting.PASS
        )),
        redeem: new Call(null, 'withdraw(address,uint256,address)', ['__token__', '__amount', '__account__'], '0', { title: 'Withdraw deposited asset', params: ['Asset address', 'Amount', 'Receiver'], editable: 1 }),
        repay: new Call(null, 'repay(address,uint256,uint256,address)', ['__token__', '__amount', '1', '__account__'], '__eth__', { title: 'Repay borrow', params: ['Asset address', 'Amount', 'Interest rate mode', 'On behalf of'], editable: 1 }, new Check(
            getBalanceView('__account__', '__token__'),
            Expecting.PASS
        )),
        oracle: [
            new View('getPriceOracle()', [], 'address')
        ],
        get redeemable() {
            return new View();
        },
        get available() {
            return {
                reservedata: this.tokens.deposit,
                oracle: this.oracle,
                get: aave_available
            };
        }
    },
    {
        id: 'ccc716b6831346c1a0831df6365a7b51',
        title: 'AAVE compatible v2 (only variable rate, no flashloan)',
        detect: [
            new View('LENDINGPOOL_REVISION()', [], 'uint256')
        ],
        nodelegate: false,
        url: 'https://github.com/geist-finance/geist-protocol',
        tokens: {
            deposit: new View('getReserveData(address)', ['__token__'], '(uint256),uint128,uint128,uint128,uint128,uint40,address,address,address,uint8', 6)
        },
        approve: approve('__debttoken__', '__aggregator__', '__available__', 'approveDelegation', 'borrowAllowance'),
        deposit: new Call(null, 'deposit(address,uint256,address,uint16)', ['__token__', '__amount__', '__account__', '0'], '0', { title: 'Deposit to lending pool', params: ['Asset address', 'Asset amount', 'On behalf of', 'Referral code'], editable: 1 }, new Check(
            getBalanceView('__account__', '__token__'),
            Expecting.PASS
        )),
        borrow: new Call(null, 'borrow(address,uint256,uint16,address)', ['__token__', '__amount__', '0', '__account__'], '0', { title: 'Borrow reserve asset', params: ['Asset address', 'Amount', 'Referal code', 'On behalf of'], editable: 1 }, new Check(
            getBalanceView('__account__', '__token__'),
            Expecting.PASS
        )),
        redeem: new Call(null, 'withdraw(address,uint256,address)', ['__token__', '__amount', '__account__'], '0', { title: 'Withdraw deposited asset', params: ['Asset address', 'Amount', 'Receiver'], editable: 1 }),
        repay: new Call(null, 'repay(address,uint256,address)', ['__token__', '__amount', '1', '__account__'], '0', { title: 'Repay borrow', params: ['Asset address', 'Amount', 'On behalf of'], editable: 1 }, new Check(
            getBalanceView('__account__', '__token__'),
            Expecting.PASS
        )),
        oracle: [
            new View('getPriceOracle()', [], 'address'),
            new View('getPriceOracle(uint256)', [ 1 ], 'address')
        ],
        get redeemable() {
            return new View();
        },
        get available() {
            return {
                reservedata: this.tokens.deposit,
                oracle: this.oracle,
                get: aave_available
            };
        }
    },
    {
        id: 'dd2daefe7b2140a5a1eb7c5b08ff8df8',
        title: 'Compound ERC/ETH compatible',
        detect: [
            new View('underlying()', [], 'address'),
            new View('isCToken()', [], 'address'),
            //new View('compRate()', [], 'uint256'),
            new View('cTokenMetadataAll(address[])', [[]], 'bytes32'),
            new View('vTokenMetadataAll(address[])', [[]], 'bytes32')
        ],
        nodelegate: 'transfer',
        url: 'https://github.com/compound-finance/compound-protocol',
        poolsUrl: state.config.apiBase + '/dev/lending-pools?address=',
        // data provided is flawed, ref() is for both correcting address and interfacing detection
        ref: comp_ref,
        tokens: {
            deposit: new View('underlying()', [], 'address')
        },
        deposit: new Call(null, 'mint(uint256)', ['__amount__'], '0', { title: 'Deposit token to pool', params: ['Amount'], editable: 0 }, new Check(
            new View(),
            Expecting.PASS
        )),
        borrow: new Call(null, 'borrow(uint256)', ['__amount__'], '0', { title: 'Borrow underlying asset', params: ['Amount'], editable: 0 }, new Check(
            new View(),
            Expecting.PASS
        )),
        redeem: new Call(null, 'redeemUnderlying(uint256)', ['__amount__'], '0', { title: 'Redeem underlying assets', params: ['Amount'], editable: 0 }),
        repay: new Call(null, 'repayBorrowBehalf(address,uint256)', ['__account__', '__amount__'], '0', { title: 'Repay borrow on', params: ['For', 'Amount'], editable: 1 }, new Check(
            new View(),
            Expecting.PASS
        )),
        get redeemable() {
            return new View('balanceOfUnderlying(address)', ['__account__'], 'uint256');
        },
        get available() {
            return {
                tokens: this.tokens,
                get: comp_available
            };
        },
        get ether() {
            return {
                tokens: {
                    deposit: { get: () => ethers.constants.AddressZero }
                },
                deposit: new Call(null, 'mint()', [], '__amount__', { title: 'Deposit ETH to pool', params: ['Amount'], editable: 0 }, new Check(
                    new View(),
                    Expecting.PASS
                )),
                redeem: this.redeem,
                repay: new Call(null, 'repayBorrowBehalf(address)', ['__account__'], '__amount__', { title: 'Repay all ETH', params: ['For'], editable: -1 }, new Check(
                    new View(),
                    Expecting.PASS
                ))
            }
        }
    }
];
