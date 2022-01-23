import fs from "fs";
import { resolve, dirname } from "path";
import { randomUUID } from "crypto";
import { assetPath } from "./index.js";
import type { IMetadata } from "@creaturenft/web3";
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
async function main() {
  const ipfsClient = createClient();
  const localAssetsPath = resolve(__dirname, "..", "src", "metadata");
  const localContractAssetsPath = resolve(
    __dirname,
    "..",
    "..",
    "contracts",
    "utils"
  );
  const localSharedPackagePath = resolve(
    __dirname,
    "..",
    "..",
    "shared",
    "src"
  );
  const generatedPath = resolve(assetPath, "generated");
  const generatedImagePath = resolve(generatedPath, "images");
  const generatedMetadataPath = resolve(generatedPath, "metadata");
  const eggImagePath = resolve(assetPath, "generated", "egg.png");
  console.log(`localAssetsPath: ${localAssetsPath}`);
  const eggResults = await addViaIpfsClient(
    ipfsClient,
    {
      content: await fs.promises.readFile(eggImagePath),
    },
    "egg.png"
  );
  const eggCid = `ipfs://${eggResults.cid.toString()}`;
  const metadataCids: string[] = [];

  console.log(`Loading metadata from ${generatedMetadataPath}...`);
  const metadataFiles = (await fs.promises.readdir(generatedMetadataPath))
    .filter((f) => Number.isFinite(Number(f)))
    .sort((a, b) => Number(a) - Number(b));

  const metadataIpfsBasePath = `/${randomUUID()}`;
  console.log(`Adding baby metadata to base path ${metadataIpfsBasePath}...`);
  await ipfsClient.files.mkdir(metadataIpfsBasePath);
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
    await ipfsClient.files.write(
      `${metadataIpfsBasePath}/${index}`,
      metadataBabyContent,
      {
        create: true,
      }
    );
  }
  const babyBaseResult = await ipfsClient.files.stat(metadataIpfsBasePath);

  // TODO: move these things into a shared IPFS location or save to a DB rather than using local FS
  await fs.promises.mkdir(localAssetsPath, { recursive: true });
  await fs.promises.writeFile(
    resolve(localAssetsPath, "all_metadata_cids.json"),
    JSON.stringify(metadataCids, null, 2),
    "utf8"
  );
  await fs.promises.writeFile(
    resolve(localContractAssetsPath, "baby_metadata.json"),
    JSON.stringify(babyBaseResult.cid.toString(), null, 2),
    "utf8"
  );
  await fs.promises.writeFile(
    resolve(localSharedPackagePath, "metadataBasePath.json"),
    JSON.stringify(metadataIpfsBasePath, null, 2),
    "utf8"
  );
  await fs.promises.writeFile(
    resolve(localSharedPackagePath, "all_metadata_cids.json"),
    JSON.stringify(metadataCids, null, 2),
    "utf8"
  );
}

main().then(
  () => {
    console.log("Done!");
  },
  (err) => {
    console.error(err);
    process.exit(1);
  }
);
