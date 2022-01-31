import { Database } from "sqlite3";
import { dbRun, dbGet } from "../utils/db.js";

import migration0 from "./0.js";
import migration1 from "./1.js";
import migration2 from "./2.js";
import migration3 from "./3.js";

const migrations = [migration0, migration1, migration2, migration3];

export default async function (db: Database, desiredMigration: number) {
  desiredMigration = desiredMigration || migrations.length - 1;
  // Always run 0 migration to create migrations table
  await migration0.up(db);

  // Get last run migration
  const row = await dbGet(db, `SELECT last_run FROM migrations`);
  const lastRun = row ? row.last_run : 0;
  let currentMigration = lastRun;

  if (lastRun < desiredMigration) {
    // Run migrations up to desired migration
    for (let i = lastRun + 1; i <= desiredMigration; i++) {
      const migration = migrations[i];
      await migration.up(db);
      currentMigration = i;
    }
  } else if (lastRun > desiredMigration) {
    // Run migrations down to desired migration
    for (let i = lastRun; i >= desiredMigration; i--) {
      const migration = migrations[i - 1];
      await migration.down(db);
      currentMigration = i - 1;
    }
  }
  if (currentMigration !== lastRun && currentMigration === desiredMigration) {
    // Update last run migration
    console.log(`Updating last run migration to ${currentMigration}`);
    await dbRun(db, `UPDATE migrations SET last_run = ?`, currentMigration);
  } else {
    console.log(
      `Failed to migrate to ${desiredMigration}. Currently at ${currentMigration} from ${lastRun}`
    );
    throw new Error("Migration failed");
  }
}
