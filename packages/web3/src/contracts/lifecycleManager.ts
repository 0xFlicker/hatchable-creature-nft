import type { providers, Signer } from "ethers";
import {
  LifecycleManager,
  LifecycleManager__factory,
} from "@creaturenft/contracts";
import contractFactory from "../utils/contract.js";

export default function (signer: Signer, network: providers.Network) {
  return contractFactory<LifecycleManager>(
    signer,
    network,
    "LifecycleManager",
    LifecycleManager__factory.connect
  );
}
