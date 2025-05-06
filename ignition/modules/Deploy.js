const { buildModule } = require("@nomicfoundation/hardhat-ignition/modules");
const { ethers } = require("ethers");

module.exports = buildModule("TimeshareModule", (m) => {
  const deployer = m.getAccount(0);
  console.log("Deploying contracts with account:", deployer);

  // Deploy SmartStayToken and NFTVault with circular dependency using futures
  const ssToken = m.contract("SmartStayToken", [2025]);
  const nftVault = m.contract("NFTVault", [ssToken]);

  // Grant DEFAULT_ADMIN_ROLE to deployer
  const adminRole = ethers.ZeroHash; // DEFAULT_ADMIN_ROLE is 0x00...0
  m.call(ssToken, "grantRole", [adminRole, deployer], {
    from: deployer,
    after: [ssToken],
    id: "GrantAdminRole"
  });
  console.log("Granted DEFAULT_ADMIN_ROLE to deployer");

  // Set the NFTVault address in SmartStayToken
  m.call(ssToken, "SetVaultAddress", [nftVault], {
    from: deployer,
    after: [ssToken, nftVault],
    id: "SetVaultAddress"
  });
  console.log("Set NFTVault address in SmartStayToken");

  // Deploy ReservationSwap with SmartStayToken and NFTVault addresses
  const reservationSwap = m.contract("ReservationSwap", [ssToken, nftVault], {
    from: deployer,
    after: [ssToken, nftVault],
  });
  console.log("ReservationSwap deployment initiated");

  // Grant SWAP_CONTRACT_ROLE to ReservationSwap
  const swapRole = ethers.keccak256(ethers.toUtf8Bytes("SWAP_CONTRACT_ROLE"));
  m.call(ssToken, "grantRole", [swapRole, reservationSwap], {
    from: deployer,
    after: [reservationSwap],
    id: "GrantSwapRole"
  });
  console.log("Granted SWAP_CONTRACT_ROLE to ReservationSwap");

  // Return deployed contract instances
  return { ssToken, nftVault, reservationSwap };
});