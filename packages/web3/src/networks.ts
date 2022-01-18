export type Network =
  | "mainnet"
  | "ropsten"
  | "rinkeby"
  | "kovan"
  | "goerli"
  | "matic"
  | "maticmum"
  | "ganache"
  | "hardhat-node"
  | "localhost";

export function networkStringToNetworkType(network?: string) {
  if (
    [
      "mainnet",
      "ropsten",
      "rinkeby",
      "kovan",
      "goerli",
      "matic",
      "maticmum",
      "ganache",
      "hardhat-node",
      "localhost",
    ].some((e) => e === network)
  ) {
    return network as Network;
  }
  return "ganache";
}

export function findContract(
  deploymentData: any,
  chainId: string,
  networkName: string,
  contractName: string
): any {
  const { [chainId]: networks } = deploymentData;
  if (!networks) {
    return null;
  }

  networkName = networkName === "unknown" ? "ganache" : networkName;
  const {
    [networkName]: { contracts },
  } = networks;
  if (!contracts) {
    return null;
  }
  const { [contractName]: contract } = contracts;
  if (!contract) {
    return null;
  }
  return contract;
}

export function findContractAddress(
  deploymentData: any,
  chainId: string,
  networkName: string,
  contractName: string
): string | null {
  const contract = findContract(
    deploymentData,
    chainId,
    networkName,
    contractName
  );
  if (!contract.address) {
    return null;
  }
  return contract.address;
}

export function findContractOwnerAddress(
  deploymentData: any,
  chainId: string,
  networkName: string,
  contractName: string
): string | null {
  const contract = findContract(
    deploymentData,
    chainId,
    networkName,
    contractName
  );
  const {
    receipt: { from },
  } = contract;
  if (!from) {
    return null;
  }
  return from;
}
