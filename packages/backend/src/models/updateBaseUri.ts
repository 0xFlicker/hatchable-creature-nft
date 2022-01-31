import { dirname, resolve } from "path";
import type { Database } from "sqlite3";
import { BigNumber } from "ethers";
import {
  statementFinalize,
  statementGet,
  iterate,
  dbRun,
} from "../utils/db.js";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

export interface IUpdateBaseUri {
  id: number;
  base_uri: string;
  tokenCount: BigNumber;
  pendingTx: string | null;
}

function mapToUpdateBaseUriTokenCount(tokenCount: any): BigNumber {
  return BigNumber.from(tokenCount);
}
function mapToUpdateBaseUriPendingTx(pendingTx: any): string | null {
  return pendingTx === null ? null : pendingTx.toString();
}
function mapToUpdateBaseUriBaseUri(baseUri: any): string {
  return baseUri;
}
function mapToUpdateBaseUriId(id: any): number {
  return Number(id);
}
function mapToUpdateBaseUriModel(row: any): IUpdateBaseUri {
  return {
    id: mapToUpdateBaseUriId(row.id),
    base_uri: mapToUpdateBaseUriBaseUri(row.base_uri),
    tokenCount: mapToUpdateBaseUriTokenCount(row.token_count),
    pendingTx: mapToUpdateBaseUriPendingTx(row.pending_tx),
  };
}

export async function getPendingUpdateTransactions(
  db: Database
): Promise<IUpdateBaseUri[]> {
  const [rows] = await iterate(
    db,
    mapToUpdateBaseUriModel,
    `SELECT id, token_count, pending_tx, base_uri FROM update_base_uri`
  );
  const updateBaseUris: IUpdateBaseUri[] = [];
  for await (const row of rows) {
    updateBaseUris.push(row);
  }
  return updateBaseUris;
}

export async function removePendingUpdateTransaction(
  db: Database,
  tokenId: number
) {
  await dbRun(db, `DELETE FROM update_base_uri WHERE id = ?`, tokenId);
}

export async function addPendingUpdateTransaction(
  db: Database,
  tokenCount: BigNumber,
  pendingTx: string | null,
  baseUri: string | null
) {
  await dbRun(
    db,
    `INSERT INTO update_base_uri (base_uri, token_count, pending_tx) VALUES (?, ?, ?)`,
    baseUri,
    tokenCount.toNumber(),
    pendingTx
  );
}

export async function getUpdateBaseUri(
  db: Database,
  tokenId: number
): Promise<IUpdateBaseUri> {
  const stmt = db.prepare(
    `SELECT token_count, pending_tx FROM update_base_uri WHERE token_count = ?`,
    tokenId
  );
  const updateBaseUri = await statementGet(stmt);
  await statementFinalize(stmt);
  return mapToUpdateBaseUriModel(updateBaseUri);
}

export async function saveUpdateBaseUri(
  db: Database,
  updateBaseUri: IUpdateBaseUri
) {
  await dbRun(
    db,
    `
    UPDATE update_base_uri 
    SET base_uri = ?
      token_count = ?
      pending_tx = ?
    WHERE id = ?
    `,
    updateBaseUri.base_uri,
    updateBaseUri.tokenCount.toNumber(),
    updateBaseUri.pendingTx,
    updateBaseUri.id
  );
}
