import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";
import { ChildCreatureERC721__factory } from "../typechain";
import { isLocalNetwork } from "../utils/network";

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments, getNamedAccounts, network, ethers, run } = hre;

  const { deploy } = deployments;
  console.log(`Deploying to ${network.name}`);
  const { owner } = await getNamedAccounts();

  const childContractResult = await deploy("ChildCreatureERC721", {
    from: owner,
  });
  const ownerSigner = await ethers.getSigner(owner);
  const childContractFactory = new ChildCreatureERC721__factory();
  const childContract = childContractFactory
    .connect(ownerSigner)
    .attach(childContractResult.address);
  await childContract.grantRole(await childContract.ROLE_REVEALER(), owner);
};
export default func;
func.tags = ["local"];
