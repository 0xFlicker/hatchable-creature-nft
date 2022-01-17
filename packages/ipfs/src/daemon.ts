// Create a factory to spawn two test disposable controllers, get access to an IPFS api
// print node ids and clean all the controllers from the factory.
import Ctl from "ipfsd-ctl";
import * as ipfsHttpClient from "ipfs-http-client";
import * as ipfsModule from "ipfs";

export default async function () {
  const factory = Ctl.createFactory({
    type: "js",
    ipfsHttpModule: ipfsHttpClient,
    ipfsModule: ipfsModule,
    ipfsBin: ipfsModule.path(),
    ipfsOptions: {
      config: {
        API: {
          HTTPHeaders: {
            "Access-Control-Allow-Origin": [
              "http://127.0.0.1:5002",
              "http://localhost:3000",
              "http://127.0.0.1:5001",
              "https://webui.ipfs.io",
            ],
          },
        },
      },
    },
  });
  const ipfsd1 = await factory.spawn(); // Spawns using options from `createFactory`

  const apiNode = await ipfsd1.api.id();

  console.log(apiNode);
}
