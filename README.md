# Decentralized Timeshare Management System

A blockchain-based platform built on Ethereum that revolutionizes timeshare ownership, trading, and usage through smart contracts. The system comprises four core components that work together to create a transparent and flexible ecosystem.

## Core Components

### 🏠 TimeshareToken (ERC1155)
- **Ownership Representation**: Tokenizes property ownership (1 token ID = 1 property)
- **Dynamic Units**: Track fractional ownership percentages through token amounts
- **Property Management**: 
  - Create/update properties with metadata (location, amenities, fees)
  - Mint initial ownership distributions
  - Enforce annual maintenance fee payments

### 💰 TimeshareMarketplace
- **Peer-to-Peer Trading**: 
  - List ownership units with custom pricing
  - Purchase units with ETH
  - Platform fee mechanism (configurable %)
- **Secure Escrow**: 
  - Automatic token transfers on successful sales
  - Reentrancy-protected transactions

### 🗳️ TimeshareGovernance
- **Proposal System**:
  - Property managers/owners can propose improvements
  - Voting weighted by ownership stake
  - Quorum (25% participation) and majority rules
- **Transparent Execution**:
  - Time-limited voting periods
  - On-chain proposal tracking

### 🗓️ ReservationSystem
- **Week Management**:
  - Reserve specific weeks (1-52) based on ownership
  - Maintenance blocking/unblocking
  - Rental marketplace integration
- **Fee Enforcement**:
  - Mandatory maintenance fee checks
  - ETH payment processing for fees/rentals

## Key Features

✅ **Decentralized Ownership**  
Fractional ownership represented as ERC1155 tokens with transferable units

✅ **Transparent Marketplace**  
Trustless trading with built-in platform fees and secure fund handling

✅ **Flexible Usage**  
- Direct reservations by owners  
- Secondary rental market for unused weeks

✅ **Community Governance**  
Owners influence property decisions through proposal voting system

✅ **Maintenance Accountability**  
Annual fee enforcement tied to reservation privileges

## System Roles

| Role | Capabilities |
|------|--------------|
| **Admin** | Create properties, set fees, assign managers |
| **Property Manager** | Block weeks, create improvement proposals |
| **Owner** | Trade units, reserve/rent weeks, vote on proposals |
| **Renter** | Book available weeks through rental marketplace |
| **Voter** | Participate in governance decisions |

## Technology Stack
- **Solidity 0.8.17** with strict security practices
- **OpenZeppelin Contracts**: ERC1155, AccessControl, ReentrancyGuard
- **Decentralized Architecture**: Fully on-chain logic with no central server
- **IPFS Integration**: Property metadata stored via URI patterns

## Use Cases
- 🏖️ Vacation property co-ownership
- 🏢 Commercial space time-sharing
- 🎓 University accommodation pools
- 🌳 Shared vacation home management

Designed to bring transparency and liquidity to traditional timeshare models while empowering users through decentralized governance.

## Timeshare System User Stories

### Admin Role
- As an **Admin**, I want to create new timeshare properties so that they can be managed and owned by users.
- As an **Admin**, I want to update property details (name, location, fees) so that information remains accurate.
- As an **Admin**, I want to mint initial ownership tokens for a property so that initial owners can participate in the system.
- As an **Admin**, I want to set platform fees for marketplace transactions so that the platform generates revenue.
- As an **Admin**, I want to assign Property Manager roles so that trusted parties can manage specific properties.
- As an **Admin**, I want to configure maintenance fee collection addresses so that fees are routed correctly.

---

### Property Manager Role
- As a **Property Manager**, I want to block weeks for maintenance so that repairs or upgrades can be performed.
- As a **Property Manager**, I want to unblock weeks so that reservations can resume after maintenance.
- As a **Property Manager**, I want to create governance proposals for property improvements (e.g., new amenities) so that owners can vote on changes.
- As a **Property Manager**, I want to ensure proposals meet minimum voting periods so that owners have time to participate.

---

### Owner (Token Holder) Role
- As an **Owner**, I want to sell my timeshare units on the marketplace so that I can exit my investment.
- As an **Owner**, I want to buy additional units on the marketplace so that I can increase my ownership stake.
- As an **Owner**, I want to reserve a specific week at the property so that I can use my timeshare.
- As an **Owner**, I want to cancel a reservation (if not rented) so that my plans can remain flexible.
- As an **Owner**, I want to list my reserved week for rent so that I can earn income from unused weeks.
- As an **Owner**, I want to pay annual maintenance fees so that I maintain access to reservations and voting rights.
- As an **Owner**, I want to vote on governance proposals so that I can influence property decisions.

---

### Renter Role
- As a **Renter**, I want to browse available weeks for rent so that I can find a suitable vacation period.
- As a **Renter**, I want to rent a listed week so that I can stay at the property without ownership.
- As a **Renter**, I want to ensure my rental payment is securely processed so that I receive confirmed access.

---

### Buyer/Seller (Marketplace Participant) Role
- As a **Seller**, I want to create listings for my units with custom prices so that I can maximize returns.
- As a **Seller**, I want to update or cancel listings so that I can adapt to market conditions.
- As a **Buyer**, I want to purchase units from listings so that I can acquire ownership in desired properties.
- As a **Buyer**, I want to verify property details before purchasing so that I make informed decisions.

---

### Voter (Governance Participant) Role
- As a **Voter**, I want to cast votes on proposals so that my ownership stake influences outcomes.
- As a **Voter**, I want to check proposal statuses (active/executed) so that I can participate before deadlines.
- As a **Voter**, I want to ensure proposals meet quorum and majority rules so that decisions are legitimate.

## Diagrams
![Class Diagram](/diagrams/class-diagram.png)

# Installation
## Reguired
**Hardhat**
https://hardhat.org/hardhat-runner/docs/getting-started#installation

## time-share-app
