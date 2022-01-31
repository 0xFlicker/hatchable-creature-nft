import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";
import { parseUnits } from "ethers/lib/utils";
import { ParentCreatureERC721__factory } from "../typechain";
import babyMetadataCid from "../utils/baby_metadata.json";
import { isLocalNetwork } from "../utils/network";
import {
  childManagerProxy,
  fxStateCheckpointManager,
  fxStateTransferChild,
  fxStateTransferRoot,
  mintableErc721Proxy,
  preApprovedProxyAddress,
} from "../utils/contracts";

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments, getNamedAccounts, network, ethers, run } = hre;
  const { deploy } = deployments;
  if (!["goerli", "mainnet"].includes(network.name)) {
    console.log(`Network ${network.name} not supported`);
    return;
  }

  console.log(`Deploying to ${network.name}`);
  const { owner } = await getNamedAccounts();

  const networkName = network.name as "goerli" | "mainnet";

  const parentContractResult = await deploy("ParentCreatureERC721", {
    from: owner,
  });
  const ownerSigner = await ethers.getSigner(owner);
  const parentContractFactory = new ParentCreatureERC721__factory();
  const parentContract = parentContractFactory
    .connect(ownerSigner)
    .attach(parentContractResult.address);
  if (preApprovedProxyAddress[networkName]) {
    await parentContract.setPreApprovedProxy(
      preApprovedProxyAddress[networkName]
    );
  }
  if (fxStateCheckpointManager[networkName]) {
    await parentContract.setCheckpointManager(
      fxStateCheckpointManager[networkName]
    );
  }
  if (mintableErc721Proxy[networkName]) {
    await parentContract.grantRole(
      await parentContract.ROLE_PREDICATE(),
      mintableErc721Proxy[networkName]
    );
  }

  await run("verify:verify", {
    address: parentContract.address,
    constructorArguments: [],
  });
};
export default func;
func.tags = ["goerli", "mainnet"];
