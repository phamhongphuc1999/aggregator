(require.main === module) && (async () => {
    const accounts = ['0x70D86bF17B30D268285eCFD204F83522797bad6C', '0x871dbce2b9923a35716e7e83ee402b535298538e']
    const amounts = ['1', '200', '1000'];
    //
    const { readFileSync, readdirSync } = require('fs');
    const test = require('./test.cjs');
    // config
    //const where = ['./cache', 'strategy.', '.json'];
    //const queues = [];
    //const maps = {};
    //await Promise.all(readdirSync(where[0]).filter(file => file.startsWith(where[1]) && file.endsWith(where[2]))
    //const data = JSON.parse(readFileSync([where[0], file].join('/')));
    //const files = readdirSync('cache').filter(e => e.endsWith('.json'));
    const ids = JSON.parse(readFileSync('cache/testIds.json'));
    const by = { step: {}, token: {}, all: [], tokens: Object.keys(ids) };
    Object.entries(ids).forEach(([t, obj]) =>
        Object.entries(obj).forEach(([n, ids]) => {
            by.step[n] = (by.step[n] ?? []).concat(ids);
            by.token[t] = (by.token[t] ?? []).concat(ids);
            [].push.apply(by.all, ids);
        })
    );
    //
    const results = await Promise.all(
        (() => {
            const args = process.argv.slice(2);
            if (args.length === 2)
                return ids[ args[0] ][ by.tokens[args[1]] ];
            else if (args.length === 1)
                return Object.values(args[0].startsWith('0x') ? by.token[args[0]] : by.step[args[0]]);
            return by.all;
        })().map((id) => test(id, accounts[0], amounts[0], false)
    ));
    console.log(results.join("\n\n\n\n"));
})();
