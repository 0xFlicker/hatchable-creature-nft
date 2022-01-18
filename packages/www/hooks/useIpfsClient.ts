import { create as createIpfsHttpClient } from "ipfs-http-client";
import { useMemo } from "react";

export default function useIpfsClient() {
  const ipfsUrl = process.env.NEXT_IPFS_API_GATEWAY;
  const ipfs = useMemo(
    () =>
      createIpfsHttpClient({
        url: ipfsUrl,
      }),
    []
  );
  return ipfs;
}
