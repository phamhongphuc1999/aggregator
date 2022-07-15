import { serialize } from './helpers.js';

Promise.all([import('./strategyen.js'), import('fs')]).then(([{process, processError}, fs]) => {
    process(
        JSON.parse(fs.readFileSync('test.json'))
    ).then(
        (res) => {
            console.log(serialize(res));
            processError(JSON.parse(fs.readFileSync('error.json')), res.calls[1]).then(console.error);
        }
    ).catch(
        (err) => console.error('---> error:', err.message, err.stack)
    );
});
