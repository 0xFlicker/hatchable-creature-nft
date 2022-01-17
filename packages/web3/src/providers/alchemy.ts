import { providers } from "ethers";
import { Network } from "../networks.js";

function apiKey(network: Network): string | undefined {
  switch (network) {
    case "matic":
      return process.env.ALCHEMY_MATIC_API_KEY;
    case "maticmum":
      return process.env.ALCHEMY_MATICMUM_API_KEY;
  }
}

export function supports(network: Network): boolean {
  return !!apiKey(network);
}

export default function (
  network: Network,
  preferWebsocket: boolean
): providers.Provider {
  if (preferWebsocket) {
    return new providers.AlchemyWebSocketProvider(network, apiKey(network));
  }
  return new providers.AlchemyProvider(network, apiKey(network));
}
