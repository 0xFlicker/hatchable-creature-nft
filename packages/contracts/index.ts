import networks from "./deployments/networks.json";
import fs from "fs";
import { resolve } from "path";
export * from "./typechain/index.js";

export function getContractOwner(network: string, contractName: string) {
  // FIXME: no code safety here, this will blow up if anything is missing
  const contractJson = JSON.parse(
    fs.readFileSync(
      resolve(__dirname, "..", `./deployments/${network}/${contractName}.json`),
      "utf8"
    )
  );
  return contractJson.receipt.from;
}

export { networks };
