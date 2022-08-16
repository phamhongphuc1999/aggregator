# Automatic Strategy Encoder

## Usage
For use explicitly with strategies data from scoringapi.trava.finance (Trava's BRicher project)

## Supported apps
- venus
- cream
- trava
- trava staking and governance vaults
- uniswap for swap and providing lp
- pancake vaults
- alpaca
- valas
- ...

## Usage

### Dynamic loading
```
const lib = await import('https://unpkg.com/@ais-ltd/strategyen@latest/build.min.js')
```
Dynamic library is ESM only

### Bundle to project
```
import * as lib from '@ais-ltd/strategyen';
```
Typescript suppport is present but still limited

### Simple usage
```
const maps = { account: '', amount: '' };
const strategy_id = "bfaa65a1b7a6da9b7324b45de77da673cdf9a008aae4986ba818076826e347e6";
console.log(await lib.process(strategy_id, maps));
```

### Advanced usage
```
console.log(await lib.autoAvailability(strategy_id));
```

### Error handling
```
lib.process(strategy_id, maps).catch(
    err => lib.processError(err).then(console.log)
);
```

## Know-how

### What it is for?


### How this works?
By scanning through D-App definitions and predefined formulas.

### How is this improve user experience?
Users no longer need to learn to use an d-app or calculate many steps needed to invest

### What is its shortcomings?
Many d-apps just straight block indirect calls, make it impossible to generate automatic calls for user.

### Us & User Responsibility
