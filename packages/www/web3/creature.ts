import { ethers } from "ethers";
import {
  CreatureERC721,
  CreatureERC721__factory,
} from "@creaturenft/contracts/typechain";
import { networks } from "@creaturenft/contracts";
import { findContractAddress } from "@creaturenft/web3";
import config from "../utils/config";
import { web3Provider } from "../utils/provider";

export function creatureContractFactory() {
  const provider = web3Provider(config.network);
  const contractAddress = findContractAddress(
    networks,
    config.chainId,
    config.network,
    "CreatureERC721"
  );
  if (!contractAddress) {
    throw new Error("Contract not found");
  }
  const contract = CreatureERC721__factory.connect(contractAddress, provider);
  return contract;
}
