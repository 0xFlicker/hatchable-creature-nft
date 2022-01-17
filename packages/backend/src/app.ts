import express from "express";

import type { Network } from "@creaturenft/web3";
import { createDb, hatcherResolver, runMigrations } from "@creaturenft/shared";
const app = express();

function envToNetwork() {
  if (
    [
      "mainnet",
      "ropsten",
      "rinkeby",
      "kovan",
      "goerli",
      "matic",
      "maticmum",
    ].some((e) => e === process.env.NETWORK)
  ) {
    return process.env.NETWORK as Network;
  }
  return "ganache";
}

function envToCurrentMigration() {
  if (process.env.MIGRATION) {
    return parseInt(process.env.MIGRATION, 10);
  }
  return 0;
}

export default async function () {
  const desiredMigration = envToCurrentMigration();
  console.log(`Running migrations to ${desiredMigration}`);
  const db = await createDb();
  await runMigrations(db, desiredMigration);
  console.log("Migrations complete");
  hatcherResolver(envToNetwork(), db, 5000);
}
