import { BigNumber, providers } from "ethers";
import {
  ReplaySubject,
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
  ChildCreatureERC721,
  ChildCreatureERC721__factory,
} from "@creaturenft/contracts";
import contractFactory from "../utils/contract.js";

export async function childCreatureErc721ContractFactory(
  provider: providers.Provider,
  networkName: Network
) {
  const network = await provider.getNetwork();
  return contractFactory(
    provider,
    network,
    networkName,
    "ChildCreatureERC721",
    ChildCreatureERC721__factory.connect
  );
}

export function cachedTokenIsMinted(contract: ChildCreatureERC721) {
  const topTokenSubject = new ReplaySubject<BigNumber>(1);
  contract.on("Transfer", (from: string, to: string, tokenId: BigNumber) => {
    console.log("Transfer event:", from, to, tokenId.toNumber());
    // Only care about minting events
    if (from === "0x0000000000000000000000000000000000000000") {
      topTokenSubject.next(tokenId);
    }
  });

  function topTokenObservable() {
    return topTokenSubject.asObservable();
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
  const contract = await childCreatureErc721ContractFactory(provider, network);
  return {
    ...cachedTokenIsMinted(contract),
    contract,
    provider,
  };
}
