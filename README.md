**THIS IS NOT A FINISHED PRODUCT**
**USE AT YOUR OWN RISK**

# Hatchable Creature NFT

## What are we trying to make endlessly complicated?

The current trend in NFTs is to have an NFT that remains "hidden" during a set period of time. This is usually accomplished by the owner of the contract setting the original minting to point to a dummy metadata/images that is revealed at a later date by resetting the baseURI for the entire token contract. This only requires a single contract call my the owner and can be done entirely on IPFS.

This implementation is far more complicated.

## How do we make this really complicated?

This repo is an "in progress" implementation of a smart contract that demonstrates a "hatchable" NFT. A hatchable NFT is an NFT that when minted, starts off as an egg. The egg can have unique metadata and image, though since it is still already hard-coded and deployed to IPFS we can assume that the contents of an egg is known to participants.

A backend process watches for minting events. A separate LifecycleManager smart contract is able to "hatch" NFTs. After a configurable time (currently set to ASAP) the lifecycle manager contract will "hatch" the NFT and update the tokenUri, rather than the baseUri. Since the purchaser of an egg does not know what the LifecycleManager will update the NFT tokenUri to, the NFT minter has no way of known what the new NFT will look like. This new tokenUri is still on IPFS, so once updated the record is immutable.

The owner of the LifecycleManager contract both pays for gas as well is the oracle that knows final collection composition. This contract works best on an L2 chain like Polygon or for NFTs with enough minting cost to cover the second transaction.
