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

export interface IScannedBlock {
  id: number;
  tokenId: BigNumber;
  block: number;
  blockHash: string;
}

function mapTokenId(tokenCount: any): BigNumber {
  return BigNumber.from(tokenCount);
}
function mapBlockHash(hashTx: any): string {
  return hashTx === null ? "" : hashTx.toString();
}
function mapBlock(block: any): number {
  return Number(block);
}
function mapToScannedBlock(row: any): IScannedBlock {
  return {
    id: Number(row.id),
    tokenId: mapTokenId(row.token_id),
    block: mapBlock(row.block),
    blockHash: mapBlockHash(row.block_hash),
  };
}

export async function addScannedBlock(
  db: Database,
  tokenId: BigNumber,
  blockHash: string,
  block: number
) {
  await dbRun(
    db,
    `INSERT INTO scanned_block (token_id, block, block_hash) VALUES (?, ?, ?)`,
    tokenId.toString(),
    block,
    blockHash
  );
}

export async function getLastScannedBlock(
  db: Database
): Promise<IScannedBlock | null> {
  const stmt = db.prepare(
    `SELECT id, token_id, block, block_hash FROM scanned_block ORDER BY block DESC LIMIT 1`
  );
  const minted = await statementGet(stmt);
  await statementFinalize(stmt);
  return minted ? mapToScannedBlock(minted) : null;
}
