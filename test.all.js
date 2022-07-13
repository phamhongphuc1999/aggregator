(async () => {
    const { readFileSync, readdirSync } = await import('fs');
    const { serialize } = await import('./helpers.js');
    const { process } = await import('./strategyen.js');
    // config
    const where = ['./cache', 'strategy.', '.json'];
    const queues = [];
    const maps = {};
    const results = await Promise.all(readdirSync(where[0])
        .filter(file => file.startsWith(where[1]) && file.endsWith(where[2]))
        .map((file) => new Promise((resolve, reject) => {
            const data = JSON.parse(readFileSync([where[0], file].join('/')));
            const ms = Date.now();
            process(data, maps)
            .then((res) => {
                console.error((Date.now()-ms)+'ms', file+'>>');
                console.log(serialize(res));
                console.error('<<'+file);
            })
            .catch(() => {
                console.error(file+'::', err);
            });
        }))
    );
})()
