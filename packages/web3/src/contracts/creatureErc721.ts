import { BigNumber, providers } from "ethers";
import {
  ReplaySubject,
  distinctUntilChanged,
  last,
  isEmpty,
  firstValueFrom,
  iif,
  from,
  map,
  mergeMap,
  tap,
} from "rxjs";
import { Network } from "../networks";
import fallbackProvider from "../providers/fallback.js";
import {
  CreatureERC721,
  CreatureERC721__factory,
} from "@creaturenft/contracts";
import { TransferEvent } from "@creaturenft/contracts/typechain/ERC721";
import contractFactory from "../utils/contract.js";

export async function creatureErc721ContractFactory(
  provider: providers.Provider
) {
  const network = await provider.getNetwork();
  return contractFactory(
    provider,
    network,
    "CreatureERC721",
    CreatureERC721__factory.connect
  );
}

export function cachedTokenIsMinted(contract: CreatureERC721) {
  const topTokenSubject = new ReplaySubject<BigNumber>(1);
  contract.on("Transfer", (from: string, to: string, tokenId: BigNumber) => {
    console.log("Transfer event:", from, to, tokenId.toNumber());
    topTokenSubject.next(tokenId);
  });

  function topTokenObservable() {
    return topTokenSubject.asObservable().pipe(
      // Take latest if it is larger than the current value
      distinctUntilChanged((a, b) => a.lt(b)),
      // Take the last value
      last()
    );
  }
  const topToken$ = topTokenObservable();
  const tokenChecker = async (tokenId: BigNumber) => {
    return firstValueFrom(
      topTokenObservable().pipe(
        isEmpty(),
        mergeMap((empty: boolean) =>
          iif(() => empty, from(contract.tokenCount()), topTokenObservable())
        ),
        tap((currentTokenCount) => topTokenSubject.next(currentTokenCount)),
        map((currentTokenCount) => currentTokenCount.gte(tokenId))
      )
    );
  };
  return {
    topTokenChecker: tokenChecker,
    topToken$,
  };
}

export default async function (network: Network) {
  const provider = fallbackProvider(network, true);
  const contract = await creatureErc721ContractFactory(provider);
  return {
    ...cachedTokenIsMinted(contract),
    contract,
    provider,
  };
}
