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

##
# Unneccessary long
env node << EOM
(async() => {
	console.error('\t tokens gen');
	//
	const useArray = false;
	const file = './tokens.json';
	const api_url = 'https://scoringapi.trava.finance/aggregator/strategies/tokens';
	//
	const lib = await import('./strategyen.js');
	const [axios, ethers, fs] = [require('axios'), require('ethers'), require('fs')];
	const con = lib.helpers.contract();
	const arr = []; // fs.existsSync(file) ? require(file) : []
	//
	let obj = (await axios.get(api_url)).data;
	let i = 0;
	Object.keys(obj).forEach(kind => [].push.apply(arr, obj[kind].map(
		info => Object.assign(info, { internal: kind.startsWith('internal') }))
	));
	//
	let img_prefix = arr[0].img_url.slice(0, arr[0].img_url.indexOf('/tokens'));
	obj = { '': { img_prefix, chainId: lib.state.chainId } };
	//
	const infos = await Promise.all(arr.map((info, i) =>
		ethers.utils.isAddress(info.address) ?
			(i=con.attach(info.address)) && Promise.all([i.name(), i.symbol(), i.decimals()]) :
			['Native token', 'ETH', 18]
	));
	//
	arr.forEach(info => {
		const address = (info.address ?? ethers.constants.AddressZero).toLowerCase();
		delete info.address;
		[info.name, info.decimals, info.img_url] = [infos[i][0], infos[i][2], info.img_url.replace(img_prefix, '')];
		obj[address] = useArray ? Object.values(info) : info;
		process.stderr.write('\r'+(++i)+'/'+arr.length);
	});
	//
	obj[ethers.constants.AddressZero] = obj['0x'];
	obj[''].keys = Object.keys(arr[0]);
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
	const excludes = ['test','a','tsconfig','all'];
	const names = [];
	//
	let code = "export default {\n";
	for (const file of files) {
		const name = file.split('.')[0];
		if (!excludes.includes(name)) {
			//code += 'import { default as '+name+' } from "'+'./'+file+'"'+"\n";
			code += name+': Object.freeze('+fs.readFileSync(file)+"),\n";
			names.push(name);
		}
	}
	//
	code += "}\n";
	console.error(names);
	console.error(save+':', code.length);
	fs.writeFileSync(save, code);
EOM

exit 0
