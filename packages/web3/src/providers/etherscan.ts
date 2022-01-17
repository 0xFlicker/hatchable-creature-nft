import { providers } from "ethers";
import { Network } from "../networks.js";

function etherscanApiKey() {
  return process.env.ETHERSCAN_API_KEY;
}

export function supports(network: Network): boolean {
  return ["mainnet", "ropsten", "rinkeby", "kovan", "goerli"].some(
    (n) => n === network
  );
}

export default function (network: Network) {
  return new providers.EtherscanProvider(network, etherscanApiKey());
}
