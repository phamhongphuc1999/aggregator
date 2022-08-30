/**
 * Test multiple strategies
*/

async function test_all (args = process.argv.slice(2), infile = 'cache/testIda.json') {
    const accounts = ['0x68a6c841040B05D60434d81000f523Bf6355b31D', '0x70D86bF17B30D268285eCFD204F83522797bad6C', '0x871dbce2b9923a35716e7e83ee402b535298538e']
    const amounts = ['1', '2', '3'];
    const params = { autoonly: true };
    // config
    //const where = ['./cache', 'strategy.', '.json'];
    //const queues = [];
    //const maps = {};
    //await Promise.all(readdirSync(where[0]).filter(file => file.startsWith(where[1]) && file.endsWith(where[2]))
    //const data = JSON.parse(readFileSync([where[0], file].join('/')));
    //const files = readdirSync('cache').filter(e => e.endsWith('.json'));
    //
    const
        account = accounts[0],
        { readFileSync, readdirSync } = require('fs'),
        test = require('./test.cjs'),
        ids = JSON.parse(readFileSync(infile)),
        by = { step: {}, token: {}, all: [], tokens: Object.keys(ids) };
    // AOP
    Object.entries(ids).forEach(([t, obj]) =>
        Object.entries(obj).forEach(([n, ids]) => {
            // destructuring for filter by args
            by.step[n] = (by.step[n] ?? []).concat(ids);
            by.token[t] = (by.token[t] ?? []).concat(ids);
            [].push.apply(by.all, ids);
        })
    );
    // parallel processing may stress provider
    const funcs = (() => {
            // object array filter function
            const margs = args.filter(e => !e.startsWith('-'));
            if (margs.length >= 2) {
                return ids[ margs[0] ][ by.tokens[ margs[1] ] ];
            } else if (margs.length >= 1) {
                return Object.values(margs[0].startsWith('0x') ? by.token[margs[0]] : by.step[margs[0]]);
            }
            return by.all;
        })()
        .map(id => test.bind(this, id, account, amounts[ Math.floor(Math.random() * amounts.length) ]));
    //
    const results = [];
    if (args.find(e => e == '-s')) {
        // sequential
        console.error('[sequential]');
        for (const f of funcs) arr.push(await f());
    } else {
        // reduced parallel aka. multiprocessing
        const p = args.find(e => e == '-p');
        const cpus = p ? 8 : funcs.length;
        console.error('[multiprocessing]', `[${cpus}]`);
        //
        while (funcs.length) {
            [].push.apply(results, await Promise.all(funcs.splice(0, cpus).map(e => e())));
        }
    }
    // print all result
    console.log('[');
    console.log(funcs.join(",\n\n\n\n"));
    console.log(']');
};

(require.main === module) && test_all();

