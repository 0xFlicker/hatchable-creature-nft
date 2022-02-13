await import("dotenv/config");
import { utils, Wallet } from "ethers";
import maticjs from "@maticnetwork/maticjs";
import maticjsEthers from "@maticnetwork/maticjs-ethers";
import { defaultProvider as createProvider } from "@creaturenft/web3";
import { FxBaseChildTunnel__factory } from "./typechain";

const { POSClient } = maticjs;
maticjs.use((maticjsEthers as any).Web3ClientPlugin);

const parentProvider = createProvider("goerli");
const childProvider = createProvider("maticmum");
const childWallet = new Wallet(process.env.PRIVATE_KEY || "", childProvider);
const parentWallet = new Wallet(process.env.PRIVATE_KEY || "", parentProvider);

(maticjs as any).setProofApi("https://apis.matic.network/");

async function doit(
  bridgedAddress: string,
  childTxHash: string,
  messageBytes: string,
  network = "testnet",
  version = "mumbai"
) {
  const posClientFactory = new POSClient();

  const posClient = await posClientFactory.init({
    log: true,
    network: network,
    version: version,
    child: {
      provider: childWallet,
      defaultConfig: {
        from: bridgedAddress,
      },
    },
    parent: {
      provider: parentWallet,
      defaultConfig: {
        from: bridgedAddress,
      },
    },
  });

  const isCheckpointed = await posClient.isCheckPointed(childTxHash);
  console.log(`isCheckpointed: ${isCheckpointed}`);
  // const fxChildTunnel = FxBaseChildTunnel__factory.createInterface();
  // fxChildTunnel.events["MessageSent(bytes)"].from({
  //   messageBytes: messageBytes,
  // });

  const childTxReceipt = await childProvider.getTransactionReceipt(childTxHash);
  console.log(childTxReceipt.logs[0]);
  // const eventSig = utils.keccak256("MessageSent(bytes)");
  console.log(
    await posClient.exitUtil.buildPayloadForExit(
      childTxHash,
      childTxReceipt.logs[0].topics[0],
      true
    )
  );
}

doit(
  "0xbde9ca3dc6b1d8db5eeb451dc17e09f01d00a793",
  "0xb775159a188f3ef234b94d2ed9b10e0697e318282cac7c5684569147a6a23b50",
  "00000000000000000000000000000000000000000000000000000000000000011220DDAA8C8A1DC05E55EDC9AAB9EB3E3E35DC188030014D2FC978B80AC2748E4C5C"
).catch((e) => console.error(e));
