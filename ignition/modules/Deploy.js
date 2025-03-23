// This setup uses Hardhat Ignition to manage smart contract deployments.
// Learn more about it at https://hardhat.org/ignition

const { buildModule } = require("@nomicfoundation/hardhat-ignition/modules");

module.exports = buildModule("TimeshareModule", (m) => {

  const timeshareToken = m.contract("TimeshareToken");
//   const reservationSystem = m.contract("ReservationSystem", [timeshareToken.address, timeshareToken.address]);
//   const timeshareGovernance = m.contract("TimeshareGovernance", [timeshareToken.address]);
//   const timeshareMarketplace = m.contract("TimeshareMarketplace", [timeshareToken.address, timeshareToken.address, 0.05]);
  return { timeshareToken };
});
