import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";
import { parseUnits } from "ethers/lib/utils";
import babyMetadataCid from "../utils/baby_metadata.json";
import { isLocalNetwork } from "../utils/network";

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments, getNamedAccounts, network } = hre;
  const { deploy } = deployments;
  const debugMode = isLocalNetwork(network.name);
  console.log(`Deploying to ${network.name}`);
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
      `ipfs://${babyMetadataCid}/`,
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
