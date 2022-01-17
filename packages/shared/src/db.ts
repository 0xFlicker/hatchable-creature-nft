import sqlite3 from "sqlite3";
import type { Database } from "sqlite3";

let db: Database;
export default function () {
  const dbFile = process.env.SQLITE_DB_FILE || ":memory:";
  const verboseMode = process.env.SQLITE_VERBOSE_MODE === "true";
  return new Promise<Database>((resolve, reject) => {
    if (db) {
      resolve(db);
    }
    if (verboseMode) {
      db = new (sqlite3.verbose().Database)(dbFile, (err) => {
        if (err) {
          reject(err);
          return;
        }
        resolve(db);
      });
    } else {
      db = new sqlite3.Database(dbFile, (err) => {
        if (err) {
          reject(err);
          return;
        }
        resolve(db);
      });
    }
  });
}
