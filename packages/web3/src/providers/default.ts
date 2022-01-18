import { providers } from "ethers";
import infuraProviderFactory from "./infura.js";
import ganacheProviderFactory from "./ganache.js";
import hardhatProviderFactory from "./hardhat.js";
import { Network } from "../networks.js";

export default function (network: Network): providers.JsonRpcProvider {
  if (network === "ganache") {
    return ganacheProviderFactory();
  }
  if (network === "hardhat-node") {
    return hardhatProviderFactory();
  }
  if (network === "localhost") {
    return hardhatProviderFactory();
  }
  // Return a single JSONRPC provider for the given network.
  return infuraProviderFactory(network, false);
}
