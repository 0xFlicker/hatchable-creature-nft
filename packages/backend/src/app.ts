import express from "express";
import { networkStringToNetworkType } from "@creaturenft/web3";
import createDb from "./db.js";
import runMigrations from "./migrations/index.js";
import createIpfsClient from "./ipfs/client.js";
import hatcherResolver from "./hatcher.js";
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

  const ipfsClient = createIpfsClient();
  hatcherResolver(
    networkStringToNetworkType(process.env.NETWORK),
    ipfsClient,
    db,
    5000
  );
}
