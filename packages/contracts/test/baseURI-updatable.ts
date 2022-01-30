import { ethers } from "hardhat";
import { expect } from "chai";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { ChildCreatureERC721__factory } from "../typechain";

async function createChildContract(signer: SignerWithAddress) {
  const factory = new ChildCreatureERC721__factory(signer);
  const contract = await factory.deploy();
  return await contract.deployed();
}

function randomIpfsHash() {
  const hash = ethers.utils.randomBytes(34);
  hash[0] = 18;
  hash[1] = 32;
  return hash;
}

describe("Update baseURI", function () {
  let accounts: SignerWithAddress[];
  this.beforeAll(async () => {
    accounts = await ethers.getSigners();
  });

  it("can hatch", async () => {
    const [owner, manager, user] = accounts;
    const childContract = await createChildContract(owner);
    await childContract.grantRole(
      await childContract.ROLE_REVEALER(),
      manager.address
    );
    const firstHash = randomIpfsHash();
    await childContract.connect(manager).setBaseURI(firstHash);
    // Mint a token
    await childContract.connect(user).mint(user.address, {
      value: ethers.utils.parseUnits("1", "ether"),
    });
    // When minted, the tokenUri points at the hatching uri
    expect(await childContract.tokenURI(1)).to.equal(
      `ipfs://${ethers.utils.base58.encode(firstHash)}/1`
    );

    // Hatch the token
    const newBaseUri = randomIpfsHash();
    await childContract.connect(manager).setBaseURI(newBaseUri);
    // When hatched, the tokenUri points at the hatched uri
    expect(await childContract.tokenURI(1)).to.equal(
      `ipfs://${ethers.utils.base58.encode(newBaseUri)}/1`
    );
  });

  it("only admin can connect to the NFT", async () => {
    const [owner, manager, user] = accounts;
    const childContract = await createChildContract(owner);

    await expect(
      childContract
        .connect(manager)
        .grantRole(await childContract.ROLE_REVEALER(), manager.address)
    ).to.be.revertedWith(
      "AccessControl: account 0x70997970c51812dc3a010c7d01b50e0d17dc79c8 is missing role 0x0000000000000000000000000000000000000000000000000000000000000000"
    );
  });
});
