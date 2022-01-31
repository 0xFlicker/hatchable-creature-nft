const withTM = require('next-transpile-modules')(['@creaturenft/contracts', '@creaturenft/web3']);

const env = {
  NEXT_CHAIN_ID: process.env.NEXT_CHAIN_ID || "1337",
  NEXT_NETWORK: process.env.NEXT_NETWORK || "localhost",
  NEXT_IPFS_GATEWAY: process.env.NEXT_IPFS_GATEWAY || "http://localhost:9090",
  NEXT_IPFS_API_GATEWAY: process.env.NEXT_IPFS_API_GATEWAY || "http://localhost:5002",
}
module.exports = withTM({
  reactStrictMode: true,
  images: {
    domains: [new URL(env.NEXT_IPFS_GATEWAY).hostname],
  },
  env
});
