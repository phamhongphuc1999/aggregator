import { View } from '../common.js';

/**
 * Abstract app specific function call definitions
 */

const aggregate = {
    call: new Call(null, 'aggregate((address,bytes,uint256)[],((address,bytes,uint256),uint8,uint256,uint16)[],(address,uint256)[],(address,uint256)[])', ['__calls__', '__checks__', '__ins__', '__outs__'], '__eth__', { title: 'Execute Aggregated Calls', params: [] }),
    any: new View('any((address,bytes,uint256)[])', ['__calls__'], 'uint256,bytes,uint16', 1)
};

const swaps = {
    call: {
        method: 'swapExactTokensForTokens(uint256,uint256,address[],address,uint256)',
        descs: { title: 'Universal Token Swap', params: ['Amount In', 'Amount Out Min', 'Path', 'Receiver', 'Deadline'] },
        check: null
    },
    auto: {
        method: 'swap(uint256,uint256,address,bytes)',
        descs: { title: 'Automatic swap', params: ['Amount 0 Out', 'Amount 1 Out', 'Receiver', 'Data'] },
        check: null
    },
    calle2: {
        method: 'swapETHForExactTokens(uint256,address[],address,uint256)',
        descs: { title: 'Shortcut to swap native to tokens', params: ['Amount Out', 'Path', 'Receiver', 'Deadline'] },
        check: null
    },
    call2e: {
        method: 'swapExactTokensForETH(uint256,uint256,address[],address,uint256)',
        descs: { title: 'Shortcut to swap tokens to native', params: ['Amount In', 'Amount Out Min', 'Path', 'Receiver', 'Deadline'] },
        check: null
    }
};

const providinglps = {
    call: {
        method: 'addLiquidity(address,address,uint256,uint256,uint256,uint256,address,uint256)',
        descs: { title: 'Add liquidity', params: ['Token A', 'Token B', 'Amount A Desired', 'Amount B Desired', 'Amount A Min', 'Amount B Min', 'Receiver', 'Deadline'] },
        check: null
    },
    auto: {
        method: 'mint(address)',
        descs: { title: 'Automatic add liquidity', params: ['Receiver'] },
        check: null
    }
};

import { Call } from '../common.js';
import lendings from './lendings.js';
import vaults from './vaults.js';

export default {
    aggregate,
    swaps,
    providinglps,
    lendings,
    vaults
};
