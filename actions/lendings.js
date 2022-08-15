import * as ethers from 'ethers';
import state from '../state.js';
import { Call, Check, View, approve, getBalanceView } from '../common.js';
import { contract, toBN, getAddress, getDecimals, invalidAddresses, debug } from '../helpers.js';

const OA = Object.assign;
const A0 = invalidAddresses[0];
const toPow = (n) => toBN(10).pow(n);
const BASE18 = toPow(18);
const str = (arr) => '[' + arr.map(e => e.toString()).join(', ') + ']';

/**
 * splitted function:
 */
async function aave_available (maps = {}, abi = 'lendings.a') {
    // https://github.com/aave/aave-js
    // could be integrate to some contract
    const res = new Array(3);
    const con = contract(maps.target, abi);
    try {
        //[maps.itoken, maps.otoken] = ;
        const [[totalliquidity, totaldebt, totalborrowable, threshold, totalltv, healthfactor], [idata, ], addressprovider, idecimals, odecimals] = await Promise.all([
            con.getUserAccountData(maps.account),
            this.reservedata.update({ token: maps.itoken }, 0).get({}, maps.itarget ?? maps.target),
            con.getAddressesProvider(),
            getDecimals(maps.itoken),
            getDecimals(maps.otoken)
        ]);
        // for variations
        const oracle = con.attach(maps.oracle = await Promise.any(this.oracle.map(view => view.get(false, addressprovider))));
        const [iprice, oprice] = await Promise.all([oracle.getAssetPrice(maps.itoken), oracle.getAssetPrice(maps.otoken)]);
        // https://docs.aave.com/developers/v/2.0/the-core-protocol/protocol-data-provider
        const iltv = parseInt(idata.toHexString().slice(-4), 16);
        //
        maps.liquidity = res[0] = toBN(state.config.existingLiquidity ? totalliquidity.mul(totalltv).div(1e4) : 0)
            .add(
                toBN(maps.amount)
                .mul(iprice).div(toPow(idecimals)
                .mul(iltv).div(1e4)
            ));
        maps.maxborrowable = res[2] = maps.liquidity
            .mul(toPow(odecimals)).div(oprice);
        maps.borrowable = res[1] = maps.maxborrowable
            .mul(parseInt(state.slippage[maps.action] * 1e4)).div(1e4);
        debug('available', maps.target, [maps.itoken, maps.otoken], str([iprice, oprice]), str([maps.amount, maps.liquidity, maps.maxborrowable]));
    } catch (err) {
        debug('aave', maps, err.stack);
    }
    // should halt
    return res;
};

/**
 * splitted function:
 */
async function comp_available (maps = {}, abi = 'lendings.c') {
    // https://github.com/compound-developers/compound-borrow-examples
    // deprecated
    !state.deprecate && ([maps.itarget, maps.otarget] = [ maps.itarget ?? maps.targets[0] ?? maps.target ?? A0, maps.otarget ?? maps.targets[1] ?? maps.target ?? A0]);
    // target should be a pool to borrow from
    const res = new Array(3);
    const con = contract(maps.otarget, abi);
    try {
        // check eth pool
        //[maps.itoken, maps.otoken] = await Promise.all([maps.itarget, maps.otarget].map(target => con.attach(target).underlying()));
        const comp = con.attach(maps.comp = await con.comptroller());
        //const bbr = await con.borrowRatePerBlock();
        const oracle = con.attach(maps.oracle = await comp.oracle());
        const [{ 1:icollateralfactor }, { 1:totalliquidity }, iprice, oprice, idecimals, odecimals] = await Promise.all([comp.markets(maps.itarget), comp.getAccountLiquidity(maps.account), oracle.getUnderlyingPrice(maps.itarget), oracle.getUnderlyingPrice(maps.otarget), getDecimals(maps.itoken), getDecimals(maps.otoken)]);
        // price: x decimals, liquidity: always 18 decimals and in USD
        maps.liquidity = res[0] = toBN(state.config.existingLiquidity ? totalliquidity : 0)
            .add(
                toBN(maps.amount)
                .mul(toPow(idecimals)).div(BASE18)
                .mul(iprice).div(BASE18)
                .mul(icollateralfactor).div(BASE18)
            );
        maps.maxborrowable = res[2] = maps.liquidity
            .mul(BASE18).div(oprice)
            .mul(BASE18).div(toPow(odecimals));
        maps.borrowable = res[1] = maps.maxborrowable
            .mul(parseInt(state.slippage[maps.action] * 1e4)).div(1e4)
        //await ctrl.callStatic.borrowAllowed(maps.otarget, maps.user ?? maps.account, borrowable);
        debug('available', maps.target, [maps.itoken, maps.otoken], str([iprice, oprice]), str([maps.amount, maps.liquidity, maps.maxborrowable]));
    } catch (err) {
        debug('comp', maps, err.stack);
    }
    // should halt
    return res;
};

/**
 * splitted function: compound need special function to determine correct target and interface
 */
async function comp_ref (maps = {}, index = -1) {
    // find target by our own api
    const get_pools = async (tokens = [], res = null) =>
        (res = await import('axios')) &&
        (res = (await res.default.get(this.poolsApi + maps.target, { responseType: 'json' })).data) &&
        (res = res['lendings'] ?? res) &&
        (res = res['reserves_list'] ?? res) &&
        tokens.map(
            token =>
            (token = res[ ((token = token.toLowerCase()) == getAddress('token.eth')) ? A0 : token ]) &&
            (token = token['cToken'] ?? token['vToken'] ?? token['token'] ?? token)
        ) || new Array(tokens.length).fill(A0);
    try {
        if (index > 1) {
            // target not a ctoken
            maps.targets = await get_pools([maps.itoken ?? maps.token, maps.otoken ?? maps.token]);
            const def = {
                ...this,
                ...invalidAddresses.concat([getAddress('token.eth')]).includes(maps.token.toLowerCase()) && this.ether,
                target: maps.targets.slice().reverse().find(e => e),
                otarget: maps.targets[1],
                targets: maps.targets
            };
            Object.entries({
                deposit: 0,
                redeem: 0,
                borrow: 1,
                repay: 1
            }).forEach(([name, index]) => (def[name].target = maps.targets[index]));
            if (maps.action === 'borrows' || maps.targets[0] != maps.targets[1]) {
                def.delegate = false;
            }
            return def;
        } else if (index == 1) {
            // target is cether
            return { ...this, ...this.ether };
        }
    } catch(err) {
        debug('ref', err.message, err.stack);
    }
    // target is ctoken
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
        delegate: true,
        url: 'https://github.com/aave/protocol-v2',
        tokens: {
            deposit: { get(maps) { return maps.itoken ?? maps.tokens?.[0] ?? maps.token } },
            output: temp=new View('getReserveData(address)', ['__token__'], '(uint256),uint128,uint128,uint128,uint128,uint128 stable,uint40,address,address stable,address,address,uint8 id', 7),
            stabledebt: OA(temp, {index: 8}),
            debt: OA(temp, {index: 9})
        },
        deposit: new Call(null, 'deposit(address,uint256,address,uint16)', ['__token__', '__amount__', '__user__', '0'], '0', { title: 'Deposit asset to pool', params: ['Asset address', 'Asset amount', 'On behalf of', 'Referral code'], editable: 1 }, new Check(
            getBalanceView('__account__', '__token__'),
            View.PASS
        )),
        approve: approve('__debttoken__', '__aggregator__', '__available__', 'approveDelegation', 'borrowAllowance'),
        borrow: new Call(null, 'borrow(address,uint256,uint256,uint16,address)', ['__token__', '__amount__', '1', '0', '__user__'], '__eth__', { title: 'Borrow reserve asset', params: ['Asset address', 'Amount', 'Interest rate mode', 'Referal code', 'On behalf of'], editable: 1 }, new Check(
            getBalanceView('__account__', '__token__'),
            View.PASS
        )),
        redeem: new Call(null, 'withdraw(address,uint256,address)', ['__token__', '__amount', '__account__'], '0', { title: 'Withdraw deposited asset', params: ['Asset address', 'Amount', 'Receiver'], editable: 1 }),
        repay: new Call(null, 'repay(address,uint256,uint256,address)', ['__token__', '__amount', '1', '__account__'], '__eth__', { title: 'Repay borrow', params: ['Asset address', 'Amount', 'Interest rate mode', 'On behalf of'], editable: 1 }, new Check(
            getBalanceView('__account__', '__token__'),
            View.PASS
        )),
        oracle: [
            new View('getPriceOracle()', [], 'address')
        ],
        get redeemable() {
            return new View();
        },
        get available() {
            return {
                reservedata: this.tokens.output,
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
        delegate: true,
        url: 'https://github.com/geist-finance/geist-protocol',
        tokens: {
            deposit: { get(maps) { return maps.itoken ?? maps.tokens?.[0] ?? maps.token } },
            output: temp=new View('getReserveData(address)', ['__token__'], '(uint256),uint128,uint128,uint128,uint128,uint40,address,address,address,uint8', 6),
            debt: OA(temp, {index: 7})
        },
        approve: approve('__debttoken__', '__aggregator__', '__available__', 'approveDelegation', 'borrowAllowance'),
        deposit: new Call(null, 'deposit(address,uint256,address,uint16)', ['__token__', '__amount__', '__user__', '0'], '0', { title: 'Deposit to lending pool', params: ['Asset address', 'Asset amount', 'On behalf of', 'Referral code'], editable: 1 }, new Check(
            getBalanceView('__account__', '__token__'),
            View.PASS
        )),
        borrow: new Call(null, 'borrow(address,uint256,uint16,address)', ['__token__', '__amount__', '0', '__user__'], '0', { title: 'Borrow reserve asset', params: ['Asset address', 'Amount', 'Referal code', 'On behalf of'], editable: 1 }, new Check(
            getBalanceView('__account__', '__token__'),
            View.PASS
        )),
        redeem: new Call(null, 'withdraw(address,uint256,address)', ['__token__', '__amount', '__account__'], '0', { title: 'Withdraw deposited asset', params: ['Asset address', 'Amount', 'Receiver'], editable: 1 }),
        repay: new Call(null, 'repay(address,uint256,address)', ['__token__', '__amount', '1', '__account__'], '0', { title: 'Repay borrow', params: ['Asset address', 'Amount', 'On behalf of'], editable: 1 }, new Check(
            getBalanceView('__account__', '__token__'),
            View.PASS
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
                reservedata: this.tokens.output,
                oracle: this.oracle,
                get: aave_available
            };
        }
    },
    {
        id: 'dd2daefe7b2140a5a1eb7c5b08ff8df8',
        title: 'Compound ERC compatible',
        detect: [
            new View('underlying()', [], 'address'),
            new View('isCToken()', [], 'address'),
            //new View('compRate()', [], 'uint256'),
            new View('cTokenMetadataAll(address[])', [[]], 'bytes32'),
            new View('vTokenMetadataAll(address[])', [[]], 'bytes32')
        ],
        delegate: false,
        url: 'https://github.com/compound-finance/compound-protocol',
        poolsApi: state.config.apiBase + '/dev/lending-pools?address=',
        // data provided is flawed, ref() is for both correcting address and interfacing detection
        ref: comp_ref,
        tokens: {
            deposit: new View('underlying()', [], 'address'),
            output: { get: maps => maps.target }
        },
        deposit: new Call(null, 'mint(uint256)', ['__amount__'], '0', { title: 'Deposit token to pool', params: ['Amount'], editable: 0 }, new Check(
            getBalanceView('__account__', '__target__'),
            View.INCREASE,
            '__amount__'
        )),
        redeemable: temp=new View('balanceOfUnderlying(address)', ['__account__'], 'uint256'),
        borrow: new Call(null, 'borrow(uint256)', ['__amount__'], '0', { title: 'Borrow underlying asset', params: ['Amount'], editable: 0 }, new Check(
            temp,
            View.PASS,
            '__borrowable__'
        )),
        redeem: new Call(null, 'redeemUnderlying(uint256)', ['__amount__'], '0', { title: 'Redeem underlying assets', params: ['Amount'], editable: 0 }),
        repay: new Call(null, 'repayBorrowBehalf(address,uint256)', ['__account__', '__amount__'], '0', { title: 'Repay borrow on', params: ['For', 'Amount'], editable: 1 }, new Check(
            new View(),
            View.PASS
        )),
        get available() {
            return {
                tokens: this.tokens,
                get: comp_available
            };
        },
        get ether() {
            return {
                title: this.title.replace('ERC', 'ETH'),
                tokens: {
                    deposit: { get () { return ethers.constants.AddressZero } },
                    output: { get (maps) { return maps.target } }
                },
                deposit: new Call(null, 'mint()', [], '__amount__', { title: 'Deposit ETH to pool', params: ['Amount'], editable: 0 }, new Check(
                    new View(),
                    View.PASS
                )),
                borrow: this.borrow,
                redeem: this.redeem,
                repay: new Call(null, 'repayBorrowBehalf(address)', ['__account__'], '__amount__', { title: 'Repay all ETH', params: ['For'], editable: -1 }, new Check(
                    new View(),
                    View.PASS
                ))
            }
        }
    }
];
