import type { IPFSHTTPClient } from "ipfs-http-client";
import config from "../utils/config";
export function stripIpfsProtocol(maybeIpfsProtocol: string) {
  const imgComponents = maybeIpfsProtocol.split("ipfs://");
  if (imgComponents.length > 0) {
    return imgComponents[1];
  }
  return maybeIpfsProtocol;
}

export function ipfsGatewayUrl(ipfsUrl: string) {
  const ipfsPath = stripIpfsProtocol(ipfsUrl);
  return `${config.ipfsGateway}/ipfs/${ipfsPath}`;
}

export async function loadUtf8Content(
  ipfsClient: IPFSHTTPClient,
  ipfsUrl: string,
  abortController?: AbortController
) {
  const ipfsPath = stripIpfsProtocol(ipfsUrl);
  if (!ipfsPath) {
    return;
  }
  console.log(`Loading ${ipfsPath} from IPFS`);
  const resolvedIpfsCid = await ipfsClient.resolve(`/ipfs/${ipfsPath}`);
  console.log(`Resolved ${ipfsPath} to ${resolvedIpfsCid}`);
  const textDecoder = new TextDecoder();
  let content = "";
  for await (let metadataBuf of ipfsClient.cat(resolvedIpfsCid, {
    signal: abortController?.signal,
  })) {
    content += textDecoder.decode(metadataBuf);
  }
  return content;
}
