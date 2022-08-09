(require.main === module) && (async () => {
    const accounts = ['0x70D86bF17B30D268285eCFD204F83522797bad6C', '0x871dbce2b9923a35716e7e83ee402b535298538e']
    const amounts = ['200', '1000'];
    const args = process.argv.slice(2);
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
    const aids = {};
    const tests = Object.entries(
        JSON.parse(readFileSync('cache/testIds.json'))
    ).forEach(([token, obj]) =>
        Object.entries(obj).forEach(([steps, id]) =>
            [!aids[steps] && (aids[steps] = []), aids[steps].push.apply(aids[steps], id)]
        )
    );
    for (const ids of Object.values(args[0] ? [aids[args[0]]] : aids)) {
        const results = await Promise.all(
            ids.map((id, index) => test(id, accounts[0], amounts[0], false)
        ));
        console.log(results);
    }
})();
