import { Call, Check, Expecting, View, getBalanceView } from '../common.js';

/**
 * Abstract app specific function call definitions
 */

const tokenOutCheck = new Check(
    getBalanceView('__account__', '__otoken__'),
    Expecting.MORETHAN,
    '__oamount__'
);

const aggregate = {
    url: 'https://github.com/TravaDataAnalysis/strategy-interface',
    call: new Call('__target__', 'aggregate((address,bytes,uint256)[],((address,bytes,uint256),uint8,uint256,uint16)[],(address,uint256)[])', ['__calls__', '__checks__', '__ins__'], '__eth__', { title: 'Execute Aggregated Calls', params: [] }),
    any: new View('any((address,bytes,uint256)[])', ['__calls__'], 'uint256,bytes,uint16', 1),
    delegate: 'transfer'
};

const swaps = {
    // call on router
    //calls: [ approve() ],
    url: 'https://github.com/Uniswap/v2-core',
    call: new Call(null, 'swapExactTokensForTokens(uint256,uint256,address[],address,uint256)', ['__amount__', '__oamount__', '__path__', '__ts__'], '0', { title: 'Universal token swap', params: ['Amount In', 'Amount Out Min', 'Swap Path', 'Receiver', 'Deadline'], editable: 1 }, tokenOutCheck),
    // call on pair
    auto: new Call(null, 'swap(uint256,uint256,address,bytes)', [], '0', { title: 'Automatic swap', params: ['Amount 0 Out', 'Amount 1 Out', 'Receiver', 'Data'] }, tokenOutCheck),
    //
    create: new Call(null, 'createPair(address,address)', [], '0', { title: 'Create liquidity pair', params: ['Token A', 'Token B'] }, new Check(
        new View('getPair(address,address)', ['__token__', '__otoken__']),
        Expecting.NOTEQUAL,
        '0x0000000000000000000000000000000000000000'
    )),
    //
    call2e: new Call(null, 'swapExactTokensForETH(uint256,uint256,address[],address,uint256)', [], '0', { title: 'Shortcut to swap tokens to native', params: ['Amount In', 'Amount Out Min', 'Swap Path', 'Receiver', 'Deadline'] }, new Check(
        new View('balance(address)', [ '__account__' ], ['uint256'], -1, '__aggregator__'),
        Expecting.MORETHAN,
        '__oamount__'
    )),
    //
    calle2: new Call(null, 'swapETHForExactTokens(uint256,address[],address,uint256)', [], '__amount__', { title: 'Shortcut to swap native to tokens', params: ['Amount Out', 'Swap Path', 'Receiver', 'Deadline'] }, tokenOutCheck),
    delegate: 'transfer'
};

const providinglps = {
    url: 'https://github.com/Uniswap/v2-periphery',
    call: new Call(null, 'addLiquidity(address,address,uint256,uint256,uint256,uint256,address,uint256)', ['__token__', '__otoken__', '__amount__', '__amount1__', '__amount__', '__amount1__', '__account__', '__ts__'], '0', { title: 'Add liquidity', params: ['Token A', 'Token B', 'Amount A Desired', 'Amount B Desired', 'Amount A Min', 'Amount B Min', 'Receiver', 'Deadline'], editable: [4, 5] }, tokenOutCheck),
    auto: new Call(null, 'mint(address)', ['__account__'], '0', { title: 'Automatic add liquidity', params: ['Receiver'] }, tokenOutCheck),
    delegate: 'transfer'
};

import lendings from './lendings.js';
import vaults from './vaults.js';
import wraps from './wraps.js';
//import miscs from './miscs.js';

export default {
    aggregate,
    swaps,
    providinglps,
    lendings,
    borrows: lendings,
    vaults,
    wraps
};
