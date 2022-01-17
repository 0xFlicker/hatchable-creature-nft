import { providers } from "ethers";
import { Network } from "../networks.js";

export const polygonscanApiKey = () => process.env.POLYGON_API_KEY;

class PolygonscanProvider extends providers.EtherscanProvider {
  getBaseUrl(): string {
    switch (this.network ? this.network.name : "invalid") {
      case "matic":
        return "https://api.polygonscan.com";
      case "maticmum":
        return "https://api-testnet.polygonscan.com";
      default:
    }
    return super.getBaseUrl();
  }
}

export function supports(network: Network): boolean {
  return ["matic", "maticmum"].some((n) => n === network);
}

export default function (network: Network) {
  return new PolygonscanProvider(network, polygonscanApiKey());
}
