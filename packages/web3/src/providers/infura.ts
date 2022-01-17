import { providers } from "ethers";
import { Network } from "../networks.js";

const infuraApiKey = () => process.env.INFURA_PROJECT_ID;
const infuraApiSecret = () => process.env.INFURA_PROJECT_SECRET;

function supportsWebsocket(network: Network): boolean {
  switch (network) {
    case "matic":
    case "maticmum":
      return false;
    default:
      return true;
  }
}

export function supports(network: Network): boolean {
  return true;
}

export default function (network: Network, preferWebsocket: boolean) {
  if (preferWebsocket && supportsWebsocket(network)) {
    return new providers.InfuraWebSocketProvider(network, infuraApiKey());
  } else {
    return new providers.InfuraProvider(network, {
      projectId: infuraApiKey(),
      secret: infuraApiSecret(),
    });
  }
}
