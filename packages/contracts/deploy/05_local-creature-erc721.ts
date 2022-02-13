import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";
import { ChildCreatureERC721__factory } from "../typechain";

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments, getNamedAccounts, network, ethers } = hre;

  const { deploy } = deployments;
  console.log(`Deploying to ${network.name}`);
  const { owner } = await getNamedAccounts();

  const crossChainResult = await deploy("CrossChain", {
    from: owner,
    waitConfirmations: 4,
  });

  const childContractResult = await deploy("ChildCreatureERC721", {
    from: owner,
    args: ["0x0000000000000000000000000000000000000000"],
  });
  const ownerSigner = await ethers.getSigner(owner);
  const childContractFactory = new ChildCreatureERC721__factory({
    "contracts/lib/CrossChain.sol:CrossChain": crossChainResult.address,
  });
  const childContract = childContractFactory
    .connect(ownerSigner)
    .attach(childContractResult.address);
  await childContract.grantRole(await childContract.ROLE_REVEALER(), owner);
};
export default func;
func.tags = ["local"];
