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
  }
};
