import { Call, Check, View, getBalanceView, transfer } from '../common.js';

/**
 * Abstract app specific function call definitions
 */

const tokenOutCheck = new Check(
    getBalanceView('__account__', '__otoken__'),
    View.MORETHAN,
    '__oamount__'
);

const aggregate = {
    //
    url: 'https://github.com/TravaDataAnalysis/strategy-interface',
    title: 'Defi Aggregator',
    call: new Call('__target__', 'aggregate((address,bytes,uint256)[],((address,bytes,uint256),uint8,uint256,uint16)[],(address,uint256)[])', ['__calls__', '__expects__', '__ins__'], '__eth__', { title: 'Execute Aggregated Calls', params: [], returns: 'uint256 block,bytes[] memory results', gas: null }),
    any: new View('any((address,bytes,uint256)[])', ['__calls__'], 'uint256,bytes,uint16', 1),
    delegate: 'transfer'
};

// Uniswap V2
const swaps = {
    // call on router
    //calls: [ approve() ],
    url: 'https://github.com/Uniswap/v2-core',
    title: 'Uniswap compatible',

    call: new Call(null, 'swapExactTokensForTokens(uint256,uint256,address[],address,uint256)', ['__amount__', '__oamount__', '__path__', '__account__', '__ts__'], '0', { title: 'Universal token swap', params: ['Amount In', 'Amount Out Min', 'Swap Path', 'Receiver', 'Deadline'], editable: 1, gas: '135000' }, tokenOutCheck),

    // direct optimized calls
    auto: [
        transfer('__itoken__', '__target__', '__iamount__'),
        new Call(null, 'swap(uint256,uint256,address,bytes)', ['__amounts.0__', '__amounts.1__', '__account__', '0x'], '0', { title: 'Automatic swap', params: ['Amount 0 Out', 'Amount 1 Out', 'Receiver', 'Data'], gas: '87500' }, tokenOutCheck)
    ],

    call2e: new Call(null, 'swapExactTokensForETH(uint256,uint256,address[],address,uint256)', ['__amount__', '__oamount__', '__path__', '__account__', '__ts__'], '0', { title: 'Shortcut to swap tokens to native', params: ['Amount In', 'Amount Out Min', 'Swap Path', 'Receiver', 'Deadline'], gas: '122000' }, new Check(
        new View('balance(address)', [ '__account__' ], ['uint256'], -1, '__aggregator__'),
        View.MORETHAN,
        '__oamount__'
    )),

    calle2: new Call(null, 'swapETHForExactTokens(uint256,address[],address,uint256)', ['__oamount__', '__path__', '__account__', '__ts__'], '__amount__', { title: 'Shortcut to swap native to tokens', params: ['Amount Out', 'Swap Path', 'Receiver', 'Deadline'], gas: '124000' }, tokenOutCheck),

    delegate: 'transfer'
};

const providinglps = {
    //
    url: 'https://github.com/Uniswap/v2-periphery',
    title: 'Uniswap compatible',

    call: new Call(null, 'addLiquidity(address,address,uint256,uint256,uint256,uint256,address,uint256)', ['__tokens.0__', '__tokens.1__', '__amounts.0__', '__amounts.1__', '__minamounts.0__', '__minamounts.1__', '__account__', '__ts__'], '0', { title: 'Add liquidity', params: ['Token A', 'Token B', 'Amount A Desired', 'Amount B Desired', 'Amount A Min', 'Amount B Min', 'Receiver', 'Deadline'], editable: [4, 5], gas: '176000' }, tokenOutCheck),

    calle: new Call(null, 'addLiquidityETH(address,uint256,uint256,uint256,address,uint256)', ['__tokens.1__', '__amounts.1__', '__minamounts.1__', '__minamounts.0__', '__account__', '__ts__'], '__amounts.0__', { title: 'Add liquidity (native)', params: ['Token address', 'Amount token Desired', 'Amount token Min', 'Amount native Min', 'Receiver', 'Deadline'], editable: [4, 5], gas: '185000' }, tokenOutCheck),

    // direct optimized calls
    auto: [
        transfer('__tokens.0__', '__target__', '__amounts.0__'),
        transfer('__tokens.1__', '__target__', '__amounts.1__'),
        new Call(null, 'mint(address)', ['__account__'], '0', { title: 'Automatic add liquidity', params: ['Receiver'], gas: '98000' }, tokenOutCheck)
    ],

    create: new Call(null, 'createPair(address,address)', ['__tokens.0__', '__tokens.1__'], '0', { title: 'Create liquidity pair', params: ['Token A', 'Token B'], gas: '60000' }, new Check(
        new View('getPair(address,address)', ['__tokens.0__', '__tokens.1__']),
        View.NOTEQUAL,
        '0x0000000000000000000000000000000000000000'
    )),

    delegate: 'transfer'
};

//const weth = getAddress('token.eth');
const wraps = {
    //
    url: 'https://github.com/tomochain/dex-smart-contract/blob/master/contracts/utils/WETH.sol',
    title: 'Wrapped ETH',

    call: new Call(null, '', [], '__amount__', { title: 'Wrap native token', gas: '56500' }, new Check(
        getBalanceView('__account__', '__target__'),
        View.INCREASE,
        '__amount__'
    )),

    unwrap: new Call(null, 'burn(uint256)', ['__amount__'], '0', { title: 'Unwrap native token', params: ['Amount'], gas: '48000' }, new Check(
        getBalanceView('__account__', '__target__'),
        View.DECREASE,
        '__amount__'
    )),

    delegate: 'transfer'
};

import lendings from './lendings.js';
import vaults from './vaults.js';
//import miscs from './miscs.js';

export default {
    aggregate,
    swaps,
    providinglps,
    wraps,
    lendings,
    borrows: lendings,
    vaults
};
