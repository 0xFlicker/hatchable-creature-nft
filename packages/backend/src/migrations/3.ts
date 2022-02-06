import type { Database } from "sqlite3";
import { dbRun } from "../utils/db.js";

export async function up(db: Database) {
  console.log("Creating scanned_block table");
  await dbRun(
    db,
    `CREATE TABLE IF NOT EXISTS scanned_block (id INTEGER PRIMARY KEY, token_id INTEGER, block INTEGER, block_hash TEXT)`
  );
}

export async function down(db: Database) {
  console.log("Dropping scanned_block table");
  await dbRun(db, `DROP TABLE IF EXISTS scanned_block`);
}

export default {
  up,
  down,
};
