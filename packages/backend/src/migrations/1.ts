import type { Database } from "sqlite3";
import { dbRun } from "../utils/db.js";

export async function up(db: Database) {
  console.log("Creating create_models table");
  await dbRun(
    db,
    `CREATE TABLE IF NOT EXISTS creature_models (token_id INTEGER PRIMARY KEY, status TEXT, block INTEGER)`
  );
}

export async function down(db: Database) {
  console.log("Dropping create_models table");
  await dbRun(db, `DROP TABLE IF EXISTS creature_models`);
}

export default {
  up,
  down,
};
