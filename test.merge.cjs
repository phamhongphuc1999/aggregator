const files = {
    "0x0000000000000000000000000000000000000000": "0",
    "0xbb4cdb9cbd36b01bd1cbaebf2de08d9173bc095c": "wbnb",
    "0xe9e7cea3dedca5984780bafc599bd69add087d56": "usd",
    "0x55d398326f99059ff775485246999027b3197955": "usdt",
    "0x8ac76a51cc950d9822d68b83fe1ad97b32cd580d": "usdc",
    "0x7083609fce4d1d8dc0c979aab8c869ea2c873402": "dot",
    "0x7130d2a12b9bcbfae4f2634d864a1ee1ce3ead9c": "btc",
    "0x250632378e573c6be1ac2f97fcdf00515d0aa91b": "eth",
    "0x0e09fabb73bd3ade0a17ecc321fd13a19e81ce82": "cake",
    "0xcf6bb5389c92bdda8a3747ddb454cb7a64626c63": "xvs"
};
const args = process.argv.slice(2);
const infile = 'cache/testIds.json';
const outfile = null;

const fs = require('fs');

Object.keys(files).forEach(
    token => files[token] = 'logs/all.' + files[token] + '.json'
);

async function merge(files) {
    const obj = {};
    for (const [token, file] of Object.entries(files)) {
        !obj[token] && (obj[token] = Array.from({ length: 4 }, ()=>[]));
        fs.existsSync(file) ?
            (JSON.parse(fs.readFileSync(file)).filter(e => !e[2]).forEach(
                e => (obj[token][ e[1] ] ?? []).push(e[0]))
            ) :
            console.error(file, 'not found!');
    }
    return JSON.stringify(obj, null, "\t");
};

async function all(files) {
    const test_all = require('./test.all.cjs');
    for (const token in files) {
        fs.writeFileSync(files[token], token);
        const out = await test_all([token], infile);
        fs.writeFileSync(files[token], '[' + out.join(',') + ']');
    }
};

if (args.includes('-m')) {
    merge(files).then(out => (outfile ? fs.writeFileSync(outfile, out) : console.log(out)));
} else if (args.includes('-a')) {
    all(files).then(out => console.log);
} else {
    console.error('Usage:', process.argv[1], '[-m|-a]')
}
