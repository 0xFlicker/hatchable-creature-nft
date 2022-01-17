import type { Database, Statement } from "sqlite3";
import { promisify } from "util";

export function statementGet(stmt: Statement, ...params: any): Promise<any> {
  return promisify(stmt.get.bind<Statement, any[], any>(stmt))(params);
}

export function statementFinalize(stmt: Statement): Promise<void> {
  return promisify(stmt.finalize.bind(stmt))();
}

export function dbExec(db: Database, sql: string): Promise<void> {
  return promisify(db.exec.bind(db))(sql);
}

export function dbRun(db: Database, sql: string, ...params: any): Promise<any> {
  // @ts-ignore
  return promisify(db.run.bind(db))(sql, ...params);
}
export function dbGet(db: Database, sql: string, ...params: any): Promise<any> {
  // @ts-ignore
  return promisify(db.get.bind(db))(sql, ...params);
}

export async function iterate<T>(
  db: Database,
  mapFunction: (row: any) => T,
  query: string,
  ...params: any[]
): Promise<[AsyncGenerator<T>, () => void]> {
  const stmt = db.prepare(query, ...params);
  let done = false;
  const cancel = () => {
    done = true;
    statementFinalize(stmt);
  };
  const itr = async function* () {
    while (!done) {
      const row = await statementGet(stmt);
      if (!row) {
        break;
      }
      yield mapFunction(row);
    }
    if (!done) {
      cancel();
    }
  };
  return [await itr(), cancel];
}
