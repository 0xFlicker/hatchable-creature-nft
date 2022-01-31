import { ethers } from "hardhat";
import { expect } from "chai";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { BigNumberish } from "@ethersproject/bignumber";
import { ParentCreatureERC721__factory } from "../typechain";

async function basicContract(signer: SignerWithAddress) {
  const factory = new ParentCreatureERC721__factory(signer);
  const contract = await factory.deploy();
  return await contract.deployed();
}

/*
 * The parent contract that lives on Ethereum
 *
 *  - Accepts mintable tokens from ROLE_PREDICATE
 *  - Updates from child chain also sets token acount and baseURI
 *  - ERC721 compatible
 *  - BaseURI is stored as raw bytes, but is converted to a string on read
 */

describe("ParentCreatureERC721", function () {
  let accounts: SignerWithAddress[];
  this.beforeAll(async () => {
    accounts = await ethers.getSigners();
  });

  it("empty state", async () => {
    const [owner] = accounts;
    const contract = await basicContract(owner);
    expect(await contract.tokenCount()).to.equal(0);
    await expect(contract.tokenURI(1)).to.be.revertedWith(
      "ERC721URIStorage: URI query for nonexistent token"
    );
  });
  it("mint with no metadata", async () => {
    const [owner, predicate, user] = accounts;
    const contract = await basicContract(owner);
    await contract.grantRole(
      await contract.ROLE_PREDICATE(),
      predicate.address
    );
    await expect(() =>
      contract.connect(predicate)["mint(address,uint256)"](user.address, 1)
    ).changeTokenBalance(contract, user, 1);
    expect(await contract.tokenCount()).to.eq(1);
    expect(await contract.tokenURI(1)).to.equal("ipfs:///1");
  });
  it("Predicate can mint, set total and hash", async () => {
    const [owner, predicate, user] = accounts;
    const contract = await basicContract(owner);
    await contract.grantRole(
      await contract.ROLE_PREDICATE(),
      predicate.address
    );
    await expect(() =>
      contract
        .connect(predicate)
        ["mint(address,uint256,bytes)"](
          user.address,
          1,
          ethers.utils.solidityPack(
            ["uint256", "bytes"],
            [
              1,
              ethers.utils.base58.decode(
                "QmT3NPzjwMUmtaMGZZcXenKj69kVvk4QtiRHNxHjWojxTE"
              ),
            ]
          )
        )
    ).changeTokenBalance(contract, user, 1);
    expect(await contract.tokenCount()).to.eq(1);
    expect(await contract.tokenURI(1)).to.equal(
      "ipfs://QmT3NPzjwMUmtaMGZZcXenKj69kVvk4QtiRHNxHjWojxTE/1"
    );
  });
});
