import { providers } from "ethers";
import infuraProviderFactory from "./infura.js";
import ganacheProviderFactory from "./ganache.js";
import { Network } from "../networks.js";

export default function (network: Network): providers.JsonRpcProvider {
  if (network === "ganache") {
    return ganacheProviderFactory();
  }
  // Return a single JSONRPC provider for the given network.
  return infuraProviderFactory(network, false);
}
