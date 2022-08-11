import * as ethers from 'ethers';
import state from './state.js';
import { contract, toBN, isBN, getAddress, getSigner, getDecimals, getToken, debug, invalidAddresses, getChain } from './helpers.js';

ethers.BigNumber.prototype.toJSON = function () { return this.toString() };
ethers.logger.warn = function () {};

/**
 * @typedef {Object} Transaction
 */

/**
 * Update
 * @param {Array} params
 * @param {Object} maps
 * @returns {Array}
 */
function _update(params, maps = {}) {
    const keys = Object.keys(maps);
    const ra = (val) => {
        if (typeof val == 'string' && val.startsWith('__')) {
            //
            let prop = val.split('__').join('').toLowerCase(), key;
            keys.includes(prop) && (val = maps[prop]);
            //
            if (prop.includes('.') && ([prop, key] = prop.split('.'))) {
                keys.includes(prop) && maps[prop].hasOwnProperty(key) && (val = maps[prop][key]);
            }
        } else if (Array.isArray(val)) {
            return val.map(ra);
        }
        return val;
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
 * @return {Object}
 */
function Call (target, method = '', params = [], eth = '0', descs = {title: '', params: []}, check = null, inputs = undefined) {
    //console.assert(this.constructor === Call, "must-using-new");
    if (!target) target = '__target__';
    if (Array.isArray(method)) method = `${method[0]}(${Array.isArray(method[1]) ? method[1].join(',') : method[1]})`;
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
Call.prototype = Object.freeze({
    name() {
        return methodName(this.method);
    },
    /**
     * Update
     * @param {Object|string} maps
     * @param {Object=} params
     * @returns {Call}
     */
    update(maps = {}, params = this.params) {
        // only saved once when updating
        const _params = this.params.slice();
        // fill-in additional inputs
        Object.keys(this.inputs ?? {}).map((name) => (maps[name] === undefined) && (maps[name] = this.inputs[name]?.default));
        params = _update(params, maps);
        const [target, eth] = _update([this.target, this.eth], maps);
        const check = (this.check && this.check.update) ? this.check.update({...maps, ...this.params}) : null;
        return Object.setPrototypeOf({...this, ...(!this._params) && {_params}, _maps: maps, target, eth, check, params}, Call.prototype);
    },
    contract(signer = getSigner()) {
        const [name, nonpay] = [this.name(), this.eth == '0' ? [] : null];
        const params =
            (this.params[0]?.value ? this.params.map(e => e.value) : this.params)
            .concat(nonpay ?? [ { value: toBN(this.eth) } ]);
        let con = contract(this.target, [ `function ${this.method} ${nonpay ?? 'payable'}` ]);
        if (signer) con = con.connect(signer);
        con.call = () => con[name].apply(con, params);
        con.probe = () => con.callStatic[name].apply(con, params);
        con.estimate = () => con.estimateGas[name].apply(con, params);
        return con;
    },
    /**
     * Get metadata of call/target
     * @return {Call}
     */
    async meta() {
        //debug('meta', this.target, this.params);
        const con = contract(this.target, 'token');
        //
        const trimAddress = (address) => address.slice(0,8)+'...'+address.slice(-6);
        const printToken = (amount, token) =>
            (amount.eq(ethers.constants.MaxUint256) ? 'MAX' : ethers.utils.formatUnits(amount, token.getDecimals)) + ' ' + token.symbol;
        const getName = async (target, name='name', temp = null) => {
            try {
                target = target.toLowerCase();
                return state.cache.names[target] ?? (temp = await getToken(target) && temp.name) ?? await con.attach(target)[name]() ?? '';
            } catch (err) {
                return '';
            }
        };
        //
        const formatParam = async (val, i) => {
            const orig = val;
            if (typeof val === 'string' && val.startsWith('__')) {
                val = val.slice(2, val.lastIndexOf('__'));
            } else if (ethers.utils.isAddress(val)) {
                const name = await getName(orig);
                val = trimAddress(val);
                name && (val += ` (${name})`);
                state.config.formatHtml && (val = `<a href="${getChain().explorer?.url}/address/${orig}">${val}</a>`);
            } else if (isBN(this._params[i]) || (this._params[i] ?? '').toString().match(/amount|eth|value|in|out/)) {
                val = printToken(toBN(val),
                    await getToken(this.target, true) ??
                    await getToken(this._maps.token ?? this._maps.otoken ?? this._maps.itoken ?? ethers.constants.AddressZero)
                );
            } else if (Array.isArray(val)) {
                val = (await Promise.all(val.map(formatParam))).join(', ');
            }
            return val.toString();
        };
        //
        this.targetName = await getName(this.target);
        //
        try {
            this.descs.values = await Promise.all(Object.entries(this.params).map(
                ([i, val]) => formatParam(val, i)
            ));
            //[this.fee, this.probe] = await Promise.all([con.estimate(), con.probe()]);
        } catch (err) {
            debug('meta', this.method, err.message, err.stack);
        }
        return this;
    },
    /**
     * Get transaction info
     * @return {Transaction}
     */
    get(from = null, nonce = NaN) {
        //const sig = ethers.utils.id(this.method).slice(0, 10);
        //const types = this.method.split(',');
        const data = this.method ?
            this.contract(null).interface.encodeFunctionData(this.name(), this.params) :
            (typeof this.params === 'string' ? ethers.utils.hexlify(ethers.utils.toUtf8Bytes(this.params)) : '0x');
        return {
            to: this.target,
            data,
            value: toBN(this.eth),
            ...(from) && {from},
            ...(!isNaN(nonce)) && {nonce},
            chainId: state.chainId
        };
    },
    encode() {
        return Object.values(this.get()).slice(0,3);
    }
});

/**
 * View only call holder
 * @param {string} method
 * @param {Array} params
 * @param {string=} returns
 * @param {number=} index
 * @param {target=} target
 * @return {Object}
 */
function View (method = '', params = [], returns = '', index = -1, target = ethers.constants.AddressZero) {
    //console.assert(this.constructor === View, "must-using-new");
    //if (method instanceof Function) this.get = method;
    Object.assign(this, {
        method,
        params,
        returns,
        index,
        target
    });
    return this;
};
View.prototype = Object.freeze({
    name() {
        return methodName(this.method);
    },
    update(maps = {}, index = this.index) {
        // clone
        return Object.setPrototypeOf({...this, _maps: maps, index, target: _update([this.target], maps)[0], params: _update(this.params ?? [], maps)}, View.prototype);
    },
    contract(address = this.target) {
        return contract(address, [ `function ${this.method} view returns (${this.returns})` ]);
    },
    /**
     * Get view value
     * @param {address} target
     * @param {Object} maps
     * @return any
     */
    async get(maps = {}, target = this.target, detect = false) {
        //const ms = Date.now();
        if (!this.method) {
            return null;
        }
        const con = this.contract(target);
        const params = _update(this.params ?? [], maps ?? {});
        let res = null;
        try {
            res = await con.callStatic[this.name()].apply(con, params.concat([state.view.options]));
            res = (res.length && this.index != -1) ? res[this.index] : res;
            // might
            detect && debug('match', target,  this.name());
        } catch (err) {
            if (!maps) { throw err; }
            !detect && debug('view', err.code, target, this.name(), params, this.index);
        }
        return res;
    },
    encode(address = this.target, maps = {}) {
        return this.method ?
            [address, this.method ? this.contract(address).interface.encodeFunctionData(this.name(), _update(this.params, maps)) : '0x', '0'] :
            [invalidAddresses[0], '0x', '0'];
    }
});

// enum constant = nulls
const Expecting = Object.freeze({
    PASS: 0,
    EQUAL: 1,
    INCREASE: 2,
    DECREASE: 3,
    MORETHAN: 4,
    FAIL: 5,
    NOTEQUAL: 6
});

/**
 * Expectation wrapper
 * @param {View} view
 * @param {Expecting} expecting
 * @param {string} value
 * @param {*} vtype
 * @return {Object}
 */
function Check (view, expecting = Expecting.PASS, value = '0', vtype = ethers.BigNumber, last = null) {
    //console.assert(this.constructor === Check, "must-using-new");
    Object.assign(this, {
        view,
        expecting,
        value,
        vtype,
        last
    });
    this._fetch();
    return this;
};
Check.prototype = Object.freeze({
    _fetch() {
        const {view} = this;
        //console.error('---->', view.target, view._params, view.params, view.method);
        (!this.last && view) &&
            (ethers.utils.isAddress(view.target) && view.params.filter(e => e && e.startsWith('__')).length == 0) &&
            ([Expecting.INCREASE, Expecting.DECREASE].includes(this.expecting)) &&
            (this.last = view.get());
        return this.last;
    },
    update(maps = {}, value = this.value) {
        if (!this.view?.update) {
            return null;
        }
        value = _update([value], maps)[0];
        const obj = Object.setPrototypeOf({...this, _maps: maps, value, view: this.view.update(maps)}, Check.prototype);
        obj._fetch();
        return obj;
    },
    /**
     * Evaluate a check/expectation
     * @param {address=} target
     * @param {Object=} maps
     * @return {boolean}
     */
    async eval(target = this.view?.target, maps = {}) {
        //if (!this.hasOwnProperty('_maps')) { throw new Error('Not updated'); }
        let match = false;
        try {
            this._fetch();
            (this.last instanceof Promise) && (this.last = await this.last);
            const ret = await this.view.get(maps, target);
            if (ret != null) {
                // currently only bytes32 and bignumber
                switch (this.vtype) {
                    default:
                }
                // very primitive
                const n = toBN(ret);
                switch (this.expecting) {
                    case Expecting.EQUAL:
                        match = n.eq(this.value) || ret == this.value;
                    break;
                    case Expecting.INCREASE:
                        match = (this.value == '0') ?
                            n.gt(last) :
                            n.sub(last).eq(this.value);
                    break;
                    case Expecting.DECREASE:
                        match = (this.value == '0') ?
                            n.lt(last) :
                            n.sub(ret).eq(this.value);
                    break;
                    case Expecting.MORETHAN:
                        match = n.gt(this.value);
                    break;
                    case Expecting.PASS:
                    default:
                        match = true;
                }
            } else {
                match = this.expecting == Expecting.FAIL;
            }
        } catch (err) {
            debug('eval', err.message);
        }
        return match;
    },
    /**
     * Encode to use in aggregated calls
     * @return array tuple
     */
    encode() {
        // view should be already updated
        return [this.view.encode(), isFinite(this.expecting) ? this.expecting : Expect[this.expecting], this.value, (this.view.index == -1) ? 0 : this.view.index];
    }
});

export { Call, Expecting, Check, View };

// Get allowance view
const allowance = (token = '__token__', owner = '__account__', spender = '__to__', name='allowance') =>
    new View(name + '(address,address)', [owner, spender], 'uint256', -1, token);
// Get approve call
const approve = (token = '__token__', spender = '__target__', amount = '__amount__', name='approve', checkName='allowance') =>
    new Call(token, name + '(address,uint256)', [spender, amount], '0', { title: 'Approve token spending', params: ['Spender', 'Amount'] }, new Check(
        allowance(token, '__account__', spender, checkName),
        Expecting.EQUAL,
        amount
    ));
// Get transfer call
const transfer = (token = '__token__', to = '__account__', amount = '__amount__') =>
    new Call(token, 'transfer(address,uint256)', [to, amount], '0', { title: 'Transfer token', params: ['Receiver', 'Amount'] }, new Check(
        getBalanceView(to, token),
        Expecting.MORETHAN,
        amount
    ));

// get ETH balance
const getBalanceEth = (account = '__account__') => new View('balance(address)', [ account ], ['uint256']).get({}, getAddress());
// get balance view
const getBalanceView = (account = '__account__', token = ethers.constants.AddressZero) => new View('balanceOf(address)', [ account ], ['uint256'], -1, token);
// get ERC balance
const getBalance = (account = '__account__', token = ethers.constants.AddressZero) => getBalanceView(account, null).get({}, token);

export { approve, transfer, getBalance, allowance, getBalanceEth, getBalanceView };
