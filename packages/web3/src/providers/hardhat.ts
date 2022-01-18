import { providers } from "ethers";

const hardhatUrl = () => process.env.HARDHAT_URL || "http://localhost:8545";

// Ignores specific network requirements and instead connects to localhost provider
export default function () {
  return new providers.JsonRpcProvider({
    url: hardhatUrl(),
  });
}
