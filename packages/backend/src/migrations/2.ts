import type { Database } from "sqlite3";
import { dbRun } from "../utils/db.js";

export async function up(db: Database) {
  console.log("Creating update_base_uri table");
  await dbRun(
    db,
    `CREATE TABLE IF NOT EXISTS update_base_uri (id INTEGER PRIMARY KEY, base_uri STRING, pending_tx STRING, token_count INTEGER)`
  );
}

export async function down(db: Database) {
  console.log("Dropping update_base_uri table");
  await dbRun(db, `DROP TABLE IF EXISTS update_base_uri`);
}

export default {
  up,
  down,
};
