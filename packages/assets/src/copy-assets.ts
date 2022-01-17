import fs from "fs";
import { resolve, dirname } from "path";
import { assetPath } from "./index.js";
import type { IMetadata } from "./types.js";
import { fileURLToPath } from "url";
import { clientFactory as createClient } from "@creaturenft/ipfs";
import type { IPFSHTTPClient } from "ipfs-http-client";

const __dirname = dirname(fileURLToPath(import.meta.url));

function metadataToBabyMetadata(
  metadata: IMetadata,
  babyImageCid: string
): IMetadata {
  return {
    ...metadata,
    name: `Baby ${metadata.name}`,
    image: babyImageCid,
    attributes: [],
  };
}

function addViaIpfsClient(
  client: IPFSHTTPClient,
  candidate: Parameters<IPFSHTTPClient["add"]>[0],
  name: string
): ReturnType<IPFSHTTPClient["add"]> {
  const startTime = Date.now();
  console.log(`Adding ${name} to IPFS...`);
  return new Promise((resolve, reject) => {
    client.add(candidate).then((result) => {
      const time = (Date.now() - startTime) / 1000;
      console.log(`Finish adding ${name} in ${time.toFixed(2)}s`);
      resolve(result);
    }, reject);
  });
}

const ipfsClient = createClient();
const localAssetsPath = resolve(__dirname, "metadata");
const generatedPath = resolve(assetPath, "generated");
const generatedImagePath = resolve(generatedPath, "images");
const generatedMetadataPath = resolve(generatedPath, "metadata");
const eggImagePath = resolve(assetPath, "assets", "egg.png");

const eggResults = await addViaIpfsClient(
  ipfsClient,
  {
    content: await fs.promises.readFile(eggImagePath),
  },
  "egg.png"
);
const eggCid = `ipfs://${eggResults.cid.toString()}`;
const metadataCids: string[] = [];
const metadataBabyCids: string[] = [];

console.log(`Loading metadata from ${generatedMetadataPath}...`);
const metadataFiles = (await fs.promises.readdir(generatedMetadataPath))
  .filter((f) => Number.isFinite(Number(f)))
  .sort((a, b) => Number(a) - Number(b));

const length = metadataFiles.length;
for (let i = 0; i < length; i++) {
  const file = metadataFiles[i];
  const index = Number(file);
  const imageFilePath = resolve(generatedImagePath, `${index}.png`);
  const imageResult = await addViaIpfsClient(
    ipfsClient,
    {
      content: await fs.promises.readFile(imageFilePath),
    },
    `image: ${index}.png`
  );
  const cid = imageResult.cid.toString();
  const metadataFilePath = resolve(generatedMetadataPath, file);
  const metadata = JSON.parse(
    await fs.promises.readFile(metadataFilePath, "utf8")
  );
  metadata.image = `ipfs://${cid}`;
  const babyMetadata = metadataToBabyMetadata(metadata, eggCid);
  const metadataContent = JSON.stringify(metadata, null, 2);
  const metadataBabyContent = JSON.stringify(babyMetadata, null, 2);
  const metadataResult = await addViaIpfsClient(
    ipfsClient,
    {
      content: metadataContent,
    },
    `metadata: ${index}`
  );
  metadataCids.push(metadataResult.cid.toString());

  const metadataBabyResult = await addViaIpfsClient(
    ipfsClient,
    {
      content: metadataBabyContent,
    },
    `baby metadata: ${index}`
  );
  metadataBabyCids.push(metadataBabyResult.cid.toString());
}

await fs.promises.mkdir(localAssetsPath, { recursive: true });
await fs.promises.writeFile(
  resolve(localAssetsPath, "all_metadata_cids.json"),
  JSON.stringify(metadataCids, null, 2),
  "utf8"
);
await fs.promises.writeFile(
  resolve(localAssetsPath, "all_metadata_baby_cids.json"),
  JSON.stringify(metadataBabyCids, null, 2),
  "utf8"
);
