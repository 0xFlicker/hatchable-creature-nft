import { networkStringToNetworkType } from "@creaturenft/web3";

if (!process.env.NEXT_CHAIN_ID) {
  throw new Error("NEXT_CHAIN_ID is not set");
}
if (!process.env.NEXT_IPFS_GATEWAY) {
  throw new Error("NEXT_IPFS_GATEWAY is not set");
}
if (!process.env.NEXT_IPFS_API_GATEWAY) {
  throw new Error("NEXT_IPFS_API_GATEWAY is not set");
}

export const chainId = process.env.NEXT_CHAIN_ID;
export const network = networkStringToNetworkType(process.env.NEXT_NETWORK);
export const ipfsGateway = process.env.NEXT_IPFS_GATEWAY;
export const ipfsApiGateway = process.env.NEXT_IPFS_API_GATEWAY;
export default {
  chainId,
  network,
  ipfsGateway,
  ipfsApiGateway,
};
