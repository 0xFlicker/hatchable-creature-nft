import { providers } from "ethers";
import defaultProvider from "./default.js";
import alchemyProviderFactory, {
  supports as alchemySupportsNet,
} from "./alchemy.js";
import etherscanProviderFactory, {
  supports as etherscanSupportsNet,
} from "./etherscan.js";
import infuraProviderFactory, {
  supports as infuraSupportsNet,
} from "./infura.js";
import polygonProviderFactory, {
  supports as polygonSupportsNet,
} from "./polygonscan.js";
import { Network } from "../networks.js";

/*
 * Production network provider
 */
export default function (
  network: Network,
  preferWebsocket: boolean
): providers.Provider {
  // If running against ganache or localhost, use the local provider
  if (
    network === "ganache" ||
    network === "hardhat-node" ||
    network === "localhost"
  ) {
    return defaultProvider(network);
  }
  const allProviders: providers.Provider[] = [];
  if (alchemySupportsNet(network)) {
    allProviders.push(alchemyProviderFactory(network, preferWebsocket));
  }
  if (etherscanSupportsNet(network)) {
    allProviders.push(etherscanProviderFactory(network));
  }
  if (infuraSupportsNet(network)) {
    allProviders.push(infuraProviderFactory(network, preferWebsocket));
  }
  if (polygonSupportsNet(network)) {
    allProviders.push(polygonProviderFactory(network));
  }
  if (allProviders.length === 0) {
    throw new Error(`No provider for network ${network}`);
  }
  return new providers.FallbackProvider(allProviders, 1);
}
