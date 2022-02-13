import { expect, use } from "chai";
import { utils, Wallet } from "ethers";
import sqlite3, { Database } from "sqlite3";
import { stub } from "sinon";
import { MockProvider, solidity } from "ethereum-waffle";
import runMigrations from "../migrations/index.js";
import { resolver } from "../hatcher.js";
import { getCreatureCount } from "../models/creature.js";
import { CrossChain__factory } from "../typechain/factories/CrossChain__factory.js";
import { ChildCreatureERC721__factory } from "../typechain/factories/ChildCreatureERC721__factory.js";

use(solidity);

describe("#resolver", () => {
  let provider: MockProvider;
  let owner: Wallet, user: Wallet;

  function createDb() {
    return new Promise<Database>((resolve, reject) => {
      const db = new sqlite3.Database(":memory:", (err) => {
        if (err) {
          reject(err);
          return;
        }
        resolve(db);
      });
    });
  }

  async function createContract() {
    const libraryFactory = new CrossChain__factory(owner);
    const crossChainLib = await libraryFactory.deploy();
    const factory = new ChildCreatureERC721__factory(
      {
        "../contracts/contracts/lib/CrossChain.sol:CrossChain":
          crossChainLib.address,
      },
      owner
    );
    return await factory.deploy();
  }

  async function createEmptyState() {
    const db = await createDb();
    await runMigrations(db, 3);
    const childContract = await createContract();
    await childContract.grantRole(
      await childContract.ROLE_REVEALER(),
      owner.address
    );
    const cidProvider = stub();
    return {
      db,
      childContract,
      cidProvider,
    };
  }

  beforeEach(async () => {
    provider = new MockProvider();
    [owner, user] = provider.getWallets();
  });

  it("can mint", async () => {
    const childContract = await createContract();
    await expect(childContract.mint(owner.address)).to.emit(
      childContract,
      "Transfer"
    );
  });

  it("can resolve and hatch immediately", async () => {
    const hello = utils.base58.encode(Buffer.from("hello"));
    const { db, childContract, cidProvider } = await createEmptyState();

    await childContract.mint(owner.address);
    cidProvider.returns(Promise.resolve(hello));
    await resolver(0, childContract, provider, cidProvider, db);
    expect(await childContract.tokenURI(1)).to.equal(`ipfs://${hello}/1`);
    expect(await childContract.tokenCount()).to.equal(1);
  });

  it("can take multiple blocks to hatch, but within the back scan", async () => {
    const { db, childContract, cidProvider } = await createEmptyState();

    await childContract.mint(owner.address);
    const hello = utils.base58.encode(Buffer.from("hello1"));
    cidProvider.returns(Promise.resolve(hello));

    for (let i = 0; i < 6; i++) {
      await resolver(4, childContract, provider, cidProvider, db);
      // Check that there is only 1 creature saved
      expect(await getCreatureCount(db)).to.equal(1);
      await provider.send("evm_mine", []);
    }
    expect(await childContract.tokenCount()).to.equal(1);
    expect(await childContract.tokenURI(1)).to.equal(`ipfs://${hello}/1`);
  });

  it("can take multiple blocks to hatch, but outside the back scan", async () => {
    const { db, childContract, cidProvider } = await createEmptyState();

    await childContract.mint(owner.address);
    const hello = utils.base58.encode(Buffer.from("hello1"));
    cidProvider.returns(Promise.resolve(hello));

    for (let i = 0; i < 10; i++) {
      await resolver(9, childContract, provider, cidProvider, db);
      // Check that there is only 1 creature saved
      expect(await getCreatureCount(db)).to.equal(1);
      await provider.send("evm_mine", []);
    }
    expect(await childContract.tokenCount()).to.equal(1);
    expect(await childContract.tokenURI(1)).to.equal(`ipfs://${hello}/1`);
  });

  it("creatures that mine while waiting for a reveal can also reveal", async () => {
    const { db, childContract, cidProvider } = await createEmptyState();

    await childContract.mint(owner.address);
    const hello1 = utils.base58.encode(Buffer.from("hello3"));
    const hello2 = utils.base58.encode(Buffer.from("hello4"));
    cidProvider.returns(Promise.resolve(hello1));

    for (let i = 0; i <= 2; i++) {
      await resolver(4, childContract, provider, cidProvider, db);
      // Check that there is only 1 creature saved
      expect(await getCreatureCount(db)).to.equal(1);
      await provider.send("evm_mine", []);
    }

    await childContract.mint(owner.address);

    for (let i = 0; i <= 2; i++) {
      await resolver(4, childContract, provider, cidProvider, db);
      // Check that there is only 1 creature saved
      expect(await getCreatureCount(db)).to.equal(2);
      await provider.send("evm_mine", []);
    }

    expect(await childContract.tokenCount()).to.equal(2);
    expect(await childContract.tokenURI(1)).to.equal(`ipfs://${hello1}/1`);

    for (let i = 0; i <= 3; i++) {
      await resolver(
        4,
        childContract,
        provider,
        stub().returns(Promise.resolve(hello2)),
        db
      );
      // Check that there is only 1 creature saved
      expect(await getCreatureCount(db)).to.equal(2);
      await provider.send("evm_mine", []);
    }
    expect(await childContract.tokenURI(2)).to.equal(`ipfs://${hello2}/2`);
  });
});
