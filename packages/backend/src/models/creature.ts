import { dirname, resolve } from "path";

import { fileURLToPath } from "url";
import type { Database } from "sqlite3";
import { BigNumber } from "ethers";
import {
  statementFinalize,
  statementGet,
  iterate,
  dbRun,
} from "../utils/db.js";
import adultMetadataCids from "../all_metadata_cids.json";

const __dirname = dirname(fileURLToPath(import.meta.url));

export type ICreatureModelStatus = "unknown" | "nil" | "hatching" | "hatched";
export interface ICreatureModel {
  tokenId: BigNumber;
  status: ICreatureModelStatus;
}

const definedStatus = new Set<ICreatureModelStatus>(["nil", "hatched"]);
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
function mapToCreatureModel(row: any): ICreatureModel {
  return {
    tokenId: mapToCreatureTokenIndex(row.token_id),
    status: mapToCreatureStatus(row.status),
  };
}
export function needsHatching(creature: ICreatureModel): boolean {
  return creature.status === "nil" || creature.status === "unknown";
}

export async function getCreateFromDatabase(
  db: Database,
  tokenId: number
): Promise<ICreatureModel> {
  const stmt = db.prepare(
    `SELECT token_id, status FROM creature_models WHERE tokenId = ?`,
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
    `INSERT OR REPLACE INTO creature_models (token_id, status) VALUES (?, ?)`,
    creature.tokenId.toNumber(),
    creature.status
  );
}

export const iterateAllCreatures = (db: Database) =>
  iterate(
    db,
    mapToCreatureModel,
    `SELECT token_id, status FROM creature_models ORDER BY token_id ASC`
  );

export const iterateAllCreaturesHatchingLessThan = (
  db: Database,
  tokenCount: BigNumber
) =>
  iterate(
    db,
    mapToCreatureModel,
    `SELECT token_id, status FROM creature_models WHERE status = "hatching" AND token_id <= ?`,
    tokenCount.toNumber()
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
  return adultMetadataCids[tokenId.toNumber()];
}
