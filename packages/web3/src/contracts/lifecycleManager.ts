import type { providers, Signer } from "ethers";
import {
  LifecycleManager,
  LifecycleManager__factory,
} from "@creaturenft/contracts";
import contractFactory from "../utils/contract.js";
import { Network } from "../networks.js";

export default function (
  signer: Signer,
  network: providers.Network,
  networkName: Network
) {
  return contractFactory<LifecycleManager>(
    signer,
    network,
    networkName,
    "LifecycleManager",
    LifecycleManager__factory.connect
  );
}
