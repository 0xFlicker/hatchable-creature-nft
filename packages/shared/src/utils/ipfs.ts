import { IPFSHTTPClient } from "ipfs-http-client";

export async function loadUtf8Content(
  ipfsClient: IPFSHTTPClient,
  ipfsCid: string,
  abortController?: AbortController
) {
  const textDecoder = new TextDecoder();
  let content = "";
  for await (let metadataBuf of ipfsClient.cat(ipfsCid, {
    signal: abortController?.signal,
  })) {
    content += textDecoder.decode(metadataBuf);
  }
  return content;
}
