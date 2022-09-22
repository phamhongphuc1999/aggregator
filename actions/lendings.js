import * as ethers from 'ethers';
import state from '../state.js';
import { Call, Check, View, approve, getBalanceView } from '../common.js';
import { contract, toBN, toPow, getAddress, getDecimals, subSlippage, invalidAddresses, debug, str, axios } from '../helpers.js';

const A0 = invalidAddresses[0];

let temp;

/**
 * Supported lendings
 */
const lendings = [
    {
        id: '1984b1cee1c74a5c896cf1f1051dab19',
        title: 'AAVE compatible v2',
        detect: [
            new View('FLASHLOAN_PREMIUM_TOTAL()', [], 'uint256')
        ],
        delegate: true,
        url: 'https://github.com/aave/protocol-v2',
        fetchs: {
            deposittoken: { get(maps) { return maps.itoken ?? maps.tokens?.[0] ?? maps.token } },
            outputtoken: temp=new View('getReserveData(address)', ['__token__'], '(uint256),uint128,uint128,uint128,uint128,uint128 stable,uint40,address,address stable,address,address,uint8 id', 7),
            stabledebttoken: temp.update({}, 8),
            debttoken: temp.update({}, 9)
        },
        deposit: new Call(null, 'deposit(address,uint256,address,uint16)', ['__token__', '__amount__', '__user__', '0'], '0', { title: 'Deposit tokens to pool', params: ['Asset address', 'Asset amount', 'On behalf of', 'Referral code'], editable: 1, gas: '238000' }, new Check(
            getBalanceView('__account__', '__token__'),
            View.PASS
        )),
        approve: approve('__debttoken__', '__aggregator__', '__borrowable__', 'approveDelegation', 'borrowAllowance'),
        borrow: new Call(null, 'borrow(address,uint256,uint256,uint16,address)', ['__token__', '__amount__', '1', '0', '__user__'], '__eth__', { title: 'Borrow from reserves', params: ['Asset address', 'Amount', 'Interest rate mode', 'Referal code', 'On behalf of'], editable: 1, gas: '305000' }, new Check(
            getBalanceView('__account__', '__token__'),
            View.PASS
        )),
        redeem: new Call(null, 'withdraw(address,uint256,address)', ['__token__', '__amount', '__account__'], '0', { title: 'Withdraw deposited tokens', params: ['Asset address', 'Amount', 'Receiver'], editable: 1, gas: '100000' }),
        repay: new Call(null, 'repay(address,uint256,uint256,address)', ['__token__', '__amount', '1', '__account__'], '__eth__', { title: 'Repay borrow', params: ['Asset address', 'Amount', 'Interest rate mode', 'On behalf of'], editable: 1, gas: '100000' }, new Check(
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
                get: async function (maps = {}, abi = 'lendings.a') {
                    // https://github.com/aave/aave-js
                    // could be integrate to some contract
                    const res = new Array(3);
                    const con = contract(maps.target, abi);
                    try {
                        //[maps.itoken, maps.otoken] = [,];
                        const [[totalliquidity, totaldebt, totalborrowable, threshold, totalltv, healthfactor], [[idata], ], addressprovider, idecimals, odecimals] = await Promise.all([
                            con.getUserAccountData(maps.account),
                            this.reservedata.get({ token: maps.itoken }, maps.target),
                            con.getAddressesProvider(),
                            getDecimals(maps.itoken),
                            getDecimals(maps.otoken)
                        ]);
                        // accurate for most variations
                        const oracle = con.attach(
                            maps.oracle = await Promise.any(this.oracles.map(view => view.get(false, addressprovider)))
                        );
                        [maps.iprice, maps.oprice] = await Promise.all([
                            oracle.getAssetPrice(maps.itoken),
                            oracle.getAssetPrice(maps.otoken)
                        ]);
                        // https://docs.aave.com/developers/v/2.0/the-core-protocol/protocol-data-provider
                        const iltv = parseInt(idata.toHexString().slice(-4), 16);
                        //
                        maps.available = res[0] = (
                                state.config.existingLiquidity ?
                                totalliquidity.mul(totalltv).div(1e4) :
                                toBN(0)
                            ).add(
                                toBN(maps.amount)
                                .mul(maps.iprice).div(toPow(idecimals))
                                .mul(iltv).div(1e4)
                            );
                        maps.maxborrowable = res[2] = res[0]
                            .mul(toPow(odecimals)).div(maps.oprice);
                        maps.borrowable = res[1] = subSlippage(res[2], maps.action ?? 'borrows', maps.auto);
                        debug('available', str(maps.amount), str([maps.itoken, maps.otoken]), str([maps.iprice, maps.oprice]), str(res));
                    } catch (err) {
                        debug('!available', maps, err.stack);
                    }
                    // should halt
                    return res;
                },
                reservedata: this.fetchs.outputtoken.update({}, -1),
                oracles: this.oracle
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
        fetchs: {
            deposittoken: { get(maps) { return maps.itoken ?? maps.tokens?.[0] ?? maps.token } },
            outputtoken: temp=new View('getReserveData(address)', ['__token__'], '(uint256),uint128,uint128,uint128,uint128,uint40,address,address,address,uint8', 6),
            debttoken: temp.update({}, 7)
        },
        approve: approve('__debttoken__', '__aggregator__', '__borrowable__', 'approveDelegation', 'borrowAllowance'),
        deposit: new Call(null, 'deposit(address,uint256,address,uint16)', ['__token__', '__amount__', '__user__', '0'], '0', { title: 'Deposit to lending pool', params: ['Asset address', 'Asset amount', 'On behalf of', 'Referral code'], editable: 1, gas: '225000' }, new Check(
            getBalanceView('__account__', '__token__'),
            View.PASS
        )),
        borrow: new Call(null, 'borrow(address,uint256,uint16,address)', ['__token__', '__amount__', '0', '__user__'], '0', { title: 'Borrow from reserves', params: ['Asset address', 'Amount', 'Referal code', 'On behalf of'], editable: 1, gas: '332000' }, new Check(
            getBalanceView('__account__', '__token__'),
            View.PASS
        )),
        redeem: new Call(null, 'withdraw(address,uint256,address)', ['__token__', '__amount', '__account__'], '0', { title: 'Withdraw deposited tokens', params: ['Asset address', 'Amount', 'Receiver'], editable: 1, gas: '100000' }),
        repay: new Call(null, 'repay(address,uint256,address)', ['__token__', '__amount', '1', '__account__'], '0', { title: 'Repay borrow', params: ['Asset address', 'Amount', 'On behalf of'], editable: 1, gas: '100000' }, new Check(
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
                ...lendings[0].available,
                reservedata: this.fetchs.outputtoken.update({}, -1),
                oracles: this.oracle,
            };
        }
    },
    {
        id: 'dd2daefe7b2140a5a1eb7c5b08ff8df8',
        title: 'Compound ERC compatible',
        detect: [
            new View('underlying()', [], 'address'),
            new View('accrualBlockNumber()', [], 'uint256'),
            new View('isComptroller()', [], 'bool'),
            //new View('cTokenMetadataAll(address[])', [[]], 'bytes32'),
            //new View('vTokenMetadataAll(address[])', [[]], 'bytes32')
        ],
        sanity: {
            deposit: new View('mintGuardianPaused(address)', ['__target__'], 'bool', -1, '__controller__'),
            borrow: new View('borrowGuardianPaused(address)', ['__target__'], 'bool', -1, '__controller__')
            //repay: new View('repayBorrowAllowed(address)', ['__target__'], 'bool', -1, '__controller__')
        },
        delegate: false,
        url: 'https://github.com/compound-finance/compound-protocol',
        poolsApi: state.config.baseAPI + '/dev/lending-pools?address=',
        // data provided is flawed, ref() is for both correcting address and interfacing detection
        // compound need special function to determine correct target and interface
        ref: async function (maps = {}, index = -1) {
            // find target by our own api
            const isEth = (address) => invalidAddresses.concat([getAddress('token.eth')]).includes(address.toLowerCase())
            const apiGetPools = async (tokens = [], res = null) =>
            (res = (await axios({ url: this.poolsApi + maps.target, responseType: 'json' })).data) &&
            (res = res?.['lendings']?.['reserves_list'] ?? []) &&
            tokens.map(
                token =>
                (token = res[ ((token = token.toLowerCase()) == getAddress('token.eth')) ? A0 : token ]) &&
                (token = token['cToken'] ?? token['vToken'] ?? token['token'] ?? token)
            ) || new Array(tokens.length).fill(A0);
            try {
                if (index > 1) {
                    // target not a ctoken, is comptroller
                    const tokens = [maps.tokens?.[0] ?? maps.token, maps.tokens?.[1] ?? maps.token];
                    !maps.targets && (maps.targets = await apiGetPools(tokens));
                    //
                    const def = {
                        ...this,
                        ...isEth(maps.token ?? maps.tokens[0]) && this.ether,
                        // !prone to error!
                        target: maps.targets[tokens.indexOf(maps.token)] ?? maps.targets[0],
                        otarget: maps.targets[1] ?? maps.targets[0],
                        itarget: maps.targets[0],
                        //targets: maps.targets
                    };
                    //
                    def.controller = maps.controller = maps.target
                    //
                    Object.entries({
                        'deposit': 0,
                        'redeem': 0,
                        'borrow': 1,
                        'repay': 1
                    }).forEach(([name, index]) => (def[name] = def[name].update({ target: maps.targets[index] })));
                    // no delegate for borrowss
                    (maps.action === 'borrows' || maps.targets[0] != maps.targets[1]) && (def.delegate = false);
                    debug('ref', 'found', str([def.target].concat(maps.targets)), [index, def.delegate]);
                    return def;
                } else if (index == 1) {
                    // target is cether
                    debug('ref', 'ether', maps.target);
                    return { ...this, ...this.ether };
                }
            } catch(err) {
                debug('!ref', this.title, err.message, err.stack);
            }
            // target is ctoken
            debug('ref', 'erc20', maps.target);
            return this;
        },
        fetchs: {
            deposittoken: new View('underlying()', [], 'address'),
            outputtoken: { get: maps => maps.target }
        },
        deposit: new Call(null, 'mint(uint256)', ['__amount__'], '0', { title: 'Deposit token to pool', params: ['Amount'], editable: 0, gas: '195000' }, new Check(
            getBalanceView('__account__', '__target__'),
            View.INCREASE,
            '__amount__'
        )),
        redeemable: temp=new View('balanceOfUnderlying(address)', ['__account__'], 'uint256'),
        borrow: new Call(null, 'borrow(uint256)', ['__amount__'], '0', { title: 'Borrow from pool', params: ['Amount'], editable: 0, gas: '342000' }, new Check(
            temp,
            View.PASS,
            '__borrowable__'
        )),
        redeem: new Call(null, 'redeem(uint256)', ['__amount__'], '0', { title: 'Redeem underlying tokens', params: ['Amount'], editable: 0, gas: '279000' }),
        repay: new Call(null, 'repayBorrowBehalf(address,uint256)', ['__account__', '__amount__'], '0', { title: 'Repay borrow on', params: ['For', 'Amount'], editable: 1, gas: '100000' }, new Check(
            new View(),
            View.PASS
        )),
        get available() {
            return {
                get: async function (maps = {}, abi = 'lendings.c') {
                    // https://github.com/compound-developers/compound-borrow-examples
                    // deprecated
                    !state.deprecate &&
                    ([maps.itarget, maps.otarget] = [ maps.itarget ?? maps.targets?.[0] ?? maps.target, maps.otarget ?? maps.targets?.[1] ?? maps.target]);
                    // target should be a pool to borrow from
                    const BASE18 = toPow(18);
                    const res = new Array(3);
                    const con = contract(maps.otarget, abi);
                    try {
                        // check eth pool
                        //[maps.itoken, maps.otoken] = await Promise.all([maps.itarget, maps.otarget].map(target => con.attach(target).underlying()));
                        const controller = con.attach(maps.controller = await con.comptroller());
                        //const bbr = await con.borrowRatePerBlock();
                        const oracle = con.attach(maps.oracle = await controller.oracle());
                        const [{ 1:icollateralfactor }, { 1:totalliquidity }, iprice, oprice, idecimals, odecimals] = await Promise.all([controller.markets(maps.itarget), controller.getAccountLiquidity(maps.account), oracle.getUnderlyingPrice(maps.itarget), oracle.getUnderlyingPrice(maps.otarget), getDecimals(maps.itoken), getDecimals(maps.otoken)]);
                        // price: x decimals, liquidity: always 18 decimals and in USD
                        maps.available = res[0] = toBN(
                                state.config.existingLiquidity ?
                                totalliquidity :
                                toBN(0)
                            ).add(
                                toBN(maps.amount)
                                .mul(toPow(idecimals)).div(BASE18)
                                .mul(iprice).div(BASE18)
                                .mul(icollateralfactor).div(BASE18)
                            );
                        maps.maxborrowable = res[2] = res[0]
                            .mul(BASE18).div(oprice)
                            .mul(BASE18).div(toPow(odecimals));
                        maps.borrowable = res[1] = subSlippage(res[2], maps.action ?? 'borrows', maps.auto);
                        //await controller.callStatic.borrowAllowed(maps.otarget, maps.user ?? maps.account, borrowable);
                        debug('available', str(maps.amount), str([maps.itoken, maps.otoken]), str([iprice, oprice]), str(res));
                    } catch (err) {
                        debug('!available', maps, err.stack);
                    }
                    // should halt
                    return res;
                }
            };
        },
        get ether() {
            return {
                title: this.title.replace('ERC', 'ETH'),
                fetchs: {
                    deposittoken: { get () { return ethers.constants.AddressZero } },
                    outputtoken: { get (maps) { return maps.target } }
                },
                deposit: new Call(null, 'mint()', [], '__amount__', { title: 'Deposit ETH to pool', params: ['Amount'], editable: 0, gas: '265000' }, new Check(
                    new View(),
                    View.PASS
                )),
                borrow: this.borrow,
                redeem: this.redeem,
                repay: new Call(null, 'repayBorrowBehalf(address)', ['__account__'], '__amount__', { title: 'Repay all ETH', params: ['For'], editable: -1, gas: '195000' }, new Check(
                    new View(),
                    View.PASS
                ))
            }
        }
    }
];

export default lendings;
