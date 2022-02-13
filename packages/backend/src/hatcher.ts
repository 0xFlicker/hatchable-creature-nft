import fs from "fs";
import { dirname, resolve } from "path";
import { fileURLToPath } from "url";
import { interval, merge, concatMap, takeLast, from, map, tap } from "rxjs";
import { CID, IPFSHTTPClient } from "ipfs-http-client";
import type { Database } from "sqlite3";
import {
  defaultProvider,
  childCreatureErc721Factory,
  Network,
} from "@creaturenft/web3";

import { providers, BigNumber, utils, Contract, Signer, Wallet } from "ethers";
import {
  ICreatureModel,
  iterateAllCreatures,
  iterateAllCreaturesHatchingLessThan,
  needsHatching,
  removeCreaturesFromDatabase,
  saveCreatureToDatabase,
} from "./models/creature.js";
import {
  addPendingUpdateTransaction,
  getPendingUpdateTransactions,
  IUpdateBaseUri,
  removePendingUpdateTransaction,
} from "./models/updateBaseUri.js";
import { updateBaseUriToTokenCount } from "./ipfs/metadata.js";
import {
  addScannedBlock,
  getLastScannedBlock,
  IScannedBlock,
} from "./models/scannedBlock.js";
import { ChildCreatureERC721 } from "./typechain/index.js";

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

async function getDeploymentBlock(
  contract: Contract,
  provider: providers.Provider
) {
  let blockNumber = contract?.deployTransaction?.blockNumber;
  if (contract?.deployTransaction && !blockNumber) {
    // OKay... well is there a transaction hash?
    const transactionHash = contract?.deployTransaction?.hash;
    const transaction = await provider.getTransaction(transactionHash);
    blockNumber = transaction.blockNumber;
  }

  if (!blockNumber) {
    // Can't find anything, so we'll just search the last 100 blocks
    blockNumber = await provider.getBlockNumber();
    blockNumber = blockNumber - 100;
  }
  const block = provider.getBlock(blockNumber);
  return block;
}

interface IBlock {
  block: number;
  blockHash: string;
}

export async function resolver(
  numberOfBlocksToWait: number,
  childCreatureContract: ChildCreatureERC721,
  provider: providers.Provider,
  cidProvider: (
    lastKnownTokenId: number,
    currentTokenId: number
  ) => Promise<string>,
  db: Database
): Promise<void> {
  console.log("Resolving creatures...");
  // check if any minted tokens exist that need to hatch
  const tokenCount = await childCreatureContract.tokenCount();
  const lastScannedBlock: IScannedBlock | null = await getLastScannedBlock(db);
  // Check for tokens that don't actually exist and need to be removed
  const creaturesToRemove: BigNumber[] = [];
  // Creatures that need to be hatched
  const creaturesToHatch: ICreatureModel[] = [];
  // Creatures that have been hatched
  const creaturesToSave: ICreatureModel[] = [];

  // Iterate over all tokens and check if they are minted and waiting to hatch
  const [creatures, cancel] = await iterateAllCreatures(db);
  let lastKnownTokenId = BigNumber.from(0);

  // Find the most recent scanned block
  const contractGenesisBlock = await getDeploymentBlock(
    childCreatureContract,
    provider
  );
  const lastScanned = lastScannedBlock
    ? {
        block: lastScannedBlock.block,
        blockHash: lastScannedBlock.blockHash,
      }
    : {
        block: contractGenesisBlock.number,
        blockHash: contractGenesisBlock.hash,
      };

  const currentBlockNumber = await provider.getBlockNumber();
  const currentBlockHash = (await provider.getBlock(currentBlockNumber)).hash;
  // get relevant transactions...
  const transactionMinted = childCreatureContract.filters.Transfer(
    "0x0000000000000000000000000000000000000000",
    null,
    null
  );
  const mintedEvents = await childCreatureContract.queryFilter(
    transactionMinted,
    lastScanned.block - 1
  );

  console.log(`Last scanned block: ${lastScanned.block}`);
  console.log(`Current block: ${currentBlockNumber}`);

  function updateIfCreatureNeedsHatching(
    creature: ICreatureModel
  ): [boolean, IBlock | null] {
    if (needsHatching(creature)) {
      // Find matching event
      const matchingEvent = mintedEvents.find((event) =>
        event.args.tokenId.eq(creature.tokenId)
      );
      if (
        (matchingEvent &&
          matchingEvent.blockNumber + numberOfBlocksToWait <=
            currentBlockNumber) ||
        (creature.block &&
          creature.block + numberOfBlocksToWait <= currentBlockNumber)
      ) {
        console.info(`� Hatching BABY creature ${creature.tokenId} �`);
        creaturesToHatch.push(creature);
        lastKnownTokenId = creature.tokenId.gt(lastKnownTokenId)
          ? creature.tokenId
          : lastKnownTokenId;
        return [true, null];
      }
      if (matchingEvent) {
        // console.log(
        //   `${
        //     creature.tokenId
        //   } does not need to be hatched yet. There are still ${
        //     matchingEvent.blockNumber +
        //     numberOfBlocksToWait -
        //     currentBlockNumber
        //   } blocks to wait.`
        // );
        return [
          false,
          {
            block: matchingEvent.blockNumber,
            blockHash: matchingEvent.blockHash,
          },
        ];
      } else {
        // console.log(`${creature.tokenId} does not have a matching event`);
        return [false, null];
      }
    }
    // console.log(`${creature.tokenId} does not need hatching`);
    return [false, null];
  }
  let creaturesFromDb: ICreatureModel[] = [];
  for await (const creature of creatures) {
    creaturesFromDb.push(creature);
    if (tokenCount.lt(creature.tokenId)) {
      console.info(
        `Creature ${
          creature.tokenId
        } is greater than ${tokenCount.toString()}. Skipping and will be removed.`
      );
      creaturesToRemove.push(creature.tokenId);
      continue;
    }
    updateIfCreatureNeedsHatching(creature);
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
      const proposedCreature: ICreatureModel = {
        tokenId,
        status: "unknown",
      };
      const [wasUpdated, updatedOnBlock] =
        updateIfCreatureNeedsHatching(proposedCreature);
      if (!wasUpdated && !creaturesFromDb.find((c) => c.tokenId.eq(tokenId))) {
        console.log(`Creature ${tokenId} is new and being saved.`);
        creaturesToSave.push({
          ...proposedCreature,
          ...updatedOnBlock,
        });
      }
    }
  }
  // Fetch pending transactions, to make sure we don't double-hatch
  const pendingTransactions = await getPendingUpdateTransactions(db);
  // Find pending transactions to remove
  const transactionsThatHaveConfirmed: IUpdateBaseUri[] = [];

  for (let pendingTransaction of pendingTransactions) {
    if (pendingTransaction.pendingTx) {
      const transaction = await provider.getTransaction(
        pendingTransaction.pendingTx
      );
      if (
        transaction &&
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
  if (creaturesToHatch.length > 0) {
    // Create a new CID for the new package
    console.log(
      `Generating new CID for ${creaturesToHatch.length} creature(s)...`
    );
    const newBaseCid = await cidProvider(
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
  if (lastScanned.blockHash !== currentBlockHash) {
    await addScannedBlock(
      db,
      lastKnownTokenId,
      currentBlockHash,
      currentBlockNumber
    );
  }
}

export default async function (
  network: Network,
  ipfsClient: IPFSHTTPClient,
  db: Database,
  intervalMs: number = 60 * 1000,
  numberOfBlocksToWait: number = 10
) {
  const provider = defaultProvider(network);
  // await provider.send("evm_setAutomine", [false]);
  // await provider.send("evm_setIntervalMining", [1000]);
  const networkProvider = await provider.getNetwork();
  const ownerAddress = childCreatureERC721OwnerAddress(networkProvider.name);

  const { topToken$, contract: creatureContract } =
    await childCreatureErc721Factory(network);
  let signer: Signer;
  try {
    signer = provider.getSigner(ownerAddress);
  } catch (err) {
    if (!process.env.PRIVATE_KEY) {
      throw new Error("Please set the PRIVATE_KEY environment variable");
    }
    const wallet = new Wallet(process.env.PRIVATE_KEY, provider);
    signer = wallet;
  }
  // Start the resolver
  console.log("Starting resolver...");
  merge(interval(intervalMs), topToken$)
    .pipe(
      concatMap(() =>
        from(
          resolver(
            numberOfBlocksToWait,
            creatureContract.connect(signer),
            provider,
            async (lastKnownTokenId, tokenCount) =>
              await updateBaseUriToTokenCount(
                ipfsClient,
                lastKnownTokenId,
                tokenCount
              ),
            db
          )
        )
      )
    )
    .subscribe(() => "console.log('Resolver ran')");
}
