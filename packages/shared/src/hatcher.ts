import fs from "fs";
import { dirname, resolve } from "path";
import { fileURLToPath } from "url";
import { interval, merge, concatMap, takeLast, from, map, tap } from "rxjs";
import { CID, IPFSHTTPClient } from "ipfs-http-client";
import { createLink, createNode } from "@ipld/dag-pb";
import { assetPath } from "@creaturenft/assets";
import type { Database } from "sqlite3";
import {
  defaultProvider,
  childCreatureErc721Factory,
  Network,
} from "@creaturenft/web3";

import { providers, BigNumber, utils } from "ethers";
import {
  getAdultCreatureMetadata,
  ICreatureModel,
  iterateAllCreatures,
  iterateAllCreaturesHatchingLessThan,
  needsHatching,
  removeCreaturesFromDatabase,
  saveCreatureToDatabase,
} from "./models/creature.js";
import { ChildCreatureERC721 } from "@creaturenft/contracts/typechain";
import {
  addPendingUpdateTransaction,
  getPendingUpdateTransactions,
  IUpdateBaseUri,
  removePendingUpdateTransaction,
} from "./models/updateBaseUri.js";
import { updateBaseUriToTokenCount } from "./ipfs/metadata.js";
import { childCreatureErc721ContractFactory } from "@creaturenft/web3/src/contracts/childCreatureErc721";

const CONFIRMING_BLOCKS = 3;

const __dirname = dirname(fileURLToPath(import.meta.url));

function childCreatureERC721OwnerAddress(networkName: string) {
  if (process.env.CHILD_CREATURE_ERC721_OWNER_ADDRESS) {
    return process.env.CHILD_CREATURE_ERC721_OWNER_ADDRESS;
  }
  networkName =
    networkName !== "unknown"
      ? networkName
      : process.env.NETWORK || "localhost";
  const contractAddress = getContractOwner(networkName, "ChildCreatureERC721");

  if (!contractAddress) {
    throw new Error(`No contract address found for network ${networkName}`);
  }
  return contractAddress;
}

function getContractOwner(networkName: string, contractName: string) {
  // FIXME: no code safety here, this will blow up if anything is missing
  const contractJson = JSON.parse(
    fs.readFileSync(
      resolve(
        __dirname,
        "..",
        "..",
        "contracts",
        `./deployments/${networkName}/${contractName}.json`
      ),
      "utf8"
    )
  );
  return contractJson.receipt.from;
}

export async function resolver(
  childCreatureContract: ChildCreatureERC721,
  ipfsClient: IPFSHTTPClient,
  provider: providers.Provider,
  db: Database
): Promise<void> {
  console.log("Resolving creatures...");
  // check if any minted tokens exist that need to hatch
  const tokenCount = await childCreatureContract.tokenCount();

  // Check for tokens that don't actually exist and need to be removed
  const creaturesToRemove: BigNumber[] = [];
  // Creatures that need to be hatched
  const creaturesToHatch: ICreatureModel[] = [];
  // Creatures that have been hatched
  const creaturesToSave: ICreatureModel[] = [];

  // Iterate over all tokens and check if they are minted and waiting to hatch
  const [creatures, cancel] = await iterateAllCreatures(db);
  let lastKnownTokenId = BigNumber.from(0);
  for await (const creature of creatures) {
    if (tokenCount.lt(creature.tokenId)) {
      console.info(
        `Creature ${
          creature.tokenId
        } is greater than ${tokenCount.toString()}. Skipping and will be removed.`
      );
      creaturesToRemove.push(creature.tokenId);
      continue;
    }

    // TODO: Check if pending transaction is stale / failed
    if (needsHatching(creature)) {
      console.info(`� Hatching BABY creature ${creature.tokenId} �`);
      creaturesToHatch.push(creature);
    }
    lastKnownTokenId = creature.tokenId.gt(lastKnownTokenId)
      ? creature.tokenId
      : lastKnownTokenId;
  }
  // Remove any creatures that don't actually exist
  if (creaturesToRemove.length > 0) {
    await removeCreaturesFromDatabase(db, creaturesToRemove);
  }
  // Add any new creatures that we don't know about yet
  if (lastKnownTokenId.lt(tokenCount)) {
    for (
      let i = lastKnownTokenId.toNumber() + 1;
      i <= tokenCount.toNumber();
      i++
    ) {
      const tokenId = BigNumber.from(i);
      console.log(`Creature ${tokenId} is new and being queued for hatching.`);
      creaturesToHatch.push({
        tokenId,
        status: "unknown",
      });
    }
  }
  // Fetch pending transactions, to make sure we don't double-hatch
  const pendingTransactions = await getPendingUpdateTransactions(db);
  // Find pending transactions to remove
  const transactionsThatHaveConfirmed: IUpdateBaseUri[] = [];
  const currentBlockNumber = await provider.getBlockNumber();
  for (let pendingTransaction of pendingTransactions) {
    if (pendingTransaction.pendingTx) {
      const transaction = await provider.getTransaction(
        pendingTransaction.pendingTx
      );
      if (
        transaction.blockNumber &&
        transaction.blockNumber + CONFIRMING_BLOCKS <= currentBlockNumber
      ) {
        console.log(`Transaction ${pendingTransaction.pendingTx} confirmed`);
        transactionsThatHaveConfirmed.push({
          ...pendingTransaction,
          pendingTx: null,
        });
      }
    }
  }
  // Remove pending transactions that have confirmed
  if (transactionsThatHaveConfirmed.length > 0) {
    for (let transaction of transactionsThatHaveConfirmed) {
      await removePendingUpdateTransaction(db, transaction.id);
    }
  }

  // TODO: Retry failed/stuck transactions / write a general purpose transaction manager

  // Hatch any creatures that need to be hatched
  if (creaturesToHatch.length > 0 && lastKnownTokenId.lt(tokenCount)) {
    // Create a new CID for the new package
    const newBaseCid = await updateBaseUriToTokenCount(
      ipfsClient,
      lastKnownTokenId.toNumber(),
      tokenCount.toNumber()
    );
    const pendingTx = await childCreatureContract.setBaseURI(
      utils.base58.decode(newBaseCid)
    );

    await addPendingUpdateTransaction(
      db,
      tokenCount,
      pendingTx.hash,
      newBaseCid
    );
    for (const creature of creaturesToHatch) {
      console.log(
        `Creature ${creature.tokenId.toString()} is pending hatching.`
      );
      creaturesToSave.push({
        ...creature,
        status: "hatching",
      });
    }
  }
  const [hatchingCreatures] = await iterateAllCreaturesHatchingLessThan(
    db,
    lastKnownTokenId
  );
  for await (const creature of hatchingCreatures) {
    console.log(`Creature ${creature.tokenId.toString()} is now hatched`);
    creaturesToSave.push({
      ...creature,
      status: "hatched",
    });
  }
  // Update the database with the new status
  for (const creature of creaturesToSave) {
    await saveCreatureToDatabase(db, creature);
  }
}

export default async function (
  network: Network,
  ipfsClient: IPFSHTTPClient,
  db: Database,
  intervalMs: number = 60 * 1000
) {
  const provider = defaultProvider(network);
  // await provider.send("evm_setAutomine", [false]);
  // await provider.send("evm_setIntervalMining", [1000]);
  const networkProvider = await provider.getNetwork();

  const ownerAddress = childCreatureERC721OwnerAddress(networkProvider.name);

  const { topToken$, contract: creatureContract } =
    await childCreatureErc721Factory(network);

  // Start the resolver
  console.log("Starting resolver...");
  merge(interval(intervalMs), topToken$)
    .pipe(
      concatMap(() =>
        from(
          resolver(
            creatureContract.connect(provider.getSigner(ownerAddress)),
            ipfsClient,
            provider,
            db
          )
        )
      )
    )
    .subscribe(() => "console.log('Resolver ran')");
}
