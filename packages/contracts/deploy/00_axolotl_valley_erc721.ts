import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";
import { ethers } from "hardhat";
import { parseUnits } from "ethers/lib/utils";
import { isLocalNetwork } from "../utils/network";

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments, getNamedAccounts, network } = hre;
  const { deploy } = deployments;
  const debugMode = isLocalNetwork(network.name);

  const { owner, manager } = await getNamedAccounts();
  const defaultContractOptions = {
    log: debugMode,
    autoMine: debugMode,
  };
  const lifecycleManagerDeployment = await deploy("LifecycleManager", {
    from: manager,
    args: ["0x0000000000000000000000000000000000000000"],
    ...defaultContractOptions,
  });
  const nftDeployment = await deploy("CreatureERC721", {
    from: owner,
    args: [
      "http://localhost:3000/metadata/",
      "0x0000000000000000000000000000000000000000",
      lifecycleManagerDeployment.address,
      parseUnits("1", "ether"),
      100,
    ],
    ...defaultContractOptions,
  });
  await deployments.execute(
    "LifecycleManager",
    {
      from: manager,
      ...defaultContractOptions,
    },
    "setManagedContract",
    nftDeployment.address
  );
};
export default func;
func.tags = ["CreatureERC721"];
