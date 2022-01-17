import * as dotenv from "dotenv";

import { HardhatUserConfig, task, types } from "hardhat/config";
import "hardhat-deploy";
import "@nomiclabs/hardhat-etherscan";
import "@nomiclabs/hardhat-waffle";
import "@typechain/hardhat";
import "hardhat-gas-reporter";
import "solidity-coverage";
import { node_url, accounts, addForkConfiguration } from "./utils/network";

dotenv.config();

// This is a sample Hardhat task. To learn how to create your own go to
// https://hardhat.org/guides/create-task.html
task("accounts", "Prints the list of accounts", async (taskArgs, hre) => {
  const accounts = await hre.ethers.getSigners();

  for (const account of accounts) {
    console.log(account.address);
  }
});

task("fund", "Sends some test funds to an account for testing")
  .addOptionalParam("from", "The account to send the funds from", 5, types.int)
  .addOptionalParam("amount", "The amount to send", 10, types.int)
  .addPositionalParam("to", "The account to send funds to")
  .setAction(async (taskArgs, hre) => {
    const toAccount = taskArgs.to;
    const accounts = await hre.ethers.getSigners();
    const account = accounts[taskArgs.from];
    console.log(
      `Sending ${taskArgs.amount} ${account.address} -> ${toAccount}`
    );
    await account.sendTransaction({
      to: toAccount,
      value: hre.ethers.utils.parseEther(taskArgs.amount.toString()),
    });
  });

// Mints a token for a given account
task("mint", "Mints a token for a given account")
  .addOptionalParam("from", "The account to send the funds from", 5, types.int)
  .addOptionalParam("cost", "The mint cost", 10, types.int)
  .addPositionalParam(
    "receiver",
    "The account to receive the token",
    "user",
    types.string
  )
  .setAction(async (taskArgs, hre) => {
    const toAccount = taskArgs.receiver;
    const cost = hre.ethers.utils.parseEther(taskArgs.cost.toString());
    const accounts = await hre.ethers.getSigners();
    let from = accounts[taskArgs.from];
    console.log(`Minting ${from.address} -> ${toAccount}`);
    await hre.deployments.execute(
      "CreatureERC721",
      {
        from: from.address,
        value: cost,
      },
      "mint",
      toAccount
    );
  });

// You need to export an object to set up your config
// Go to https://hardhat.org/config/ to learn more

const config: HardhatUserConfig = {
  solidity: "0.8.4",
  defaultNetwork: "ganache",
  namedAccounts: {
    owner: 0,
    manager: 1,
    user: 2,
  },
  networks: addForkConfiguration({
    hardhat: {
      initialBaseFeePerGas: 0, // to fix : https://github.com/sc-forks/solidity-coverage/issues/652, see https://github.com/sc-forks/solidity-coverage/issues/652#issuecomment-896330136
    },
    ganache: {
      url: node_url("ganache"),
      accounts: accounts(),
    },
    staging: {
      url: node_url("rinkeby"),
      accounts: accounts("rinkeby"),
    },
    production: {
      url: node_url("mainnet"),
      accounts: accounts("mainnet"),
    },
    mainnet: {
      url: node_url("mainnet"),
      accounts: accounts("mainnet"),
    },
    rinkeby: {
      url: node_url("rinkeby"),
      accounts: accounts("rinkeby"),
    },
    kovan: {
      url: node_url("kovan"),
      accounts: accounts("kovan"),
    },
    goerli: {
      url: node_url("goerli"),
      accounts: accounts("goerli"),
    },
  }),
  gasReporter: {
    enabled: process.env.REPORT_GAS !== undefined,
    currency: "USD",
  },
  etherscan: {
    apiKey: process.env.ETHERSCAN_API_KEY,
  },
  typechain: {
    outDir: "typechain",
    target: "ethers-v5",
  },
};

export default config;
