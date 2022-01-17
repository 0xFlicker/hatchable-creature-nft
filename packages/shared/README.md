# shared

## environment config

### `SQLITE_DB_FILE`

sqlite3 db location

defaults: `:memory:`

### `LIFECYCLE_MANAGER_OWNER_ADDRESS`

LifecycleManager contract owner. Needs to be able to sign so requires a mnemonic

defaults: contract deployer from hardhat

### `ALCHEMY_MATIC_API_KEY`

Alchemy Polygon mainnet API key

Required for fallback connection on Polygon L2

### `ALCHEMY_MATICMUM_API_KEY`

Alchemy Polygon testnet API key

Required for fallback connection on Polygon L2 testnet

### `ETHERSCAN_API_KEY`

Etherscan.io API key

Required for fallback connection on Ethereum mainnet

### `GANACHE_URL`

Ganache testnet

defaults: `http://localhost:7545`

### `INFURA_PROJECT_ID`

Infura Project ID. Infura is the default provider.

Required for non-local deployments

### `INFURA_PROJECT_SECRET`

Infura Project Secret. Infura is the default provider

Required for non-local deployments

### `POLYGON_API_KEY`

Polygonscan.io api key. Fallback provider for Polygon L2 mainnet and testnet connections
