import { IPFSHTTPClient } from "ipfs-http-client";
import adultMetadataCids from "../all_metadata_cids.json";
import metadataIpfsBasePath from "../metadataBasePath.json";
import { loadUtf8Content } from "../utils/ipfs.js";

async function* generateImportCandidates(
  ipfsClient: IPFSHTTPClient,
  fromTokenCount: number,
  toTokenCount: number
) {
  for (let i = fromTokenCount; i <= toTokenCount; i++) {
    const cid = adultMetadataCids[i];
    yield {
      content: await loadUtf8Content(ipfsClient, cid),
      path: `${metadataIpfsBasePath}/${i}`,
    };
  }
}

export async function updateBaseUriToTokenCount(
  ipfsClient: IPFSHTTPClient,
  fromTokenCount: number,
  toTokenCount: number
) {
  for await (const { content, path } of generateImportCandidates(
    ipfsClient,
    fromTokenCount + 1,
    toTokenCount
  )) {
    console.log(
      `Adding metadata to ${path} with content length: ${content.length}`
    );
    await ipfsClient.files.write(path, content);
  }
  const statResult = await ipfsClient.files.stat(metadataIpfsBasePath);
  return `ipfs://${statResult.cid.toString()}/`;
}
