import { dirname, resolve } from "path";
import type { Database } from "sqlite3";
import { BigNumber } from "ethers";
import { adultMetadata, babyMetadata } from "@creaturenft/assets";
import {
  statementFinalize,
  statementGet,
  iterate,
  dbRun,
} from "../utils/db.js";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

export type ICreatureModelStatus =
  | "unknown"
  | "nil"
  | "baby"
  | "hatching"
  | "hatched";
export interface ICreatureModel {
  tokenId: BigNumber;
  status: ICreatureModelStatus;
  pendingTx: string | null;
}

const definedStatus = new Set<ICreatureModelStatus>([
  "nil",
  "baby",
  "hatching",
  "hatched",
]);
function isDefinedCreateStatus(status: string): status is ICreatureModelStatus {
  return definedStatus.has(status as ICreatureModelStatus);
}
function mapToCreatureStatus(status: string): ICreatureModelStatus {
  if (isDefinedCreateStatus(status)) {
    return status;
  }
  return "unknown";
}
function mapToCreatureTokenIndex(tokenId: any): BigNumber {
  return BigNumber.from(tokenId);
}
function mapToCreaturePendingTx(pendingTx: any): string | null {
  return pendingTx === null ? null : pendingTx.toString();
}
function mapToCreatureModel(row: any): ICreatureModel {
  return {
    tokenId: mapToCreatureTokenIndex(row.token_id),
    status: mapToCreatureStatus(row.status),
    pendingTx: mapToCreaturePendingTx(row.pending_tx),
  };
}

export function needsHatching(creature: ICreatureModel): boolean {
  return creature.status === "nil" || creature.status === "baby";
}

export async function getCreateFromDatabase(
  db: Database,
  tokenId: number
): Promise<ICreatureModel> {
  const stmt = db.prepare(
    `SELECT token_id, status, pending_tx FROM creature_models WHERE tokenId = ?`,
    tokenId
  );
  const creatureModel = await statementGet(stmt);
  await statementFinalize(stmt);
  return mapToCreatureModel(creatureModel);
}

export async function saveCreatureToDatabase(
  db: Database,
  creature: ICreatureModel
) {
  await dbRun(
    db,
    `INSERT OR REPLACE INTO creature_models (token_id, status, pending_tx) VALUES (?, ?, ?)`,
    creature.tokenId.toNumber(),
    creature.status,
    creature.pendingTx
  );
}

export const iterateAllCreates = (db: Database) =>
  iterate(
    db,
    mapToCreatureModel,
    `SELECT token_id, status, pending_tx FROM creature_models ORDER BY token_id ASC`
  );

export async function removeCreaturesFromDatabase(
  db: Database,
  tokenIds: BigNumber[]
) {
  return new Promise<void>((resolve, reject) => {
    db.run(
      `DELETE FROM creature_models WHERE token_id IN (${tokenIds
        .map(() => "?")
        .join(", ")})`,
      ...tokenIds,
      (err?: Error) => {
        if (err) {
          reject(err);
          return;
        }
        resolve();
      }
    );
  });
}

export function getAdultCreatureMetadata(tokenId: BigNumber) {
  return adultMetadata[tokenId.toNumber()];
}

export function getBabyCreatureMetadata(tokenId: BigNumber) {
  return babyMetadata[tokenId.toNumber()];
}
