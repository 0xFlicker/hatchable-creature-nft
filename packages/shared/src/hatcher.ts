import fs from "fs";
import { resolve } from "path";
import { interval, merge, concatMap, takeLast, from, map, tap } from "rxjs";
import { CID, IPFSHTTPClient } from "ipfs-http-client";
import { createLink, createNode } from "@ipld/dag-pb";
import { networks } from "@creaturenft/contracts";
import { assetPath } from "@creaturenft/assets";
import type { Database } from "sqlite3";
import {
  defaultProvider,
  creatureErc721Factory,
  lifecycleManagerFactory,
  findContractOwnerAddress,
  Network,
} from "@creaturenft/web3";

import { providers, BigNumber } from "ethers";
import {
  getAdultCreatureMetadata,
  ICreatureModel,
  iterateAllCreatures,
  iterateAllCreaturesHatchingLessThan,
  needsHatching,
  removeCreaturesFromDatabase,
  saveCreatureToDatabase,
} from "./models/creature.js";
import {
  CreatureERC721,
  LifecycleManager,
} from "@creaturenft/contracts/typechain";
import {
  addPendingUpdateTransaction,
  getPendingUpdateTransactions,
  IUpdateBaseUri,
  removePendingUpdateTransaction,
  saveUpdateBaseUri,
} from "./models/updateBaseUri.js";
import { updateBaseUriToTokenCount } from "./ipfs/metadata.js";

const CONFIRMING_BLOCKS = 3;

function lifecycleManagerOwnerAddress(
  network: providers.Network,
  networkName: string
) {
  if (process.env.LIFECYCLE_MANAGER_OWNER_ADDRESS) {
    return process.env.LIFECYCLE_MANAGER_OWNER_ADDRESS;
  }
  const contractAddress = findContractOwnerAddress(
    networks,
    network.chainId.toString(),
    networkName,
    "LifecycleManager"
  );
  if (!contractAddress) {
    throw new Error(`No contract address found for network ${networkName}`);
  }
  return contractAddress;
}

async function updateIpfsWithNewCreatures(
  ipfsClient: IPFSHTTPClient,
  creatures: ICreatureModel[],
  rootCid: CID,
  abortController?: AbortController
) {
  // ipfsClient.object.patch.addLink(rootCid,
  const assetsPackageAdultMetadata = resolve(
    assetPath,
    "generated",
    "metadata"
  );
  let cid: CID = rootCid;
  for (const creature of creatures) {
    const tokenId = creature.tokenId.toString();
    const creatureCid = await ipfsClient.add({
      content: await fs.promises.readFile(
        resolve(assetsPackageAdultMetadata, tokenId),
        "utf8"
      ),
    });
    const link = createLink(
      `$/{creatureCid.path}`,
      creatureCid.size,
      creatureCid.cid
    );

    cid = await ipfsClient.object.patch.addLink(cid, link, {
      signal: abortController?.signal,
    });
  }
}

export async function resolver(
  creatureContract: CreatureERC721,
  lifecycleManagerContract: LifecycleManager,
  ipfsClient: IPFSHTTPClient,
  provider: providers.Provider,
  db: Database
): Promise<void> {
  console.log("Resolving creatures...");
  // check if any minted tokens exist that need to hatch
  const tokenCount = await creatureContract.tokenCount();

  // Check for tokens that don't actually exist and need to be removed
  const creaturesToRemove: BigNumber[] = [];
  // Creatures that need to be hatched
  const creaturesToHatch: ICreatureModel[] = [];
  // Creatures that have been hatched
  const creaturesToSave: ICreatureModel[] = [];

  // Iterate over all tokens and check if they are minted and waiting to hatch
  const [creatures, cancel] = await iterateAllCreatures(db);
  let lastKnownTokenId = await lifecycleManagerContract.lastTokenIdUpdated();
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
    const pendingTx = await lifecycleManagerContract.updateMetadata(
      newBaseCid,
      tokenCount
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

  const ownerAddress = lifecycleManagerOwnerAddress(networkProvider, network);
  const signer = provider.getSigner(ownerAddress);

  const { topToken$, contract: creatureContract } = await creatureErc721Factory(
    network
  );
  const lifecycleManager = lifecycleManagerFactory(
    signer,
    networkProvider,
    network
  );

  // Start the resolver
  console.log("Starting resolver...");
  merge(interval(intervalMs), topToken$)
    .pipe(
      concatMap(() =>
        from(
          resolver(creatureContract, lifecycleManager, ipfsClient, provider, db)
        )
      )
    )
    .subscribe(() => "console.log('Resolver ran')");
}
