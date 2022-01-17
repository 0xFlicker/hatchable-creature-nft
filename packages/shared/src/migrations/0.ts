import type { Database } from "sqlite3";
import { dbRun } from "../utils/db.js";

export async function up(db: Database) {
  console.log("Creating migrations table");
  await dbRun(db, `CREATE TABLE IF NOT EXISTS migrations (last_run INTEGER)`);
}

export async function down(db: Database) {
  console.log("Dropping migrations table");
  await dbRun(db, `DROP TABLE IF EXISTS migrations`);
}

export default {
  up,
  down,
  order: 0,
};
