const { buildModule } = require("@nomicfoundation/hardhat-ignition/modules");
const { ethers } = require("ethers");

module.exports = buildModule("TimeshareModule", (m) => {
  const deployer = m.getAccount(0);
  console.log("Deploying contracts with account:", deployer);

  // Deploy SmartStayToken
  const ssToken = m.contract("SmartStayToken", [2025], {
    from: deployer,
  });
  console.log("SmartStayToken deployment initiated");

  // Grant DEFAULT_ADMIN_ROLE with unique ID
  const adminRole = ethers.ZeroHash;
  m.call(ssToken, "grantRole", [adminRole, deployer], {
    from: deployer,
    after: [ssToken],
    id: "GrantAdminRole" // Unique identifier
  });
  console.log("Granted DEFAULT_ADMIN_ROLE to deployer");

  // Deploy ReservationSwap
  const reservationSwap = m.contract("ReservationSwap", [ssToken], {
    from: deployer,
    after: [ssToken],
  });
  console.log("ReservationSwap deployment initiated");

  // Grant SWAP_CONTRACT_ROLE with unique ID
  const swapRole = ethers.keccak256(ethers.toUtf8Bytes("SWAP_CONTRACT_ROLE"));
  m.call(ssToken, "grantRole", [swapRole, reservationSwap], {
    from: deployer,
    after: [reservationSwap],
    id: "GrantSwapRole" // Unique identifier
  });
  console.log("Granting SWAP_CONTRACT_ROLE to ReservationSwap");

  return { ssToken, reservationSwap };
});