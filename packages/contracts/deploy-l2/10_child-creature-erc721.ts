import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";
import { parseUnits } from "ethers/lib/utils";
import { ChildCreatureERC721__factory } from "../typechain";
import {
  childManagerProxy,
  fxStateTransferChild,
  preApprovedProxyAddress,
} from "../utils/contracts";

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments, getNamedAccounts, network, ethers, run } = hre;
  const { deploy } = deployments;
  if (!["matic", "maticmum"].includes(network.name)) {
    console.log(`Network ${network.name} not supported`);
    return;
  }

  console.log(`Deploying to ${network.name}`);
  const { owner } = await getNamedAccounts();

  const networkName = network.name as "matic" | "maticmum";
  const childContractArgs = [childManagerProxy[networkName]];
  const childContractResult = await deploy("ChildCreatureERC721", {
    from: owner,
    args: childContractArgs,
  });

  const ownerSigner = await ethers.getSigner(owner);
  const childContractFactory = new ChildCreatureERC721__factory();
  const childContract = childContractFactory
    .connect(ownerSigner)
    .attach(childContractResult.address);
  if (preApprovedProxyAddress[networkName]) {
    await childContract.setPreApprovedProxy(
      preApprovedProxyAddress[networkName]
    );
  }
  if (fxStateTransferChild[networkName]) {
    await childContract.setFxRootTunnel(fxStateTransferChild[networkName]);
    await childContract.grantRole(
      await childContract.ROLE_ROOT_TUNNEL(),
      fxStateTransferChild[networkName]
    );
  }
  await run("verify:verify", {
    address: childContract.address,
    constructorArguments: childContractArgs,
  });
};
export default func;
func.tags = ["matic", "maticmum"];
