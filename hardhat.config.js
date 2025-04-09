/** @type import('hardhat/config').HardhatUserConfig */
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
      accounts: ["0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80"],
    },
    sepolia: {
      url: "https://eth-sepolia.g.alchemy.com/v2/_BdhFtEHvIxSC5IUcsJJ2RxQIiV2l8cN", // Replace with your Infura/Alchemy RPC URL
      chainId: 11155111,
      accounts: ["f6985be08511e7ab8b1d3a6ddca130b8a7477a1d14a876b04dc76811157a0f00"], // Replace with your private key
    },
  }
};
