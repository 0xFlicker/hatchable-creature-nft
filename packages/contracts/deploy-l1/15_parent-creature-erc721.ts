import { HardhatRuntimeEnvironment } from "hardhat/types";
import "@nomiclabs/hardhat-ethers";
import "hardhat-deploy";
import { DeployFunction } from "hardhat-deploy/types";

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments, getNamedAccounts, network, ethers, run } = hre;
  const { deploy } = deployments;

  console.log(`Deploying libraries to ${network.name}`);
  const { owner } = await getNamedAccounts();

  const rlpReaderResult = await deploy("RLPReader", {
    from: owner,
  });
  const exitPayloadReaderResult = await deploy("ExitPayloadReader", {
    from: owner,
    libraries: {
      RLPReader: rlpReaderResult.address,
    },
  });
  const merkleResult = await deploy("Merkle", {
    from: owner,
  });
  const merklePatriciaProofResult = await deploy("MerklePatriciaProof", {
    from: owner,
    libraries: {
      RLPReader: rlpReaderResult.address,
    },
  });

  const crossChainResult = await deploy("CrossChain", {
    from: owner,
    waitConfirmations: 4,
  });

  try {
    await run("verify:verify", {
      address: exitPayloadReaderResult.address,
      libraries: {
        RLPReader: rlpReaderResult.address,
      },
      contract: "contracts/lib/ExitPayloadReader.sol:ExitPayloadReader",
    });
  } catch (err: any) {
    console.log(`Failed to verify ExitPayloadReader: ${err.message}`);
  }

  try {
    await run("verify:verify", {
      address: merkleResult.address,
      contract: "contracts/lib/Merkle.sol:Merkle",
    });
  } catch (err: any) {
    console.log(`Failed to verify Merkle: ${err.message}`);
  }
  try {
    await run("verify:verify", {
      address: merklePatriciaProofResult.address,
      libraries: {
        RLPReader: rlpReaderResult.address,
      },
      contract: "contracts/lib/MerklePatriciaProof.sol:MerklePatriciaProof",
    });
  } catch (err: any) {
    console.log(`Failed to verify MerklePatriciaProof: ${err.message}`);
  }
  try {
    await run("verify:verify", {
      address: rlpReaderResult.address,
      contract: "contracts/lib/RLPReader.sol:RLPReader",
    });
  } catch (err: any) {
    console.log(`Failed to verify RLPReader: ${err.message}`);
  }
  try {
    await run("verify:verify", {
      address: crossChainResult.address,
      contract: "contracts/lib/CrossChain.sol:CrossChain",
    });
  } catch (err: any) {
    console.log(`Failed to verify CrossChain: ${err.message}`);
  }
};
export default func;
func.tags = ["goerli", "mainnet", "libraries"];
