(async () => {
    const { readFileSync, readdirSync } = await import('fs');
    const { serialize } = await import('./helpers.js');
    const { process } = await import('./strategyen.js');
    // config
    //const where = ['./cache', 'strategy.', '.json'];
    //const queues = [];
    //const maps = {};
    //await Promise.all(readdirSync(where[0]).filter(file => file.startsWith(where[1]) && file.endsWith(where[2]))
    //const data = JSON.parse(readFileSync([where[0], file].join('/')));
    const ids = ;
    const api_prefix = 'https://scoringapi.trava.finance/aggregator/strategies/';
    const results = (await Promise.all(ids
        .map((id) => axios.get(api_prefix + id, {responseType: 'json'}))))
        .map((res, index) => new Promise((resolve, reject) => {
            const ms = Date.now();
            process(res.data, maps)
            .then((res) => {
                console.error((Date.now()-ms)+'ms', ids[index]+'>>');
                console.log(serialize(res));
                console.error('<<'+ids[index]);
                resolve(res);
            })
            .catch((err) => {
                console.error(ids[index]+'::', err);
                reject(err);
            });
        }))
    );
})()
