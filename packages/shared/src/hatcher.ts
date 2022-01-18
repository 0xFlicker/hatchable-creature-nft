import { interval, merge, concatMap, takeLast, from, map, tap } from "rxjs";
import { networks } from "@creaturenft/contracts";
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
  iterateAllCreates,
  needsHatching,
  removeCreaturesFromDatabase,
  saveCreatureToDatabase,
} from "./models/creature.js";
import {
  CreatureERC721,
  LifecycleManager,
} from "@creaturenft/contracts/typechain";

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

export async function resolver(
  creatureContract: CreatureERC721,
  lifecycleManagerContract: LifecycleManager,
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
  const [creatures, cancel] = await iterateAllCreates(db);
  let lastKnownTokenId = BigNumber.from(0);
  for await (const creature of creatures) {
    console.log(`Checking creature ${creature.tokenId.toNumber()}`);
    if (tokenCount.lt(creature.tokenId)) {
      console.info(
        `Creature ${
          creature.tokenId
        } is greater than ${tokenCount.toString()}. Skipping and will be removed.`
      );
      creaturesToRemove.push(creature.tokenId);
      continue;
    }
    // Check if the creature has been hatched
    if (creature.status === "hatching" && creature.pendingTx) {
      const tx = await provider.getTransaction(creature.pendingTx);
      if (tx.blockNumber) {
        console.info(`Creature ${creature.tokenId} has been hatched`);
        creature.pendingTx = null;
        creature.status = "hatched";
        creaturesToSave.push(creature);
        continue;
      }
    }

    // TODO: Check if pending transaction is stale / failed
    if (needsHatching(creature) && !creature.pendingTx) {
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
      const tokenUri = await creatureContract.tokenURI(tokenId);
      if (!tokenUri.includes(getAdultCreatureMetadata(tokenId))) {
        creaturesToHatch.push({
          tokenId,
          status: "unknown",
          pendingTx: null,
        });
      } else {
        creaturesToSave.push({
          tokenId,
          status: "hatched",
          pendingTx: null,
        });
      }
    }
  }
  // Hatch any creatures that need to be hatched

  if (creaturesToHatch.length > 0) {
    const tokenUris = creaturesToHatch.map(
      ({ tokenId }) => `ipfs://${getAdultCreatureMetadata(tokenId)}`
    );
    console.log(`Hatching ${creaturesToHatch.length} creatures`);
    const tx = await lifecycleManagerContract.batchHatch(
      creaturesToHatch.map(({ tokenId }) => tokenId),
      tokenUris
    );
    for (const creature of creaturesToHatch) {
      creature.pendingTx = tx.hash;
      creature.status = "hatching";
      creaturesToSave.push(creature);
    }
  }
  // Update the database with the new status
  for (const creature of creaturesToSave) {
    await saveCreatureToDatabase(db, creature);
  }
}

export default async function (
  network: Network,
  db: Database,
  intervalMs: number = 60 * 1000
) {
  const provider = defaultProvider(network);
  await provider.send("evm_setAutomine", [false]);
  await provider.send("evm_setIntervalMining", [20000]);
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
      tap(() => console.log("Resolving creatures...")),
      map(() => undefined),
      concatMap(() => {
        console.log("Inside concatMap");
        return from(resolver(creatureContract, lifecycleManager, provider, db));
      })
    )
    .subscribe(() => "console.log('Resolver ran')");
}
