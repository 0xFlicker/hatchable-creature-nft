**THIS IS NOT A FINISHED PRODUCT**
**USE AT YOUR OWN RISK**

# Hatchable Creature NFT

## What are we trying to make endlessly complicated?

The current trend in NFTs is to have an NFT that remains "hidden" during a set period of time. This is usually accomplished by the owner of the contract setting the original minting to point to a dummy metadata/images that is revealed at a later date by resetting the baseURI for the entire token contract. This only requires a single contract call my the owner and can be done entirely on IPFS.

This implementation is far more complicated.

## How do we make this really complicated?

This repo is an "in progress" implementation of a smart contract that demonstrates a "hatchable" NFT. A hatchable NFT is an NFT that when minted, starts off as an egg. The egg can have unique metadata and image, though since it is still already hard-coded and deployed to IPFS we can assume that the contents of an egg is known to participants.

A backend process watches for transfer events. A separate LifecycleManager smart contract is able to update the baseUri and keeps track of the latest revealed token. Once the a mint is noticed, the lifecycle manager contract will generate a new baseUri. Since the purchaser of an egg does not know what the LifecycleManager will update the NFT baseUri to, the NFT minter has no way of known what the new NFT will look like. The new baseUri points to a new IPFS mutable FS that contains the newly minted NFTs revealed.

The owner of the LifecycleManager contract both pays for gas as well is the oracle that knows final collection composition. This contract works best on an L2 chain like Polygon or for NFTs with enough minting cost to cover the second transaction.

## Prerequisites

- Node 16
- yarn (`npm -g yarn` to install)

## Setup

hatchable-nft-creatures is Typescript monorepo. Everything is included in order to test locally a NFT minting and reveal.

### Dependencies

From the root of the repo, install node dependencies:

```
yarn install
```

### Compile contracts and prepare a local test node

Because it ends up being a dependency on so much else, the contracts must be compiled first. Once compiled a local hardhat test node can be started.

_(in its own terminal tab)_

```
yarn workspace @creaturenft/contracts compile
yarn workspace @creaturenft/contracts start:dev
```

Take note of the private keys. 1-3 are used by the deployer. Other addresses can be loaded into metamask to use for testing. Under no circumstances should these addresses be used on the mainnet.

### Start IPFS

An IPFS daemon is provided that creates a local IPFS node. In production a hosted IPFS node can be used or the node can be connected itself.

_(in its own terminal tab)_

```
yarn workspace @creaturenft/ipfs daemon
```

Check http://localhost:5002/webui after a few moments to see if IPFS WebUI reports green status

### Generate test assets

Example NFTs are provided in the form of Emoji NFTs that should under circumstances be used for an actual NFT because that would be stealing.

```
yarn workspace @creaturenft/assets generate
yarn workspace @creaturenft/assets upload
```

### Start the backend

The backend listens for minting events and reveals NFTs.

_(in its own terminal tab)_

```
yarn workspace @creaturenft/backend start:dev
```

### Start the frontend

Still very much a work in progress.

_(in its own terminal tab)_

```
yarn workspace @creaturenft/www dev
```

### Configure metamask

Use a localhost RPC:

Name: Localhost
RPC: http://localhost:8545
ChainID: 31337

Load an address with local currency on the testnet. Use a private key from launching the local node. Name this address **DO NOT USE ON LIVE** because it should never ever receive livenet currency. It should 10000 ETH loaded in it.

Account #15: 0xcd3b766ccdd6ae721141f452c550ca635964ce71 (10000 ETH)
Private Key: 0x8166f546bab6da521a8369cab06c5d2b9e46670292d85c875ee9ec20e84ffb61

### Testing

Webpage is at http://localhost:3000 and is very basic. As of this writing there is not even a mint button! However mints can be performed from the terminal...

When freshly setup, there are no tokens. Visiting http://localhost:3000/token/1 will show a "Not Found" page

Run:

```
yarn workspace @creaturenft/contracts mint:localhost 0xcd3b766ccdd6ae721141f452c550ca635964ce71
```

And within 15s the NFT will be revealed. There will be a brief period where an Egg is shown while waiting for the backend to hatch.
