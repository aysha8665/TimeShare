// This setup uses Hardhat Ignition to manage smart contract deployments.
const { buildModule } = require("@nomicfoundation/hardhat-ignition/modules");
const { ethers } = require("ethers");

module.exports = buildModule("TimeshareModule", (m) => {
  // Get deployer address
  const deployer = m.getAccount(0);

  // Deploy contracts
  const timeshareToken = m.contract("TimeshareToken");
  
  const reservationSystem = m.contract("ReservationSystem", [
    timeshareToken,
    deployer,
  ]);

  const timeshareGovernance = m.contract("TimeshareGovernance", [
    timeshareToken,
  ]);

  const timeshareMarketplace = m.contract("TimeshareMarketplace", [
    timeshareToken,
    deployer,
    500,
  ]);

  // Calculate role hashes using ethers v6 syntax
  const ADMIN_ROLE = ethers.keccak256(ethers.toUtf8Bytes("ADMIN_ROLE"));
  const PROPERTY_MANAGER_ROLE = ethers.keccak256(ethers.toUtf8Bytes("PROPERTY_MANAGER_ROLE"));

  // Assign roles with unique IDs
  m.call(timeshareToken, "grantRole", [ADMIN_ROLE, deployer], { id: "TokenGrantAdmin" });
  m.call(timeshareToken, "grantRole", [PROPERTY_MANAGER_ROLE, deployer], { id: "TokenGrantPM" });
  
  m.call(reservationSystem, "grantRole", [ADMIN_ROLE, deployer], { id: "ReservationGrantAdmin" });
  m.call(reservationSystem, "grantRole", [PROPERTY_MANAGER_ROLE, deployer], { id: "ReservationGrantPM" });

  m.call(timeshareGovernance, "grantRole", [ADMIN_ROLE, deployer], { id: "GovGrantAdmin" });
  m.call(timeshareGovernance, "grantRole", [PROPERTY_MANAGER_ROLE, deployer], { id: "GovGrantPM" });

  m.call(timeshareMarketplace, "grantRole", [ADMIN_ROLE, deployer], { id: "MarketGrantAdmin" });

  return { 
    timeshareToken, 
    reservationSystem, 
    timeshareGovernance, 
    timeshareMarketplace 
  };
});