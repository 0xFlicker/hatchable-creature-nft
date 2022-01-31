import type { Database } from "sqlite3";
import { dbRun } from "../utils/db.js";

export async function up(db: Database) {
  console.log("Creating nonce table");
  await dbRun(
    db,
    `CREATE TABLE IF NOT EXISTS nonce (id INTEGER PRIMARY KEY, nonce INTEGER, pending_tx STRING, gas INTEGER)`
  );
}

export async function down(db: Database) {
  console.log("Dropping nonce table");
  await dbRun(db, `DROP TABLE IF EXISTS nonce`);
}

export default {
  up,
  down,
};
