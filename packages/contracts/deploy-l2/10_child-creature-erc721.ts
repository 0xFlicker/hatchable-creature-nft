import type { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";
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
  const crossChainDeployment = await deployments.get("CrossChain");
  const childContractResult = await deploy("ChildCreatureERC721", {
    from: owner,
    libraries: {
      CrossChain: crossChainDeployment.address,
    },
  });

  const ownerSigner = await ethers.getSigner(owner);
  const childContractFactory = new ChildCreatureERC721__factory({
    "contracts/lib/CrossChain.sol:CrossChain": crossChainDeployment.address,
  });
  const childContract = childContractFactory
    .connect(ownerSigner)
    .attach(childContractResult.address);
  await childContract.grantRole(await childContract.ROLE_REVEALER(), owner);
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
  if (childManagerProxy[networkName]) {
    await childContract.grantRole(
      await childContract.ROLE_DEPOSITOR(),
      childManagerProxy[networkName]
    );
  }
  try {
    await run("verify:verify", {
      address: childContract.address,
      constructorArguments: [],
    });
  } catch (err: any) {
    console.log(`Error verifying child contract: ${err}`);
  }
};
export default func;
func.tags = ["matic", "maticmum"];
