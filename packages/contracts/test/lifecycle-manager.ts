import { ethers } from "hardhat";
import { expect } from "chai";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { BigNumberish } from "@ethersproject/bignumber";

async function createNftContract(
  {
    baseUrl = "http://localhost:3000/metadata/",
    proxy = "0x0000000000000000000000000000000000000000",
    lifecycleManager = "0x0000000000000000000000000000000000000000",
    mintCost = ethers.utils.parseUnits("1", "ether"),
    maxTokens = 100,
  }: {
    baseUrl?: string;
    proxy?: string;
    lifecycleManager?: string;
    mintCost?: BigNumberish;
    maxTokens?: BigNumberish;
  } = {
    baseUrl: "http://localhost:3000/metadata/",
    proxy: "0x0000000000000000000000000000000000000000",
    lifecycleManager: "0x0000000000000000000000000000000000000000",
    mintCost: ethers.utils.parseUnits("1", "ether"),
    maxTokens: 100,
  }
) {
  const factory = await ethers.getContractFactory("AxolotlValleyERC721");
  const greeter = await factory.deploy(
    baseUrl,
    proxy,
    lifecycleManager,
    mintCost,
    maxTokens
  );
  return await greeter.deployed();
}

async function createLifecycleContract(signer?: SignerWithAddress) {
  const factory = await ethers.getContractFactory("LifecycleManager", signer);
  const lifecycleManager = await factory.deploy(
    "0x0000000000000000000000000000000000000000"
  );
  return await lifecycleManager.deployed();
}

describe("LifecycleManager", function () {
  let accounts: SignerWithAddress[];
  this.beforeAll(async () => {
    accounts = await ethers.getSigners();
  });

  it("can hatch", async () => {
    const [owner, manager, user] = accounts;
    const lifecycleContract = await createLifecycleContract(manager);
    const nftContract = await createNftContract({
      lifecycleManager: lifecycleContract.address,
      baseUrl: "",
    });
    await lifecycleContract.setManagedContract(nftContract.address);
    // Mint a token
    await nftContract.connect(user).mint(user.address, {
      value: ethers.utils.parseUnits("1", "ether"),
    });
    // When minted, the tokenUri points at the hatching uri
    expect(await nftContract.tokenURI(1)).to.equal("1");

    // Hatch the token
    await lifecycleContract.connect(manager).hatch(1, "foo");

    // When hatched, the tokenUri points at the hatched uri
    expect(await nftContract.tokenURI(1)).to.equal("foo");
  });

  it("must be connected to nft contract", async () => {
    const [owner, manager, user] = accounts;
    const lifecycleContract = await createLifecycleContract(manager);
    const nftContract = await createNftContract({
      lifecycleManager: lifecycleContract.address,
      baseUrl: "",
    });

    // Mint a token
    await nftContract.connect(user).mint(user.address, {
      value: ethers.utils.parseUnits("1", "ether"),
    });
    // When minted, the tokenUri points at the hatching uri
    expect(await nftContract.tokenURI(1)).to.equal("1");

    // attempt to hatch the token is an error
    await expect(
      lifecycleContract.connect(manager).hatch(1, "foo")
    ).to.be.revertedWith("function call to a non-contract account");
  });

  it("only owner can connect to the NFT", async () => {
    const [owner, manager, user] = accounts;
    const lifecycleContract = await createLifecycleContract(manager);
    const nftContract = await createNftContract({
      lifecycleManager: lifecycleContract.address,
      baseUrl: "",
    });

    // Attempt to connect to the NFT by other than owner account is an error
    await expect(
      lifecycleContract.connect(user).setManagedContract(nftContract.address)
    ).to.be.revertedWith("Ownable: caller is not the owner");
  });

  it("token must exist", async () => {
    const [owner, manager, user] = accounts;
    const lifecycleContract = await createLifecycleContract(manager);
    const nftContract = await createNftContract({
      lifecycleManager: lifecycleContract.address,
      baseUrl: "",
    });
    // Connect the contracts
    await lifecycleContract.setManagedContract(nftContract.address);
    // Hatch the token that does not exist is an error
    await expect(
      lifecycleContract.connect(manager).hatch(1, "foo")
    ).to.be.revertedWith("ERC721URIStorage: URI set of nonexistent token");
  });
});
