import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";
import { ParentCreatureERC721__factory } from "../typechain";
import { preApprovedProxyAddress } from "../utils/contracts";

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments, getNamedAccounts, network, ethers, run } = hre;
  const { deploy } = deployments;
  if (!["goerli", "mainnet"].includes(network.name)) {
    console.log(`Network ${network.name} not supported`);
    return;
  }

  console.log(`Deploying main contract to ${network.name}`);
  const { owner } = await getNamedAccounts();

  const networkName = network.name as "goerli" | "mainnet";

  const rlpReaderDeployment = await deployments.get("RLPReader");
  const merklePatriciaProofDeployment = await deployments.get(
    "MerklePatriciaProof"
  );
  const merkleDeployment = await deployments.get("Merkle");
  const exitPayloadReaderResult = await deployments.get("ExitPayloadReader");
  const crossChainDeployment = await deployments.get("CrossChain");
  const parentContractResult = await deploy("ParentCreatureERC721", {
    from: owner,
    libraries: {
      RLPReader: rlpReaderDeployment.address,
      ExitPayloadReader: exitPayloadReaderResult.address,
      MerklePatriciaProof: merklePatriciaProofDeployment.address,
      Merkle: merkleDeployment.address,
      CrossChain: crossChainDeployment.address,
    },
    waitConfirmations: 4,
  });
  const ownerSigner = await ethers.getSigner(owner);
  const parentContractFactory = new ParentCreatureERC721__factory({
    "contracts/lib/RLPReader.sol:RLPReader": rlpReaderDeployment.address,
    "contracts/lib/ExitPayloadReader.sol:ExitPayloadReader":
      exitPayloadReaderResult.address,
    "contracts/lib/MerklePatriciaProof.sol:MerklePatriciaProof":
      merklePatriciaProofDeployment.address,
    "contracts/lib/Merkle.sol:Merkle": merkleDeployment.address,
    "contracts/lib/CrossChain.sol:CrossChain": crossChainDeployment.address,
  });
  const parentContract = parentContractFactory
    .connect(ownerSigner)
    .attach(parentContractResult.address);
  if (preApprovedProxyAddress[networkName]) {
    await parentContract.setPreApprovedProxy(
      preApprovedProxyAddress[networkName]
    );
  }

  try {
    await run("verify:verify", {
      address: parentContract.address,
      constructorArguments: [],
    });
  } catch (err: any) {
    console.log(`Error verifying parent contract: ${err}`);
  }
};
export default func;
func.tags = ["goerli", "mainnet"];
