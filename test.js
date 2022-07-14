import { serialize } from './helpers.js';

Promise.all([import('./strategyen.js'), import('fs')]).then(([{process, processError}, fs]) => {
    process(
        JSON.parse(fs.readFileSync('test.json'))
    ).then(
        (res) => console.log(serialize(res))
    ).catch(
        (err) => console.error('---> error:', err.message, err.stack)
    );
    processError(
        JSON.parse(fs.readFileSync('error.json'))
    ).then(console.error);
});
