import * as IpfsClient from "ipfs-http-client";

const ipfsUrl = process.env.IPFS_URL || "http://localhost:5002";

export default function () {
  const ipfs = IpfsClient.create({
    url: ipfsUrl,
  });
  return ipfs;
}
