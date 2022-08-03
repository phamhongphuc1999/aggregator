/**
 * Test a single strategy
*/

Promise.all([import('./helpers.js'), import('./strategyen.js'), import('fs')]).then(async ([{ serialize }, {process, processError, autoAvailability}, fs]) => {
    const accounts = ['0x70D86bF17B30D268285eCFD204F83522797bad6C', '0x871dbce2b9923a35716e7e83ee402b535298538e']
    const amounts = ['200', '1'];
    const maps = { account: accounts[0], amount: amounts[1] };
    //
    const strategy = JSON.parse(fs.readFileSync('cache/test.json'));
    const error = fs.readFileSync('cache/error.json');
    const merge = false;
    //
    try {
        console.error('STRATEGY:', strategy.id ?? strategy.strategy_id);
        let [starttime, res] = [Date.now(), await autoAvailability(strategy)];
        console.error('AUTO:', serialize(res), (Date.now()-starttime)+'ms');
        //
        console.log(serialize(res = await process(strategy, maps, !res, merge)));
        console.error('PROCESS:', [res.calls?.length, (res.calls ?? []).map(call => call.method.slice(0, call.method.indexOf('('))).join(', ')], [res.auto?.calls?.length, res.auto?.call?.tx?.data?.length/2 - 1], res.ran+'ms');
        //
        console.error('ERROR:', serialize(res = await processError(JSON.parse(error), res.calls[1])));
        //
    } catch (err) {
        console.error('----> error:', err.stack, serialize(err), '<----');
    }
});
