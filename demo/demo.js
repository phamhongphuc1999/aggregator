'use strict';

import { ethers } from 'https://cdnjs.cloudflare.com/ajax/libs/ethers/5.5.4/ethers.esm.js';
import { default as data } from './testData.json?v=111' assert {type: 'json'};
import { default as data1 } from './testData1.json?v=111' assert {type: 'json'};

const state = {
    explorer: data.explorer,
    account: ethers.constants.AddressZero,
    provider: null
};

function printAddress (addr) {
    addr = (addr || ethers.constants.AddressZero).toLowerCase();
	let ret = addr.slice(0,6) + '...' + addr.slice(-4);
	return `<a target="_blank" href="${state.explorer}/address/${addr}">${ret}</a>`;
}

function printRows(rows) {
    return rows.map(e => `<tr><td>${e.join('</td><td>')}</td></tr>`).join('');
}

function getParams(params) {
    return params.map(e => {
        e = e.value || e;
        if (e.replace) e = e.replace('__ACCOUNT__', state.account);
        return e;
    });
}

function printParams(params) {
    return '<ol><li>' + getParams(params).join('</li><li>') + '</li></ol>';
}

function printErr(err) {
    alert(`Failed: ${err.message} - ${err.code}`);
    window.last_err = err;
}

function data_call(call) {
    return `data-call='${JSON.stringify([call.target, call.method, getParams(call.params), call.eth || '0'])}'`;
}

function trimMethod(str) {
    str = str.trim();
    return str.slice(0, str.indexOf('('));
}

const EXPECTINGS = [
    'PASS',
    'EQUAL',
    'INCREASE',
    'DECREASE',
    'MORETHAN'
];

function compileA(auto) {
    const getCall = (call) => {
        const func = trimMethod(call.method);
        const abi = new ethers.utils.Interface([ 'function ' + call.method ]);
        const data = abi.encodeFunctionData(func, getParams(call.params));
        return [call.target, data, (call.value && call.value != '0') ? ethers.BigNumber.from(call.value) : '0'];
    }
    const params = {
        calls: [],
        expects: [],
        tins: [],
        touts: []
    };
    if (auto.approval && auto.approval.in) {
        params.tins.push([auto.approval.asset, auto.approval.value]);
    }
    for (const call of data.calls) {
        //const func = ethers.utils.id(trimMethod(call.method)).slice(0, 10), data = ethers.utils.defaultAbiCoder.encode()
        //console.log('call:', call);
        params.calls.push(getCall(call));
    }
    const call = data.calls[data.calls.length - 1];
    if (call.expect) {
        params.expects.push([getCall(call.expect), EXPECTINGS.indexOf(call.expect.expect), call.expect.vpos, call.expect.value]);
    }
    return {
        target: auto.target,
        method: auto.method,
        params: Object.values(params)
    };
}

function renderM(calls, id) {
    let html = `
    `;
    let count = 0;

    const renderCall = (call) => `
    <div>
        <table class="table table-bordered card-text mb-2">
        <tr><th colspan="3">Step ${++count}</th></tr>
        ${printRows([['Interact', printAddress(call.target), call.targetName], ['Call', call.method, printParams(call.params)]])}
        <tr><td colspan="3"><a id="${id+count}" target="_blank" onclick="call(this)" data-next="${id+(count+1)}" ${data_call(call)} class="btn btn-danger ${count == 1 ? '' : 'disabled'}">Execute</a></td></tr>
        </table>
    </div>
    `;
    const renderExpect = (expect) => `
    <div>
        <table class="table table-bordered card-text mb-2">
        <tr><th colspan="3">Step ${++count}: Check</th></tr>
        ${printRows([['Interact', printAddress(expect.target), expect.targetName], ['View', expect.method, printParams(expect.params)], ['Expect', expect.expect, expect.value]])}
        <tr><td colspan="3"><a id="${id+'check'}" onclick="check(this, '${expect.expect}', ${expect.vpos}, '${expect.value}')" ${data_call(expect)} class="btn btn-primary ${count == 1 ? '' : 'disabled'}">Check</a></td></tr>
        </table>
    </div>
    `;
    for (const call of calls) {
        html += renderCall(call);
    }
    const call = calls[calls.length-1];
    if (call && call.expect) {
        html += renderExpect(call.expect);
    }
    document.getElementById(id).innerHTML = html;
    document.getElementById(id + '_title').innerHTML += data.description;
}

function renderA(auto, id) {
    let html = '';
    const eid = id+'e';
    const call = compileA(auto);

    if (auto.approval) {
        const approve = {
            target: auto.approval.asset,
            method: 'approve(address,uint256)',
            params: [ auto.target, auto.approval.value ]
        }
        html = `<div>
            <table class="table table-bordered card-text">
            <tr><td>Amount</td><td>${auto.approval.valueDisplay}</td></tr>
            <tr><td colspan="2"><a onclick="call(this)" target="_blank" ${data_call(approve)} data-next="${eid}" class="btn btn-warning">Approve</a></td></tr>
            </table>
        </div>`;
    }

    console.log(call.params);

    html += `<div>
        <table class="table table-bordered card-text">
        <tr><td>You get</td><td>${ethers.utils.formatEther(auto.calls[auto.calls.length - 1].expect.value)}</td></tr>
        <tr><td colspan="2"><a onclick="call(this)" id="${eid}" target="_blank" ${data_call(call)} class="btn btn-danger ${auto.approval ? 'disabled' : ''}">Execute</a></td></tr>
        </table>
    </div>`;
    document.getElementById(id).innerHTML = html;
    document.getElementById(id + '_title').innerHTML += data.description;
}

window.call = async function (e) {
    try {
        const [[ address, method, params, value ], next] = [$(e).data('call'), $(e).data('next')];
        const func = trimMethod(method);
        const opts = {};
        let methodtext  = 'function ' + method;
        if (value && value != '0') {
            methodtext += ' payable';
            opts.value = value;
        }

        const contract = new ethers.Contract(address, [ methodtext ], await state.provider.getSigner());
        let tx;
        try {
            tx = await contract[func].apply(contract, params.concat([opts]));
        } catch (err) {
            if (err.code == -32603 && confirm('Estimate gas fails, still continue?')) {
                opts.gasLimit = 10000000;
                tx = await contract[func].apply(contract, params.concat([opts]));
            }
            throw err;
        }

        e.innerHTML = tx.hash;
        e.href = state.explorer+'/tx/'+tx.hash;
        e.removeAttribute('onclick');

        const rc = await tx.wait();
        $(e).addClass('disabled') && $('#'+next).removeClass('disabled');
        e.innerHTML = 'Succeed';
    } catch (err) {
        printErr(err);
    }
};

window.check = async function (e, expect, vpos, value) {
    try {
        const [ address, method, params ] = $(e).data('call');
        const contract = new ethers.Contract(address, [ 'function ' + method ], await state.provider);
    } catch (err) {
        printErr(err);
    }
};

window.debugEn = function () {
    $('.disabled').removeClass('disabled');
    $('[data-call]').each((i, e) => {
        e.innerHTML += `<pre>${JSON.stringify($(e).data('call'), null, 2)}</pre>`;
    });
};

window.ethereum.isMetaMask || alert('Metamask is required!');

window.ethereum.request({method:'eth_requestAccounts'}).then((accounts) => {
    state.account = accounts[0];
    state.provider = new ethers.providers.Web3Provider(window.ethereum);

    renderM(data.calls, '10');
    if (!data.auto.calls) data.auto.calls = data.calls;
    renderA(data.auto, '11');

    renderM(data1.calls, '20');
    if (!data1.auto.calls) data1.auto.calls = data1.calls;
    renderA(data1.auto, '21');

}).catch(printErr);
