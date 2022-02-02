import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";
import { ParentCreatureERC721__factory } from "../typechain";
import {
  fxStateCheckpointManager,
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
  const parentContractArgs = [
    mintableErc721Proxy[networkName],
    fxStateCheckpointManager[networkName],
  ];
  const parentContractResult = await deploy("ParentCreatureERC721", {
    from: owner,
    args: parentContractArgs,
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

  await run("verify:verify", {
    address: parentContract.address,
    constructorArguments: parentContractArgs,
  });
};
export default func;
func.tags = ["goerli", "mainnet"];
