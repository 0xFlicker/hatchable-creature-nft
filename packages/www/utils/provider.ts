import { fallbackProvider, Network } from "@creaturenft/web3";
import { ethers } from "ethers";

export function web3Provider(network: Network) {
  if (window.ethereum) {
    return new ethers.providers.Web3Provider(window.ethereum);
  }
  return fallbackProvider(network, true);
}
