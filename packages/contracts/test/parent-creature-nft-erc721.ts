import { ethers } from "hardhat";
import { expect } from "chai";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { ParentCreatureERC721__factory } from "../typechain";
import { CrossChain__factory } from "../typechain/factories/CrossChain__factory";
import { RLPReader__factory } from "../typechain/factories/RLPReader__factory";
import { ExitPayloadReader__factory } from "../typechain/factories/ExitPayloadReader__factory";
import { Merkle__factory } from "../typechain/factories/Merkle__factory";
import { MerklePatriciaProof__factory } from "../typechain/factories/MerklePatriciaProof__factory";

async function basicContract(signer: SignerWithAddress) {
  const crossChainFactory = new CrossChain__factory(signer);
  const crossChainLib = await crossChainFactory.deploy();
  const rlpReaderFactory = new RLPReader__factory(signer);
  const rlpReaderLib = await rlpReaderFactory.deploy();
  const exitPayloadReaderFactory = new ExitPayloadReader__factory(
    {
      "contracts/lib/RLPReader.sol:RLPReader": rlpReaderLib.address,
    },
    signer
  );
  const exitPayloadReaderLib = await exitPayloadReaderFactory.deploy();
  const merkleFactory = new Merkle__factory(signer);
  const merkleLib = await merkleFactory.deploy();
  const merklePatriciaProofFactory = new MerklePatriciaProof__factory(
    {
      "contracts/lib/RLPReader.sol:RLPReader": rlpReaderLib.address,
    },
    signer
  );
  const merklePatriciaProofLib = await merklePatriciaProofFactory.deploy();

  const factory = new ParentCreatureERC721__factory(
    {
      "contracts/lib/CrossChain.sol:CrossChain": crossChainLib.address,
      "contracts/lib/RLPReader.sol:RLPReader": rlpReaderLib.address,
      "contracts/lib/ExitPayloadReader.sol:ExitPayloadReader":
        exitPayloadReaderLib.address,
      "contracts/lib/Merkle.sol:Merkle": merkleLib.address,
      "contracts/lib/MerklePatriciaProof.sol:MerklePatriciaProof":
        merklePatriciaProofLib.address,
    },
    signer
  );
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
    accounts = (await ethers.getSigners()) as any;
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
