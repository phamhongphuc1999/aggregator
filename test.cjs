/**
 * Test a single strategy
*/

async function test(strategy, account, amount, merge = true, error = null) {
    const { process, debug, processError, autoAvailability, serialize, state } =
        global.module ??
        (global.module = await import('./strategyen.js'));
    let res = {}, fs;
    (typeof strategy === 'string') &&
        (fs = await import('fs')) &&
        fs.existsSync(strategy) &&
        (strategy = JSON.parse(fs.readFileSync(strategy)));
    const starttime = Date.now();
    const maps = { account, amount };
    // handler
    try {
        debug('STRATEGY:', strategy.id ?? strategy.strategy_id ?? strategy);
        res = await autoAvailability(strategy);
        debug('AUTO:', serialize(res), (Date.now() - starttime)+'ms');
        res = await process(strategy, maps, null, merge);
        debug('PROCESS:',
            [res.calls?.length, (res.calls ?? []).map(call => call.method.slice(0, call.method.indexOf('('))).join(', ')],
            [res.auto?.calls?.length ?? 0, res.auto?.call?.tx?.data?.length/2 - 1],
            res.ran+'ms'
        );
    } catch (err) {
        console.error("---->\n\tERROR:", err.stack, serialize(err), "\n<----");
    }
    try {
        //
        if (error) { throw error; }
    } catch (error) {
        debug('ERROR:', serialize(res = await processError(JSON.parse(error), res.calls[1])));
    }
    // result
    return serialize(res);
};

module.exports = test;

// import.meta?.url === 'file://'+process.argv[1]
if (process && require.main === module) {
    const accounts = ['0x70D86bF17B30D268285eCFD204F83522797bad6C', '0x871dbce2b9923a35716e7e83ee402b535298538e']
    const amounts = ['1', '200', '1000'];
    const args = process.argv.slice(2);
    // fs.readFileSync('cache/error.json')
    // single test
    test(args[0] ?? 'cache/test.json', accounts[0], args[1] ?? amounts[1]).then(console.log);
}
