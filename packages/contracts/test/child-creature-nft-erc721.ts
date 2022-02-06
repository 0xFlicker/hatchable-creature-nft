import { ethers } from "hardhat";
import { expect } from "chai";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { ChildCreatureERC721__factory } from "../typechain";

async function basicContract(signer: SignerWithAddress) {
  const factory = new ChildCreatureERC721__factory(signer);
  const greeter = await factory.deploy(
    "0x0000000000000000000000000000000000000000"
  );
  return await greeter.deployed();
}

/*
 * uncomment accounts to access the test accounts made available by the
 * Ethereum client
 * See docs: https://www.trufflesuite.com/docs/truffle/testing/writing-tests-in-javascript
 */
describe("CreatureERC721", function () {
  let accounts: SignerWithAddress[];
  this.beforeAll(async () => {
    accounts = (await ethers.getSigners()) as any;
  });

  it("perfectly normal mint pays owner", async () => {
    const [owner, user] = accounts;
    const contract = await basicContract(owner);
    await contract.setMintCost(ethers.utils.parseUnits("1"));
    await expect(() =>
      contract.connect(user).mint(user.address, {
        value: ethers.utils.parseUnits("1"),
      })
    ).to.changeEtherBalance(contract, ethers.utils.parseUnits("1", "ether"));
  });
  // it("credits 1 token to the minter", async () => {
  //   const user = accounts[1];
  //   const contract = await basicContract();
  //   await expect(() =>
  //     contract.connect(user).mint(user.address, {
  //       value: ethers.utils.parseUnits("1"),
  //     })
  //   ).changeTokenBalance(contract, user, 1);
  // });
  // it("can be minted to another address", async () => {
  //   const [owner, user, friend] = accounts;
  //   const contract = await basicContract();
  //   await expect(() =>
  //     contract.connect(user).mint(friend.address, {
  //       value: ethers.utils.parseUnits("1"),
  //     })
  //   ).to.changeEtherBalance(contract, ethers.utils.parseUnits("1", "ether"));
  //   await expect(() =>
  //     contract.connect(user).mint(friend.address, {
  //       value: ethers.utils.parseUnits("1"),
  //     })
  //   ).changeTokenBalance(contract, friend, 1);
  //   await expect(() =>
  //     contract.connect(user).mint(friend.address, {
  //       value: ethers.utils.parseUnits("1"),
  //     })
  //   ).changeTokenBalance(contract, user, 0);
  // });
  // it("requires mint value", async () => {
  //   const user = accounts[1];
  //   const contract = await basicContract();
  //   await expect(
  //     contract.connect(user).mint(user.address, {
  //       value: ethers.utils.parseUnits("0.5"),
  //     })
  //   ).to.be.revertedWith("Insufficient payment");
  // });
  // it("owner can set mint cost", async () => {
  //   const [owner, user] = accounts;
  //   const contract = await basicContract();
  //   await contract
  //     .connect(owner)
  //     .setMintCost(ethers.utils.parseUnits("0.5", "ether"));
  //   expect(await contract.mintCost()).to.equal(
  //     ethers.utils.parseUnits("0.5", "ether")
  //   );
  //   await expect(
  //     contract.connect(user).mint(user.address, {
  //       value: ethers.utils.parseUnits("0.25"),
  //     })
  //   ).to.be.revertedWith("Insufficient payment");
  //   await contract
  //     .connect(owner)
  //     .setMintCost(ethers.utils.parseUnits("0.25", "ether"));
  //   await expect(() =>
  //     contract.connect(user).mint(user.address, {
  //       value: ethers.utils.parseUnits("0.25"),
  //     })
  //   ).changeTokenBalance(contract, user, 1);
  // });

  // it("only owner can set mint cost", async () => {
  //   const user = accounts[1];
  //   const contract = await basicContract();
  //   await expect(
  //     contract
  //       .connect(user)
  //       .setMintCost(ethers.utils.parseUnits("0.5", "ether"))
  //   ).to.be.reverted;
  // });

  // it("only lifecycle manager can hatch", async () => {
  //   const [owner, user] = accounts;
  //   const contract = await basicContract();
  //   await contract.connect(user).mint(user.address, {
  //     value: ethers.utils.parseUnits("1"),
  //   });
  //   await expect(contract.connect(owner).setBaseURI("foo")).to.be.reverted;
  // });
});
