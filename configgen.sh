#!/bin/sh

#fs.statSync(file).isDirectory()
env node << EOM

console.error('\t abis gen');
const path='abis';
const obj={};
const fs=require('fs');
//
for (let file of fs.readdirSync(path)) {
    let name=file.replace('.json','') /*.split('.')*/, data=fs.readFileSync(path+'/'+file);
    console.error(name+': '+data.length);
    file=JSON.parse(data);
    obj[name]=file;
}
//
fs.writeFileSync(path + '.json', JSON.stringify(obj, null, "\t"));

EOM
##

#fs.statSync(file).isDirectory()
env node << EOM
(async()=>{
console.error('\t tokens gen');
let chainId='56';
let img_prefix='/tokens';
let file='./tokens.json';
let api_url='https://scoringapi.trava.finance/aggregator/strategies/tokens';

const fetch=require('node-fetch');
const ethers=require('ethers');
const fs=require('fs');
const abi=JSON.parse(fs.readFileSync('./abis/token.json'));
const token=new ethers.Contract(
	ethers.constants.AddressZero,
	abi,
	ethers.provider = new ethers.providers.JsonRpcBatchProvider(
		require('./chains.json').filter(e => e.chainId==chainId)[0].rpc[0]
	)
);
const arr=[];
//fs.existsSync(file) ? require(file) : []
let obj=await(await fetch(api_url)).json();
if (!Object.keys(obj).length) throw new Error('!tokens');
for (const kind in obj)
	arr.push.apply(arr, obj[kind].map(e => ({...e, internal: kind.split('_')[0] == 'internal' })));
img_prefix=arr[0].img_url.slice(0, arr[0].img_url.indexOf(img_prefix));
//
obj={
	'': { img_prefix, chainId }
};

const decimals = await Promise.all(arr.map(
	info => info.decimals ?? (ethers.utils.isAddress(info.address) ? token.attach(info.address).decimals() : 18)
))
const names = await Promise.all(arr.map(
	info => info.name ?? (ethers.utils.isAddress(info.address) ? token.attach(info.address).name() : 'Native token')
));

let i = 0;
for (const info of arr) {
	if (!ethers.utils.isAddress(info.address))
		info.address = ethers.constants.AddressZero;
	info.img = info.img_url.replace(img_prefix, '');
	info.name = names[i];
	obj[info.address] = info;
	delete info.address;
	delete info.img_url;
	process.stdout.write('\r'+(++i)+'/'+arr.length);
}
//
fs.writeFileSync(file, JSON.stringify(obj, null, "\t"));
process.exit(0);
})()
EOM
##

##
env node << EOM

console.error('\t config gen');
const fs = require('fs');
const files = fs.readdirSync('.').filter(e => e.endsWith('.json'));
const save = 'config.js';
const excludes = ['package','test','a', 'tsconfig'];

let code = '', names = [];
for (const file of files) {
	const name = file.split('.')[0];
	if (!excludes.includes(name)) {
		code += 'const '+name+' = '+fs.readFileSync(file)+";\n";
		//code += 'import { default as '+name+' } from "'+'./'+file+'"'+"\n";
		names.push(name);
	}
}

code += 'export default { '+names.join(', ')+' }'+"\n";

console.error(save+':', code.length);

fs.writeFileSync(save, code);

EOM

exit 0
