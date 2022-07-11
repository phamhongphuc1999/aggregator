import fs from 'fs';

import('./strategyen.js').then((strategygen) => {
	const test = JSON.parse(fs.readFileSync('test.json'));
	strategygen.process(test).then(
		res => console.log(JSON.stringify(res, null, "\t"))
	).catch(
		err => console.error('---> error:', err.message, err.stack)
	);
})
