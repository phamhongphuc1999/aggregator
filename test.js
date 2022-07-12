import fs from 'fs';
import { serialize } from './helpers.js';

import('./strategyen.js').then((strategygen) => {
	const test = JSON.parse(fs.readFileSync('test.json'));
	strategygen.process(test).then(
		(res) => console.log(
			serialize(res)
		)
	).catch(
		(err) => console.error(
			'---> error:',
			err.message,
			err.stack
		)
	);
})
