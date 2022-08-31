import * as ethers from 'ethers';
import state from './state.js';
import config from './config.js';

/**
 * Helper functions
 *
 * @typedef {address} string
 * @typedef {ethers.BigNumber|string} bn
 */

// Get contract instance
export function contract (address = ethers.constants.AddressZero, abi = 'token') {
    return new ethers.Contract(address, (typeof abi == 'string') ? getABI(abi) : abi, getProvider())
};

// Get function definitions
export async function functions (name) {
    return (await import('./actions/functions.js')).default[name] ?? {};
};

// Get swapsdk on-demand
export async function swapsdk() {
    try {
        const swapsdk = await import ('@uniswap/sdk');
        // init uniswap sdk
        swapsdk.ChainId = state.chainId;
        swapsdk.FACTORY_ADDRESS = getAddress('swap.factory');
        swapsdk.WETH[state.chainId] = new swapsdk.Token(state.chainId, getAddress('token.eth'), 18, 'WETH', 'Wrapped');
        return swapsdk;
    } catch (err) {
        return null;
    }
};

// Get axios library
export async function axios(args = null) {
    const axios = (await import('axios')).default;
    if (args) {
        return await (typeof axios === 'string' ? axios.get : axios)(args);
    }
    return axios;
};

/**
 * Return first valid swap path and expected out amounts
 * @param {address} router
 * @param {address} from
 * @param {address} to
 * @param {ethers.BigNumber=} amount
 * @param {boolean=} final
 * @returns [path, amounts]
 */
export function findSwapPath (router, tokens = [], amount = toBN(10000), final = true) {
    const con = contract(router, 'swaps');
    const mtokens = [getAddress('token.eth')]
        .concat(getAddress('token.usd'))
        .map(a => a.toLowerCase())
        .filter(token => !tokens.includes(token));
    tokens = tokens.map(token => invalidAddresses.includes(token) ? mtokens[0] : token);
    // !try: direct, via weth, via usds, via mix of eth and first usd token (ordered)
    const paths = [[], ...mtokens.map(token => [token]), mtokens.slice(0,2), mtokens.slice(0,2).reverse() ];
    //toBN(amount).eq(0) && (amount = toBN(10000));
    //swapsdk.Trade.bestTradeExactIn(apairs, new swapsdk.TokenAmount(new swapsdk.Token(), maps.amount.toHexString()), new swapsdk.Token(), { maxHops: 3, maxNumResults: 1 })[0];
    //
    return Promise.any(paths.map(path => [tokens[0], ...path, tokens[1]]).map(async path => {
        const amounts = await con.getAmountsOut(amount, path);
        return [path, final ? amounts[amounts.length - 1] : amounts];
    })).catch(err => {
        debug.apply(null, ['!path', router, tokens].concat(paths));
        throw err;
    });
};

// Get pair address
export async function findSwapPair (router, tokens = []) {
    let con = contract(router, 'swaps');
    con = con.attach(router.toLowerCase() == getAddress('swap.router') ? getAddress('swap.factory') : await con.factory());
    return await con.getPair.apply(con, tokens);
};

// get pair tokens
export async function findPairInfo (pair) {
    const con = contract(pair, 'swaps');
    const res = await Promise.all([Promise.all([con.token0(), con.token1()]), con.getReserves()]);
    res[0] = res[0].map(token => token.toLowerCase(token));
    return res;
};

export async function findPairAddress (router, token0, token1) {
    const con = contract(router, 'swaps');
    const [factory, pair0] = await Promise.all([con.factory(), con.allPairs(0)]);
    const codehash = ethers.utils.keccak256(await getProvider().getCode(pair0)) ??
        '0x96e8ac4277198ff8b6f785478aa9a39f403cb768dd02cbee326c3e7da348845f'
    return '0x' + ethers.utils.keccak256(
        '0xff' +
        factory.slice(2) +
        ethers.utils.keccak256(token0.slice(2) + token1.slice(2)) +
        codehash.slice(2)
    ).slice(24 + 2);
};

/**
 * find contract definition (onchain)
 * @param {address} target
 * @param {string} action
 * @param {Object} maps
 * @returns {Object}
 */
export async function findContract (target, action = '', maps = {}) {
    //const findAbis = (match) => Object.keys(ABIS).filter((e) => e.match(new RegExp(match))).map(e => ABIS[e]);
    //const con = contract(address, findAbis(type).reduce((o, e) => o.concat(e), []));
    const key = target+'_'+maps.token;
    let def = await functions(action), fetchs = {}, detect, index, errmsg;
    if (def && def.length) {
        if (state.config.findCache && (detect = state.cache.def[key])) {
            debug('cached', key, detect.title);
            return detect;
        }
        try {
            // only parallel detections, only valid method checks
            const checks = def.reduce(
                (arr, app) => arr.concat(
                    (app.detect.length ? app.detect : [app.detect]).map((detect, i) => new Promise((resolve, reject) =>
                        detect.get(maps, target, true).then(
                            (ret) => (ret == null) ? reject('') : resolve([app, ret, i])
                        ))
                    ))
            , []);
            // find fallback definitions
            [def, detect, index] = await Promise.any(checks);
            (def.ref instanceof Function) && (def = await def.ref({ ...maps, target }, index));
            // fetch designated tokens
            await Promise.all(
                Object.entries(def.fetchs).map(async ([name, view]) => {
                    //name.endsWith('token') || (name += 'token');
                    if (view = await Promise.any(
                        (view.length ? view : [view])
                        .map(view => view && view.get && view.get(maps, def.target ?? target))
                    )) {
                        fetchs[name] = view.toLowerCase();
                    }
                })
            );
            debug('find', key, def.title, str(fetchs));
            maps.detect = detect;
            return (state.cache.def[key] = { ...def, ...fetchs, detect });
        } catch (err) {
            errmsg = err.stack;
        }
        //if (!con[detect.method]) throw Error('Method not in ABI');
        //if (err.code != 'UNPREDICTABLE_GAS_LIMIT') console.error(detect, err.code);
    }
    // straight to console
    errmsg = `No ${action} matched for ${key} (${errmsg})`;
    debug('!find', errmsg) && console.error(errmsg);
    return null;
};

// aliases
const ts = () => Math.round(Date.now()/1000);
const A0 = ethers.constants.AddressZero;
const AE = '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee';
const invalidAddresses = [A0, AE, '']; // undefined
const toBN = ethers.BigNumber.from;
const isBN = ethers.BigNumber.isBigNumber;
const toPow = (n) => toBN(10).pow(n);
//const fmUnits = ethers.utils.formatUnits;
//const abiEncode = ethers.utils.defaultAbiCoder.encode;
const str = (a) => a.length ?
    '[' + a.map(e => e.toString()).join(', ') + ']' :
    (a instanceof Object ? str(Object.values(a)) : a.toString());

// Parse amount
const parseAmount = async (amount, token = null) => ethers.BigNumber.isBigNumber(amount) ? amount : ethers.utils.parseUnits('' + amount, ethers.utils.isAddress(token) ? await getDecimals(token) : 18);

export { ts, invalidAddresses, toBN, isBN, parseAmount, toPow, str };

// stateful getters

//
const getDecimals = (address) => invalidAddresses.includes(address) ? 18 : getToken(address)?.decimals ?? contract(address).decimals();

//
const getABI = (name) => config.abis[name] ?? [];

//
const getChain = (id = state.chainId) => config.chains.filter(chain => chain.chainId == id).pop();

//
const getAddress = (name = 'aggregator', id = state.chainId) => config.addresses[id][name] ?? '';

//
const getToken = (address = A0, cacheOnly = false, id = state.chainId) =>
    config.tokens[address.toLowerCase()] ?? null;
    // (!cacheOnly || debug('tokens', 'unknown = ' + address)

/**
 * Return, cache provider and fixes
 * @param {number=} id
 * @returns {ethers.providers.Provider}
 */
const getProvider = (id = state.chainId) =>
    state.cache.provider[id] ?? (()=>{
        const network = ethers.providers.getNetwork(id) ?? {
            chainId: id,
            name: getChain(id).shortName,
            ensAddress: null
        };
        //
        const provider = new ethers.providers[
            getChain(id).rpc[0].startsWith('wss:') ? 'WebSocketProvider' : 'JsonRpcBatchProvider'
        ]({
            url: getChain(id).rpc[0],
            timeout: (state.timeout?.network ?? 20) * 1000,
            allowGzip: true
        }, network);
        // weird ethers.js bug make detectNetwork always null
        provider._cache['detectNetwork'] = network;
        return (state.cache.provider[id] = provider);
    })();

/**
 * Get signer
 * @param {number|string} id
 * @returns {ethers.Wallet}
 */
const getSigner = (a, id = state.chainId) => new ethers[ethers.utils.isAddress(a) ? 'VoidSigner' : 'Wallet'](a ?? '0'.repeat(63) + '1', getProvider(id));

/**
 * Get transaction simulation/backtracing API instance
 * @param {Object} maps
 * @param {number} id
 */
 const getScanApi = (maps = {}, id = state.chainId) => {
    // 'module=contract&action=getsourcecode&address='
    const chain = getChain(id);
    return axios({
        url: `${chain.explorer?.api_url}?apikey=${chain.explorer?.api_key}` +
            Object.entries(maps).reduce((o, [name, val]) => o+name+'='+val+'&', '&'),
        method: 'get',
        headers: {}
    });
};

/**
 * Get transaction simulation/backtracing API instance
 * @param {Object} maps
 */
const getSimulateApi = (maps = {}) => {
    const A0 = invalidAddresses[0];
    const env = {
        ENDPOINT: 'https://api.tenderly.co/api/v1',
        USER: '0x',
        PROJECT: ''
    };
    const data = {
        // standard TX fields
        "network_id": "1",
        "from": maps.account ?? A0,
        "to": maps.address ?? A0,
        "input": maps.data ?? '0x',
        "gas": maps.gas ?? state.view.options.gasLimit,
        "gas_price": "1",
        "value": 0,
        // simulation config (tenderly specific)
        "save_if_fails": true,
        "save": false,
        "simulation_type": "quick"
    };
    return axios.bind(null, {
        url: `${env.ENDPOINT}/account/${env.USER}/project/${env.PROJECT}/simulate`,
        method: 'post',
        headers: {
            'X-Access-Key': env.KEY ?? '',
            'Content-Type': 'application/json'
        },
        data
    });
};

export { getABI, getChain, getAddress, getToken, getProvider, getSigner, getScanApi, getDecimals };

// serilized types
const types ={
    'bignumber': ethers.BigNumber,
    //'call': Call,
    //'view': View,
    //'check': Check
};

/**
 * Simple object cache
 * @param {Function} get
 * @param {prototype} type
 * @param {string} name
 * @param {number} expire
 * @returns
 */
const cached = async function (get = ()=>null, type = Object.prototype, name = get.name, expire = 7200) {
    const { cache } = state;
    if (!name) name = get.toString();
    if (name == get.name) name += '()';
    if (cache.user[name] && cache.ts[name] && (ts() - cache.ts[name]) <= expire) {
        return cache.user[name];
    }
    const value = await get();
    cache.user[name] = value;
    cache.ts[name] = ts();
    // only if value is usable
    if (value && type) {
        Object.setPrototypeOf(value, (typeof type === 'string') ? types[type].prototype : type );
    }
    return value;
}

export { types, cached };

// debug print

// general debugging
export function debug () {
    (typeof arguments[0] === 'string') && (arguments[0] += ':');
    state.logs.push([Date.now(), JSON.stringify(arguments)]);
    if (state.config.debug) {
        console.error.apply(console, arguments);
        return arguments;
    }
};

// debug run duration
export async function rans (get = () => null) {
    const ms = Date.now();
    const res = await get();
    debug(get.name ?? 'ran', (Date.now()-ms) + 'ms');
    return res;
};

// json helper
export function serialize (obj) {
    return JSON.stringify(obj, (key, value) => key.startsWith('_') ? undefined : value, "\t");
};

//
const slippage = function (name, auto = false) {
    const n = state.slippage[name] ?? 0.0001;
    return state.config.autoSlippage ? n * (1.0 - state.slippage['autoAdj']) : n;
}

// subtract slippage by config name or percentage
export function subSlippage(num, pn = 0.0, auto = false) {
    return toBN(num)
        .mul(parseInt((1.0 - (isNaN(pn) ? slippage(pn, auto) : pn)) * 1e4))
        .div(1e4);
};

//export function cutAmount (num, pct = 0.0) { return toBN(num).mul(toBN(parseInt((1.0 - pct) * 10000))).div(toBN(10).pow(4)) };

// Calculate LP balance
export async function lpAmount (pair, amounts, auto = false) {
    debug('lpa', pair, amounts.join());
    const min = (a, b) => a.gt(b) ? b : a;
    const con = contract(pair, 'swaps');
    const [ts, reserves] = await Promise.all([con.totalSupply(), con.getReserves()]);
    return subSlippage(
        min(
            amounts[0].mul(ts).div(reserves[0]),
            amounts[1].mul(ts).div(reserves[1])
        ),
        slippage('mintlps') ?? slippage('providinglps', auto)
    );
};

//
export async function getPrice (token, tofloat = true, chain = state.chainId) {
    const endpoint = state.config.priceAPI.base;
    const platform = state.config.priceAPI.platform[chain];
    const to = state.config.priceAPI.to;
    const fbprice = state.cache.prices[''];
    try {
        // [(endpoint + '/asset_platforms'), (endpoint + '/coins/list')]
        const res = (await axios(
            (!token || token == A0) ?
            endpoint + `/simple/price?vs_currencies=${to}&ids=${platform[1]}` :
            endpoint + `/simple/token_price/${platform[0]}?vs_currencies=${to}&contract_addresses=${token}`,
            { responseType: 'json' }
        )).data;
        let price = Object.values(res)[0]?.[to] ?? fbprice;
        !tofloat && (price = ethers.utils.parseUnits('' + price, 8));
        debug('price', token, price);
        return price;
        // (await Promise.all(usds.concat([weth]).map(address => con.getPair(token, address)))).filter(address => address != A0);
    } catch (err) {
        debug('!price', token, err.message);
    }
    return state.cache.prices[token] ?? fbprice;
};

export { ethers };
