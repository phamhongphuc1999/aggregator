require('@nomiclabs/hardhat-waffle');
require('hardhat-contract-sizer');

task("accounts", "Prints the list of accounts", async (taskArgs, hre) => {
  const accounts = await hre.ethers.getSigners();
  for (const account of accounts) {
    console.log(account.address);
  }
});

const key = process.env.KEY || 'aa'.repeat(32);

/**
 * @type {import('hardhat/config').HardhatUserConfig}
 */
module.exports = {
  solidity: {
  version: '0.8.10',
  settings: {
       optimizer: { enabled: true, runs: 100 }
     }
  },
  defaultNetwork: 'bsc',
  networks: {
  	mainnet: {
      url: 'https://cloudflare-eth.com',
      accounts: [ key ]
  	},
  	bsc: {
      url: 'https://bsc-dataseed.binance.org/',
      accounts: [ key ]
  	}
  },
  contractSizer: {
  	runOnCompile: true
  }
};
