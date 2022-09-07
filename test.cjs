/**
 * Test a single strategy
*/

const A0 = '0x'+'0'.repeat(40);

async function test(strategy, account, amount, arg = { usd: true, merge: true, test: true, autoonly: false, testonly: false, error: null }) {
    const { process, debug, processError, autoAvailability, getStrategy, helpers, serialize, state } =
        global.module ??
        (global.module = await import('./strategyen.js'));
    const starttime = Date.now();
    let res = null;
    // handler
    try {
        // if it is file or id, fetch it
        (typeof strategy === 'string') &&
            (strategy = (await import('fs')).existsSync(strategy) ?
            JSON.parse((await import('fs')).readFileSync(strategy)) :
            await getStrategy(strategy));
        const id = strategy.strategy_id ?? strategy;
        if (arg.testonly) {
            return debug(strategy) && serialize(await getStrategy(strategy));
        }
        // minimal test
        debug('STRATEGY:', id, strategy.steps.map(step => step.strategy_id));
        //
        if (arg.autoonly) {
            res = await autoAvailability(strategy);
            debug('AUTO:', res, (Date.now() - starttime) + 'ms');
            res = !res;
            return serialize([id, strategy.steps?.length ?? 0, res]);
        }
        //
        const addresses = Object.keys(strategy?.strategy?.capital ?? strategy?.capital ?? {});
        //price(addresses[0], helpers.contract(helpers.getAddress('swaps.factory'), 'swaps'), helpers.getAddress('token.usd'), true)
        (arg.usd) && (amount = (amount / await helpers.getPrice(addresses[0])).toFixed(8));
        //
        const maps = { account, amount };
        res = await process(strategy, maps, res, arg.merge);
        if (arg.merge && res.steps?.length) {
            res.strategy.roi_history && (res.strategy.roi_history = []);
            res.steps.forEach(step => (step.roi_history = []));
        }
        //
        debug('PROCESS:',
            [res.calls?.length, (res.calls ?? []).map(call => call.method.slice(0, call.method.indexOf('('))).join(', ')],
            [res.auto?.calls?.length, res.auto?.call?.tx?.data?.length/2 - 1],
            res.ran + 'ms'
        );
        if (arg.test) {
            let ins = res.auto?.transfers?.ins;
            if (ins && (ins = ins.filter(e => e.tx).map(e => [e.tx.to, e.tx.data, e.custom]))) {
                const approved = ins.length === 0;
                debug('TEST.IN:', res.auto?.transfers?.ins, res.auto?.call?.tx?.value);
                try {
                    const con = res.auto.call.contract();
                    debug.apply(null, ['TEST.SUCESS:'].concat(
                        id,
                        approved ?
                            ['auto', 'GAS => ' + (await con.estimate()).toString() + ' <=', "\n", '-> ', await con.probe(), '<-'] :
                            ['APPROVALS', ins, 'please send approve tx and test again'],
                    ));
                } catch (err) {
                    debug('TEST.FAILED:', id, err.code === 'UNPREDICTABLE_GAS_LIMIT' ? [err.reason, err.error] : err.stack);
                }
            }
        }
    } catch (err) {
        arg.error = err;
        console.error("<----\n\tERROR:", err.stack, serialize(err), "\n---->");
    }
    try {
        //
        if (arg.error) { throw arg.error; }
    } catch (error) {
        debug('ERROR:', serialize(res = await processError(JSON.parse(serialize(error)))));
    }
    // result
    return serialize(res);
};

module.exports = test;

// import.meta?.url === 'file://'+process.argv[1]
if (process && require.main === module) {
    const accounts = ['0x68a6c841040B05D60434d81000f523Bf6355b31D', '0x70D86bF17B30D268285eCFD204F83522797bad6C', '0x871dbce2b9923a35716e7e83ee402b535298538e']
    const amounts = ['1', '2', '3'];
    const args = process.argv.slice(2);
    // const amountInUSD = '1';
    // fs.readFileSync('cache/error.json')
    // single test
    test(args[0] ?? 'cache/test.json', accounts[0], args[1] ?? amounts[ Math.floor(Math.random() * amounts.length) ]).then(console.log);
}
