import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import * as dotenv from "dotenv";

dotenv.config();

const PRIVATE_KEY = process.env.DEPLOYER_PRIVATE_KEY;

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.26",
    settings: {
      optimizer: { enabled: true, runs: 200 },
    },
  },
  networks: {
    // Placeholder only — do NOT trust these values for a real deploy.
    // Monad Testnet's actual chainId/RPC/explorer must be confirmed against
    // the official Monad docs before Phase 3 (deployment). Filled in then.
    monadTestnet: {
      url: process.env.MONAD_TESTNET_RPC_URL || "",
      chainId: process.env.MONAD_TESTNET_CHAIN_ID
        ? Number(process.env.MONAD_TESTNET_CHAIN_ID)
        : undefined,
      accounts: PRIVATE_KEY ? [PRIVATE_KEY] : [],
    },
  },
};

export default config;
