/** @type import('hardhat/config').HardhatUserConfig */
require('dotenv').config();
require("@nomicfoundation/hardhat-ignition");

module.exports = {
  solidity: "0.8.28",
  networks: {
    hardhat: {
      // Optional: Configure the local network (defaults to http://localhost:8545)
      chainId: 31337,
    },
    localhost: {
      url: "http://127.0.0.1:8545",
      // Add your wallet's private key here (for deployment)
      accounts: [process.env.PRIVATE_KEY_LOCAL], // Replace with your private key
    },
    sepolia: {
      url: process.env.ALCHEMY_API_KEY , // Replace with your Infura/Alchemy RPC URL
      chainId: 11155111,
      accounts: [process.env.PRIVATE_KEY_SEPOLIA], // Replace with your private key
    },
  }
};
