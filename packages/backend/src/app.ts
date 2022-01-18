import express from "express";
import { networkStringToNetworkType } from "@creaturenft/web3";
import { createDb, hatcherResolver, runMigrations } from "@creaturenft/shared";
const app = express();

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
  hatcherResolver(networkStringToNetworkType(process.env.NETWORK), db, 60000);
}
