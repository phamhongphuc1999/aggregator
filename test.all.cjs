#!/usr/bin/env node

/**
 * Test multiple strategies
*/

module.exports = async function (args, infile, params = null) {
    const accounts = ['0x68a6c841040B05D60434d81000f523Bf6355b31D', '0x70D86bF17B30D268285eCFD204F83522797bad6C', '0x871dbce2b9923a35716e7e83ee402b535298538e']
    const amounts = ['1', '2', '3'];
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
        by = { both: ids, step: {}, token: {}, all: [], tokens: Object.keys(ids) };
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
    const calls = (() => {
            // object array filter function
            const margs = args.filter(e => !e.startsWith('-'));
            if (margs.length >= 2) {
                return by.both[ margs[0] ][ by.tokens[ margs[1] ] ];
            } else if (margs.length >= 1) {
                return Object.values((margs[0].startsWith('0x') ? by.token[margs[0]] : by.step[margs[0]]) ?? {});
            }
            return by.all;
        })()
        .map(id =>
            [id, account, amounts[ Math.floor(Math.random() * amounts.length) ]].concat(params ? [ params ] : [])
        );
    //
    const results = [];
    if (args.includes('-s')) {
        // sequential
        console.error('[sequential]');
        for (const c of calls) results.push(await test.apply(this, c));
    } else {
        const a = args.includes('-a');
        // reduced parallel aka. multiprocessing
        const cpus = a ? calls.length : require('os').cpus().length;
        console.error('[multiprocessing]', calls.length, `[${cpus}]`);
        //
        while (calls.length) {
            [].push.apply(results, await Promise.all(calls.splice(0, cpus).map(c => test.apply(this, c))));
        }
    }
    // print all result
    if (false) {
        console.log('[', results.join(",\n\n"), ']');
    }
    //
    return results;
};

(require.main === module) && module.exports(process.argv.slice(2), 'cache/testIds.json');

