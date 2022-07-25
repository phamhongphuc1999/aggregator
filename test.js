import { serialize } from './helpers.js';

Promise.all([import('./strategyen.js'), import('fs')]).then(([{process, processError}, fs]) => {
    process(
        JSON.parse(fs.readFileSync('cache/test.json')),
        {},
        false
    ).then(
        (res) => {
            console.log(serialize(res));
            processError(JSON.parse(fs.readFileSync('cache/error.json')), res.calls[1]).then(console.error);
        }
    ).catch(
        (err) => console.error('---> error:', err.stack, serialize(err))
    );
});
