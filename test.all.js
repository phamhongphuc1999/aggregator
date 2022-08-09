(require.main === module) && (async () => {
    const { readFileSync, readdirSync } = await import('fs');
    const { getStrategy } = await import('./strategyen.js');
    // config
    //const where = ['./cache', 'strategy.', '.json'];
    //const queues = [];
    //const maps = {};
    //await Promise.all(readdirSync(where[0]).filter(file => file.startsWith(where[1]) && file.endsWith(where[2]))
    //const data = JSON.parse(readFileSync([where[0], file].join('/')));
    const files = readdirSync('./cache').filter(e => e.endsWith('.json'));
    const ids = {};
    const tests = Object.entries(readFileSync('./cache/tests.json')).forEach(([token, obj]) => {
        Object.entries(obj).forEach(() => {

        })
     );
    const results = await Promise.all((await Promise.all(ids
        .map(id => getStrategy(id)))
        .map(async (strategy, index) => {
            console.log(strategy);
        }
    )));
})();
