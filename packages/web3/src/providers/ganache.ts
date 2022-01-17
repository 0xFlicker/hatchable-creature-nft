import { providers } from "ethers";

const ganacheUrl = () => process.env.GANACHE_URL || "http://localhost:7545";

// Ignores specific network requirements and instead connects to localhost provider
export default function () {
  return new providers.JsonRpcProvider({
    url: ganacheUrl(),
  });
}
