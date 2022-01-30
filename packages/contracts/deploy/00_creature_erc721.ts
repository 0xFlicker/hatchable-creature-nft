import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";
import { parseUnits } from "ethers/lib/utils";
// import { CreatureERC721__factory } from "../typechain";
import babyMetadataCid from "../utils/baby_metadata.json";
import { isLocalNetwork } from "../utils/network";

const mintableAssetERC721proxy = {
  mainnet: "0x932532aA4c0174b8453839A6E44eE09Cc615F2b7",
  goerli: "0x56E14C4C1748a818a5564D33cF774c59EB3eDF59",
};

const preApprovedProxyAddress = {
  maticmum: "0x0000000000000000000000000000000000000000",
};

const fxStateTransferMaticmum = {
  fxRoot: "0x3d1d3E34f7fB6D26245E6640E1c50710eFFf15bA",
  fxChild: "0xCf73231F28B7331BBe3124B907840A94851f9f11",
};

const fxStateTransferMatic = {
  fxRoot: "0xfe5e5D361b2ad62c541bAb87C45a0B9B018389a2",
  fxChild: "0x8397259c983751DAf40400790063935a11afa28a",
};

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments, getNamedAccounts, network, ethers, run } = hre;
  const { provider } = network;
  const { deploy } = deployments;
  const debugMode = isLocalNetwork(network.name);
  console.log(`Deploying to ${network.name}`);
  const { owner } = await getNamedAccounts();
  const defaultContractOptions = {
    log: debugMode,
    autoMine: debugMode,
  };
  const childDeploymentArgs = [
    // `ipfs://${babyMetadataCid}/`,
    // "0x0000000000000000000000000000000000000000",
    // parseUnits("0.01", "ether"),
    // 100,
  ];
  const nftDeployment = await deploy("ChildC", {
    from: owner,
    args: childDeploymentArgs,
    ...defaultContractOptions,
  });

  if (!debugMode) {
    // Verify the contract
    await run("verify:verify", {
      address: nftDeployment.address,
      constructorArguments: nftDeploymentArgs,
    });
    await run("verify:verify", {
      address: lifecycleManagerDeployment.address,
      constructorArguments: lifecycleManagerArgs,
    });
  }

  const ownerSigner = await ethers.getSigner(owner);
  const creatureContractFactory = await ethers.getContractFactory(
    "CreatureERC721",
    ownerSigner
  );
  const creatureContract = creatureContractFactory.attach(
    nftDeployment.address
  );

  const lifecycleManagerFactory = await ethers.getContractFactory(
    "LifecycleManager",
    ownerSigner
  );
  const lifecycleManager = lifecycleManagerFactory.attach(
    lifecycleManagerDeployment.address
  );

  // Allow the lifecycle manager to manage the token
  await creatureContract.grantRole(
    await creatureContract.ROLE_REVEALER(),
    lifecycleManagerDeployment.address
  );
  // Link the token to the lifecycle manager
  await lifecycleManager.setManagedContract(creatureContract.address);
};
export default func;
func.tags = ["CreatureERC721"];
