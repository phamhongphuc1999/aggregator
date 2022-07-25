import { Call, Check, View } from '../common.js';

/**
 * Abstract app specific function call definitions
 */

const aggregate = {
    call: new Call(null, 'aggregate((address,bytes,uint256)[],((address,bytes,uint256),uint8,uint256,uint16)[],(address,uint256)[],(address,uint256)[])', ['__calls__', '__checks__', '__ins__', '__outs__'], '__eth__', { title: 'Execute Aggregated Calls', params: [] }),
    any: new View('any((address,bytes,uint256)[])', ['__calls__'], 'uint256,bytes,uint16', 1)
};

const swaps = {
    call: new Call(null, 'swapExactTokensForTokens(uint256,uint256,address[],address,uint256)', ['__amount__', '__oamount__', '__path__', '__ts__'], '0', { title: 'Universal token swap', params: ['Amount In', 'Amount Out Min', 'Swap Path', 'Receiver', 'Deadline'] }, new Check(
        new View()
    )),
    auto: new Call(null, 'swap(uint256,uint256,address,bytes)', [], '0', { title: 'Automatic swap', params: ['Amount 0 Out', 'Amount 1 Out', 'Receiver', 'Data'] }, new Check(
        new View()
    )),
    call2e: new Call(null, 'swapExactTokensForETH(uint256,uint256,address[],address,uint256)', [], '0', { title: 'Shortcut to swap tokens to native', params: ['Amount In', 'Amount Out Min', 'Swap Path', 'Receiver', 'Deadline'] }, new Check(
        new View()
    )),
    calle2: new Call(null, 'swapETHForExactTokens(uint256,address[],address,uint256)', [], '__amount__', { title: 'Shortcut to swap native to tokens', params: ['Amount Out', 'Swap Path', 'Receiver', 'Deadline'] }, new Check(
        new View()
    ))
};

const providinglps = {
    call: new Call(null, 'addLiquidity(address,address,uint256,uint256,uint256,uint256,address,uint256)', ['__token__', '__otoken__', '__amount__', '__amount1__', '__amount__', '__amount1__', '__account__', '__ts__'], '0', { title: 'Add liquidity', params: ['Token A', 'Token B', 'Amount A Desired', 'Amount B Desired', 'Amount A Min', 'Amount B Min', 'Receiver', 'Deadline'] }, new Check(
        new View()
    )),
    auto: new Call(null, 'mint(address)', [], '0', { title: 'Automatic add liquidity', params: ['Receiver'] }, new Check(
        new View()
    ))
};

import lendings from './lendings.js';
import vaults from './vaults.js';

export default {
    aggregate,
    swaps,
    providinglps,
    lendings,
    vaults
};
