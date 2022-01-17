import daemonFactory from './dist/daemon.js';

daemonFactory().then(() => console.log(`IPFS gateway running`)).catch((e) => console.error(e));
