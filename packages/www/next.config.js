const withTM = require('next-transpile-modules')(['@creaturenft/contracts', '@creaturenft/web3']);

module.exports = withTM({
  reactStrictMode: true,
  env: {
    NEXT_CHAIN_ID: process.env.NEXT_CHAIN_ID || "1337",
    NEXT_NETWORK: process.env.NEXT_NETWORK || "ganache",
    NEXT_IPFS_GATEWAY: process.env.NEXT_IPFS_GATEWAY || "http://localhost:9090",
  }
});
