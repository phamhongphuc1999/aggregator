import * as ethers from 'ethers';
import state from './state.js';
import config from './config.js';
import funcs from './actions/funcs.js';

/**
 * Helper functions
 *
 * @typedef {address} string
 * @typedef {ethers.BigNumber|string} bn
 */

// Get contract instance
export function contract (address, abi = 'token') {
    return new ethers.Contract(address, (typeof abi == 'string') ? getABI(abi) : abi, getProvider())
};

/**
 * Return first valid swap path and expected out amounts
 * @param {address} router
 * @param {address} from
 * @param {address} to
 * @param {bn=} amount
 * @param {boolean=} final
 * @returns [path, amounts]
 */
export function findSwapPath (router, from, to, amount = toBN(0), final = true) {
    const con = contract(router, 'swaps');
    const tokens = [getAddress('token.usd'), getAddress('token.eth')];
    const fnpath = [tokens[0][0], tokens[1]];
    // try: direct, via weth, via usds, via mix of both (ordered)
    const paths = [[], [tokens[1]], ...tokens[0].map(e => [e]), fnpath, fnpath.reverse() ].map(path => [from, ...path, to]);
    //swapsdk.Trade.bestTradeExactIn(apairs, new swapsdk.TokenAmount(new swapsdk.Token(), maps.amount.toHexString()), new swapsdk.Token(), { maxHops: 3, maxNumResults: 1 })[0];
    return Promise.any(paths.map(async (path) => {
        const amounts = await con.getAmountsOut(amount, path);
        return [path.map(e => e.toLowerCase()), final ? amounts[amounts.length - 1] : amounts];
    }));
};

// Get pair address
export async function findSwapPair (router, token, otoken) {
    const con = contract(router, 'swaps');
    return await con.attach(
        (getAddress('swap.router') == router) ? getAddress('swap.factory') : await con.factory()
        ).getPair(token, otoken);
};

/**
 * find contract definition (onchain)
 * @param {address} target
 * @param {string} type
 * @param {Object} maps
 * @returns
 */
export async function findContract (target, type = 'vaults', maps = {}) {
    //const findAbis = (match) => Object.keys(ABIS).filter((e) => e.match(new RegExp(match))).map(e => ABIS[e]);
    //const con = contract(address, findAbis(type).reduce((o, e) => o.concat(e), []));
    const key = target+'_'+maps.token;
    let def = funcs[type], token, check, index;
    if (def && def.length) {
        if (check = state.cache.def[key]) {
            return check;
        }
        // only parallel detections, only valid method checks
        const checks = def.reduce(
            (arr, app) => {
                arr.push.apply(arr, (app.detect.length ? app.detect : [app.detect])
                    .map((detect, i) => new Promise((resolve, reject) =>
                        detect.get(maps, target).then(
                            (ret) => (ret == null) ? reject('') : resolve([app, ret, i])
                        ))
                    )
                );
                return arr;
            }
        , []);
        // find fallbackl definitions
        try {
            [def, check, index] = await Promise.any(checks);
            (def.ref instanceof Function) && (def = await def.ref(index, { ...maps, target }));
            for (token of def.token) {
                if (token && token.get) token = await token.get(maps, target);
                if (ethers.utils.isAddress(token)) break;
            }
            token = (token ?? '').toLowerCase();
        } catch (err) {
            console.error(`No ${type} matched for ${target} (${err.message})`);
            return null;
        }
        //if (!con[detect.method]) throw Error('Method not in ABI');
        //if (err.code != 'UNPREDICTABLE_GAS_LIMIT') console.error(detect, err.code);
    }
    return (state.cache.def[key] = { ...def, token, check });
};

// aliases
const ts = () => Math.round(Date.now()/1000);
const A0 = ethers.constants.AddressZero;
const AE = '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee';
const invalidAddresses = [A0, AE, '', undefined];
const toBN = ethers.BigNumber.from;
const isBN = ethers.BigNumber.isBigNumber;
//const fmUnits = ethers.utils.formatUnits;
//const abiEncode = ethers.utils.defaultAbiCoder.encode;

// Parse amount
const parseAmount = async (amount, token = null) => ethers.BigNumber.isBigNumber(amount) ? amount : ethers.utils.parseUnits('' + amount, ethers.utils.isAddress(token) ? await getDecimals(token) : 18);

export { ts, invalidAddresses, toBN, isBN, parseAmount };

// no async needed
const getDecimals = (token) => invalidAddresses ? 18 : getToken(token).decimals ?? contract(token).decimals();

export { getDecimals };

// stateful getters

//
const getABI = (name) => config.abis[name] ?? [];

//
const getChain = (id = state.chainId) => config.chains.filter(chain => chain.chainId == id).pop();

//
const getAddress = (name = 'aggregator', id = state.chainId) => config.addresses[id][name] ?? '';

//
const getToken = (address = A0) => config.tokens[address.toLowerCase()] ?? {};


/**
 * Return, cache provider and fixes
 * @param {number=} id
 * @returns ethers.providers.Provider
 */
const getProvider = (id = state.chainId) =>
    state.cache.provider[id] ?? (()=>{
        const network = ethers.providers.getNetwork(id) ?? {
            chainId: id,
            name: getChain(id).shortName,
            ensAddress: null
        };
        const provider = new ethers.providers[
            getChain(id).rpc[0].startsWith('wss:') ? 'WebSocketProvider' : 'JsonRpcBatchProvider'
        ]({
            url: getChain(id).rpc[0],
            timeout: state.timeout?.network ?? 20000,
            allowGzip: true
        }, network);
        // weird ethers.js bug make detectNetwork always null
        provider._cache['detectNetwork'] = network;
        return (state.cache.provider[id] = provider);
    })();

//
const getSigner = (id = -1) => new ethers.Wallet('a'.repeat(64), getProvider());

/**
 * Get transaction simulation/backtracing API instance
 * @param {Object} maps
 * @param {number} id
 */
 const getScanApi = (maps = {}, id = state.chainId) => {
    // 'module=contract&action=getsourcecode&address='
    const chain = getChain(id);
    return axios({
        url:
            chain.explorer?.api_url+'?apikey='+chain.explorer?.api_key+'&' +
            Object.keys(maps).reduce((o, name) => o+name+'='+maps[name]+'&', ''),
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
        ENDPOINT: 'https://api.tenderly.co/api/v1'
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
    return axios.bind(this, {
        url: `${env.ENDPOINT}/account/${env.USER}/project/${env.PROJECT}/simulate`,
        method: 'post',
        headers: {
            'X-Access-Key': env.KEY ?? '',
            'Content-Type': 'application/json'
        },
        data,
    });
};

export { getABI, getChain, getAddress, getToken, getProvider, getSigner, getScanApi };

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
const debug = function () {
    console.error.apply(console, arguments);-0
};

// debug run duration
const ran = async function (get = ()=>null) {
    const ms = Date.now();
    const res = await get();
    debug(get.name ?? 'ran', (Date.now()-ms)+'ms');
    return res;
};

export { debug };

// json helper
const serialize = (obj) => JSON.stringify(obj, (key, value) => key.startsWith('_') ? undefined : value, "\t");

export { serialize };
