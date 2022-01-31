import { IMetadata } from "@creaturenft/web3";
import { useEffect, useMemo, useState } from "react";
import { ipfsGatewayUrl, loadUtf8Content } from "../utils/ipfs";
import useCreatureERC721 from "./useCreatureERC721";
import useIpfsClient from "./useIpfsClient";

export default function useCreatureMetadata(tokenId?: number) {
  const [loaded, setLoaded] = useState(false);
  const [exists, setExists] = useState(false);
  const [hatched, setHatched] = useState(false);

  const ipfsClient = useIpfsClient();
  const { contract } = useCreatureERC721();

  const [metadata, setMetadata] = useState<IMetadata | null>(null);
  useEffect(() => {
    if (loaded) {
      return;
    }
    const abortController = new AbortController();
    async function fetchMetadata() {
      if (!contract || typeof tokenId !== "number" || !exists) {
        return;
      }
      const metadataUri = await contract.tokenURI(tokenId);
      if (!metadataUri) {
        return;
      }
      console.log(`Loading metadata for ${tokenId} from ${metadataUri}`);
      const metadataContent = await loadUtf8Content(
        ipfsClient,
        metadataUri,
        abortController
      );
      if (!metadataContent) {
        return;
      }
      setMetadata(JSON.parse(metadataContent));
      setLoaded(true);
    }
    fetchMetadata();
    return () => abortController.abort();
  }, [tokenId, contract, exists, loaded]);

  useEffect(() => {
    async function fetchCreatureCount() {
      if (!contract || typeof tokenId === "undefined") {
        return;
      }
      try {
        const count = await contract.tokenCount();
        setExists(count.gte(tokenId));
      } catch (err) {
        console.error(err);
        // Probably doesn't exist
        setExists(false);
      }
    }
    fetchCreatureCount();
  }, [tokenId, contract]);

  useEffect(() => {
    // Subscribe to transfer events
    if (!contract || typeof tokenId !== "number") {
      return;
    }
    const transferHandler = (
      _: any,
      __: any,
      _tokenId: { eq: (arg0: number) => any }
    ) => {
      if (_tokenId.eq(tokenId)) {
        setLoaded(true);
        setExists(true);
      }
    };
    contract.on("Transfer", transferHandler);
    return () => {
      contract.removeListener("Transfer", transferHandler);
    };
  }, [tokenId, contract]);
  useEffect(() => {
    // Subscribe to hatched events
    if (!contract || typeof tokenId !== "number") {
      return;
    }
    const hatchedHandler = () => {
      setLoaded(false);
    };
    contract.on("BaseURIUpdated", hatchedHandler);
    return () => {
      contract.removeListener("BaseURIUpdated", hatchedHandler);
    };
  }, [tokenId, contract]);

  return useMemo(
    () => ({
      loaded,
      exists,
      metadata,
      imgSrc: metadata?.image && ipfsGatewayUrl(metadata?.image),
    }),
    [metadata, loaded, exists]
  );
}
