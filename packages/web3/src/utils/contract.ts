import type { Signer } from "ethers";
import { providers } from "ethers";
import { networks } from "@creaturenft/contracts";
import { Network } from "../networks.js";
import { findContractAddress } from "../networks.js";
import type { BaseContract } from "@ethersproject/contracts";

type ConnectableContractFactory<T extends BaseContract> = (
  address: string,
  providerOrSigner: providers.Provider | Signer
) => T;

export default function contractFactory<T extends BaseContract>(
  signerOrProvider: Signer | providers.Provider,
  network: providers.Network,
  networkName: Network,
  contractName: string,
  contractFactory: ConnectableContractFactory<T>
) {
  try {
    const contactAddress = findContractAddress(
      networks,
      network.chainId.toString(),
      networkName,
      contractName
    );
    if (!contactAddress) {
      throw new Error(`No contract address found for network ${network.name}`);
    }
    const contract = contractFactory(contactAddress, signerOrProvider);
    return contract;
  } catch (e: any) {
    console.log("No deployment network found for network:", network.name);
    throw e;
  }
}
