import * as ethers from 'ethers';
import state from './state.js';
import { contract, toBN, isBN, getSigner, getDecimals, getToken, debug } from './helpers.js';

ethers.BigNumber.prototype.toJSON = function () { return this.toString() };
ethers.logger.warn = function () {};

//
const _update = (params, maps) => {
    const keys = Object.keys(maps);
    const ra = (item) => {
        let name;
        if (typeof item == 'string') {
            return keys.includes( name = item.split('__').join('').toLowerCase() ) ? maps[name] : item;
        } else if (item instanceof Array) {
            return item.map(ra);
        }
        return item;
    };
    return params.map(ra);
};

//
const methodName = (str) => str.slice(0, str.indexOf('('));

/**
 * Contract call holder
 * @param {string} target
 * @param {string} method
 * @param {Array} params
 * @param {number=} eth
 * @param {Object=} descs
 * @param {Check=} check
 * @param {Array=} inputs
 * @returns class
 */
function Call (target, method = '', params = [], eth = '0', descs = {title:'',params:[]}, check = null, inputs = null) {
    if (!target) target = '__target__';
    if (method instanceof Array) method = `${method[0]}(${method[1] instanceof Array ? method[1].join(',') : method[1]})`;
    if (!descs) descs = {};
    Object.assign(this, {
        target,
        method,
        params,
        eth,
        descs,
        check,
        inputs,
        targetName: '',
        fee: '0'
    });
    return this;
};
Call.prototype = {
    name() {
        return methodName(this.method);
    },
    update(maps = {}, params = this.params) {
        // only saved once when updating
        const _params = this.params.slice();
        // fill-in additional inputs
        Object.keys(this.inputs ?? {}).map((name) => (maps[name] === undefined) && (maps[name] = this.inputs[name].default));
        const [target, eth] = _update([this.target, this.eth], maps);
        const check = (this.check && this.check.update) ? this.check.update(maps) : null;
        return Object.setPrototypeOf({...this, ...(!this._params) && {_params}, _maps: maps, target, eth, check, params: _update(params, maps)}, Call.prototype);
    },
    contract(signer = getSigner()) {
        const [name, nonpay] = [this.name(), this.eth == '0' ? [] : null];
        const params = this.params.concat(nonpay ?? [ { value: this.eth } ]);
        let con = contract(this.target, [ `function ${this.method} ${nonpay ?? 'payable'}` ]);
        if (signer) con = con.connect(signer);
        con.call = () => con[name].apply(con, params);
        con.probe = () => con.callStatic[name].apply(con, params);
        con.estimate = () => con.estimateGas[name].apply(con, params);
        return con;
    },
    /**
     * Get metadata of call/target
     * @returns class
     */
    async meta() {
        const con = contract(this.target, 'token');
        try {
            this.targetName = await getToken(this.target).name ?? (this.target == getAddress() ? 'Automatic Aggregator' : null) ?? await con.name();
        } catch (err) {}
        try {
            const trimAddress = (address) => address.slice(0,8)+'...'+address.slice(-6);
            const printToken = async (amount, token) => ethers.utils.formatUnits(amount, await getDecimals(token))+' '+(await getToken(token)).symbol;

            //debug('------------->', this.method, this.params, this._params, this._maps);
            //
            this.descs.values = [];
            for (let [i, val] of Object.entries(this.params)) {
                if (typeof val === 'string' && val.startsWith('__')) break;
                if (ethers.utils.isAddress(val)) {
                    val = trimAddress(val);
                } else if (isBN(this._params[i]) || this._params[i].toString().includes('amount')) {
                    val = await printToken(toBN(val), this._maps.token ?? this._maps.otoken ?? this._maps.itoken ?? ethers.constants.AddressZero);
                }
                this.descs.values.push(val);
            }

            //[this.fee, this.probe] = await Promise.all([con.estimate(), con.probe()]);
        } catch (err) {
            debug('fee', this.method, err.code, err.stack);
        }
        return this;
    },
    /**
     * Get transaction info
     * @returns transaction
     */
    get(from = null) {
        //const sig = ethers.utils.id(this.method).slice(0, 10);
        //const types = this.method.split(',');
        const con = this.contract(null);
        const data = con.interface.encodeFunctionData(this.name(), this.params);
        return {
            to: this.target,
            data,
            value: this.eth,
            ...(from) && {from},
            chainId: state.chainId
        };
    },
    encode() {
        return Object.values(this.get()).slice(0,3);
    }
};

/**
 * View only call holder
 * @param {string} method
 * @param {Array} params
 * @param {index=} returns
 * @param {number=} index
 * @param {target=} target
 * @returns class
 */
function View (method = '', params = [], returns = '', index = -1, target = ethers.constants.AddressZero) {
    // passthrough function
    if (method instanceof Function) {
        this.get = method;
    }
    Object.assign(this, {
        method,
        params,
        returns,
        index,
        target
    });
    return this;
};
View.prototype = {
    name() {
        return methodName(this.method);
    },
    update(maps = {}, index = this.index) {
        // clone
        return Object.setPrototypeOf({...this, _maps: maps, index, params: _update(this.params ?? [], maps)}, View.prototype);
    },
    contract(address = this.target) {
        return contract(address, [ `function ${this.method} view returns (${this.returns})` ]);
    },
    /**
     * Get view value
     * @param {address} target
     * @param {Object} maps
     * @returns any
     */
    async get(maps = {}, target = this.target) {
        const ms = Date.now();
        const con = this.contract(target);
        const params = _update(this.params ?? [], maps ?? {});
        let res = null;
        try {
            res = await con.callStatic[this.name()].apply(con, params.concat([state.view.options]));
            res = (res.length && this.index != -1) ? res[this.index] : res;
        } catch (err) {
            (false) && debug('view', err.code, [address, this.name(), params]);
            if (!maps) throw err;
        }
        return res;
    },
    encode(address = this.target, maps = {}) {
        return this.method ?
            [address, this.contract(address).interface.encodeFunctionData(this.name(), _update(this.params, maps)), '0'] :
            null;
    }
};

// enum constant = nulls
const Expecting = {
    PASS: 0,
    EQUAL: 1,
    INCREASE: 2,
    DECREASE: 3,
    MORETHAN: 4
};

/**
 * Expectation wrapper
 * @param {View} view
 * @param {Expecting} expecting
 * @param {string} value
 * @param {*} vtype
 * @returns class
 */
function Check (view, expecting = Expecting.PASS, value = '0', vtype = ethers.BigNumber) {
    Object.assign(this, {
        view,
        expecting,
        value,
        vtype
    });
    return this;
};
Check.prototype = {
    update(maps = {}, value = this.value) {
        return Object.setPrototypeOf({...this, _maps: maps, value: _update([value], maps)[0], view: this.view.update(maps)}, Check.prototype);
    },
    /**
     * Evaluate a check/expectation
     * @param {address} target
     * @param {object} maps
     * @returns boolean
     */
    async eval(target, maps = {}) {
        let match = false;
        const ret = await this.view.get(maps, target);
        if (ret == null) return match;
        switch (this.vtype) {
        }
        switch (this.expecting) {
            case Expect.EQUAL:

            break;
            case Expect.INCREASE:

            break;
            case Expect.DECREASE:

            break;
            case Expect.MORETHAN:

            break;
            default:
                match = true;
        }
        return match;
    },
    /**
     * Encode to use in aggregated calls
     * @returns array tuple
     */
    encode() {
        // view should be already updated
        return [this.view.encode(), isFinite(this.expecting) ? this.expecting : Expect[this.expecting], this.value, (this.view.index == -1) ? 0 : this.view.index];
    }
};

export { Call, Expecting, Check, View };

// Get approve call
const approve = (token, spender, amount = '__amount__', name='approve', check='allowance') =>
    new Call(token, name + '(address,uint256)', [spender, amount], '0', { title: 'Approve token spending', params: ['Spender', 'Amount'] }, new Check(
        new View(check + '(address,address)', ['__account__', spender], 'uint256', -1, token),
        Expecting.EQUAL,
        amount
    ));
// Get transfer call
const transfer = (token, to, amount = '__amount__') =>
    new Call(token, 'transfer(address,uint256)', [to, amount], 0, { title: 'Transfer token', params: ['Receiver', 'Amount'] }, new Check(
        getBalanceView(to, token),
        Expecting.INCREASE,
        amount
    ));

// get ETH balance
const getBalanceEth = (account) => new View('balance(address)', [ account ], ['uint256']).get({}, getAddress());
// get balance view
const getBalanceView = (account, token = ethers.constants.AddressZero) => new View('balanceOf(address)', [ account ], ['uint256'], -1, token);
// get ERC balance
const getBalance = (account, token) => getBalanceView(account, null).get({}, token);

export { approve, transfer, getBalance, getBalanceEth };
