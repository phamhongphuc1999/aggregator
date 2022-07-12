import ethers from 'ethers';
import fetch from 'node-fetch';
import state from '../state.js';
import { Call, Check, View, approve } from '../common.js';
import { contract, toBN, getDecimals, invalidTokens, debug } from '../helpers.js';

const toPow = (n) => toBN(10).pow(n);

/**
 * splitted function:
 */
async function aave_available (maps = {}, abi = 'lendings.a') {
    // should be integrate to some contract
    const con = contract(maps.target, abi);
    try {
        const [ap, [total, debt, available, threshold, ltv, hf], idecimals, decimals] = await Promise.all([con.getAddressesProvider(), con.getUserAccountData(maps.account), getDecimals(maps.itoken), getDecimals(maps.token)]);
        //
        const oracle = con.attach(await Promise.any(this.oracles.map(view => view.get(ap, false))));
        const [idata] = await this.tokens[0].update({ token: maps.itoken }, 0).get(maps.itarget ?? maps.target);
        const iltv = parseInt(idata.toHexString().slice(-4), 16);
        //
        const [iprice, price] = await Promise.all([oracle.getAssetPrice(maps.itoken), oracle.getAssetPrice(maps.token)]);
        //
        return toBN(available)
            .mul(ltv).div(1e4)
            .add(
                toBN(maps.amount).mul(iltv).div(1e4).mul(iprice).div(toPow(idecimals))
            ).mul(toPow(decimals)).div(price)
            .mul(parseInt(state.slippage.borrow * 1e4)).div(1e4);
        } catch (err) {
        debug('aave', maps, [err.message, err.stack]);
    }
    return toBN(0);
};

/**
 * splitted function:
 */
async function comp_available (maps = {}, abi = 'lendings.c') {
    const con = contract(maps.target, abi);
    try {
        let [token, bbr, ctrl] = await Promise.all([con.underlying(), con.borrowRatePerBlock(), con.comptroller()]);
        ctrl = con.attach(ctrl);
        let oracle = con.attach(await ctrl.oracle());
        const [{ 1:cfactor }, { 1:liquidity }, price, decimals] = await Promise.all([ctrl.markets(maps.target), ctrl.getAccountLiquidity(maps.account), oracle.getUnderlyingPrice(maps.target), getDecimals(token)]);
        // price: x decimals, liquidity: 18 decimals
        debug('===============================>', maps, price);
        return toBN(liquidity)
                .mul(toPow(6)).div(price)
                .mul(toPow(decimals)).div(toPow(18))
                .add(
                    toBN(maps.amount).mul(cfactor).div(toPow(18))
                ).mul(parseInt(state.slippage.borrow * 1e4)).div(1e4);
    } catch (err) {
        debug('comp', [maps.target, maps], [err.message, err.stack]);
    }
    return toBN(0);
};

async function token_get_pool (api_url, token) {
    // find target by our own api
    let res = await (await fetch(api_url)).json();
    res = res['lendings'] ?? res;
    res = res['reserves_list'] ?? res;
    res = res[token];
    res = res['cToken'] ?? res['vToken'] ?? res;
    return res;
};

/**
 * splitted function: compound need special function to determine correct target and interface
 */
async function comp_ref (index, maps = {}) {
    try {
        if (index > 1) {
            let target;
            // target not a ctoken
            if (ethers.utils.isAddress(maps.target)) {
                const def = {...this};
                //
                if (target = await token_get_pool(this.tokensUrl+maps.target, maps.itoken ?? maps.token)) {
                    const obj = invalidTokens.includes(target.toLowerCase()) ? this.ether : this;
                    Object.assign(def, {
                        deposit: obj.deposit.update({target}),
                        reddem: obj.redeem.update({target})
                    });
                    def.target = target;
                }
                //
                if (target = await token_get_pool(this.tokensUrl+maps.target, maps.otoken ?? maps.token)) {
                    Object.assign(def, {
                        borrow: this.borrow.update({target}),
                        repay: this.repay.update({target})
                    });
                    def.target = target;
                }
                return def;
            }
        } else if (index == 1) {
            // target is cether
            return {
                ...this,
                ...this.ether
            };
        }
    } catch(err) {
        debug('ref', [err.message, err.stack]);
    }
    // target is normal
    return this;
};

/**
 * Supported lendings
 */
export default [
    {
        title: 'AAVE compatible v2',
        detect: [
            new View('FLASHLOAN_PREMIUM_TOTAL()', [], 'uint256')
        ],
        token: [
            new View('getReserveData(address)', ['__token__'], '(uint256),uint128,uint128,uint128,uint128,uint128 stable,uint40,address,address stable,address,address,uint8 id', 7)
        ],
        deposit: new Call(null, 'deposit(address,uint256,address,uint16)', ['__token__', '__amount__', '__account__', '0'], '0', { title: 'Deposit asset to pool', params: ['Asset address', 'Asset amount', 'On behalf of', 'Referral code'] }, new Check(
            new View()
        )),
        approve: approve(null, '__aggregator__', '__available__', 'approveDelegation', 'borrowAllowance'),
        borrow: new Call(null, 'borrow(address,uint256,uint256,uint16,address)', ['__token__', '__amount__', '1', '0', '__account__'], '__eth__', { title: 'Borrow reserve asset', params: ['Reserve address', 'Amount', 'Interest rate mode', 'Referal code', 'On behalf of'] }, new Check(
            new View()
        )),
        redeem: new Call(),
        repay: new Call(null, 'repay(address,uint256,uint256,address)', ['__token__', '__amount', '1', '__account__'], '__eth__', { title: 'Repay borrow', params: ['Reserve address', 'Amount', 'Interest rate mode', 'On behalf of'] }, new Check(
            new View()
        )),
        oracle: [
            new View('getPriceOracle()', [], 'address')
        ],
        get available() {
            return {
                tokens: this.token,
                oracles: this.oracle,
                get: aave_available
            };
        }
    },
    {
        title: 'AAVE compatible v2 (variable rate, no flashloan)',
        detect: [
            new View('LENDINGPOOL_REVISION()', [], 'uint256')
        ],
        token: [
            new View('getReserveData(address)', ['__token__'], '(uint256),uint128,uint128,uint128,uint128,uint40,address,address,address,uint8', 6)
        ],
        deposit: new Call(null, 'deposit(address,uint256,address,uint16)', ['__token__', '__amount__', '__account__', '0'], '0', { title: 'Deposit to lending pool', params: ['Asset address', 'Asset amount', 'On behalf of', 'Referral code'] }, new Check(
            new View()
        )),
        approve: approve(null, '__aggregator__', '__available__', 'approveDelegation', 'borrowAllowance'),
        borrow: new Call(null, 'borrow(address,uint256,uint16,address)', ['__token__', '__amount__', '0', '__account__'], '0', { title: 'Borrow reserve asset', params: ['Reserve address', 'Amount', 'Referal code', 'On behalf of'] }, new Check(
            new View()
        )),
        redeem: new Call(),
        repay: new Call(null, 'repay(address,uint256,address)', ['__token__', '__amount', '1', '__account__'], '0', { title: 'Repay borrow', params: ['Reserve address', 'Amount', 'On behalf of'] }, new Check(
            new View()
        )),
        oracle: [
            new View('getPriceOracle()', [], 'address'),
            new View('getPriceOracle(uint256)', [ 1 ], 'address')
        ],
        get available() {
            return {
                tokens: this.token,
                oracles: this.oracle,
                get: aave_available
            };
        }
    },
    {
        title: 'Compound ERC/ETH compatible',
        detect: [
            new View('underlying()', [], 'address'),
            new View('isCToken()', [], 'address'),
            new View('compRate()', [], 'uint256'),
            new View('cTokenMetadataAll(address[])', [[]], 'bytes32'),
            new View('vTokenMetadataAll(address[])', [[]], 'bytes32')
        ],
        nodelegate: true,
        tokensUrl: 'https://scoringapi.trava.finance/aggregator/dev/lending-pools?address=',
        ref: comp_ref,
        token: [ new View('underlying()', [], 'address') ],
        deposit: new Call(null, 'mint(uint256)', ['__amount__'], '0', { title: 'Deposit token to pool', params: ['Amount'] }, new Check(
            new View()
        )),
        borrow: new Call(null, 'borrow(uint256)', ['__amount__'], '0', { title: 'Borrow underlying asset', params: ['Amount'] }, new Check(
            new View()
        )),
        redeem: new Call(),
        repay: new Call(),
        get available () {
            return {
                token: this.token,
                get: comp_available
            };
        },
        ether: {
            token: [ { get: () => ethers.constants.AddressZero } ],
            deposit: new Call(null, 'mint()', [], '__amount__', { title: 'Deposit ETH to pool', params: [] }, new Check(
                new View()
            )),
            repay: new Call(null, 'repayBorrow()', [], '__amount__', { title: 'Repay all ETH', params: [] }, new Check(
                new View()
            ))
        }
    }
];
