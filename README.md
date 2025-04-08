# User Stories for SmartStay Project

## Property Owner

1. **As a property owner**, I want to register my property on the platform so that I can start minting reservation tokens.
   - **Acceptance Criteria**:
     - The platform provides a clear process for property registration.
     - Property details are accurately captured and stored.
     - The registration process includes necessary validations.

2. **As a property owner**, I want my property to be verified by an admin before activating it for reservation minting.
   - **Acceptance Criteria**:
     - Admins have a mechanism to review and verify properties.
     - Verified properties are marked as active.
     - Only active properties can have reservations minted.

3. **As a property owner**, I want to create unique reservation tokens for specific dates so that I can sell or rent out those time slots.
   - **Acceptance Criteria**:
     - The system allows minting of unique ERC721 tokens for each reservation slot.
     - Each token includes metadata specifying the property, year, and week.
     - Minting is restricted to verified and active properties.

4. **As a property owner**, I want to manage my property's availability by updating its status or details.
   - **Acceptance Criteria**:
     - The system allows updating of property status (active/inactive).
     - Property owners can update their property's information.
     - Updates are reflected accurately in the system.

5. **As a property owner**, I want to receive payment when someone buys my minted reservation token through transactions facilitated by ReservationSwap.
   - **Acceptance Criteria**:
     - When a reservation token is transferred from me in exchange for ETH or other assets via ReservationSwap.
     - The transaction is recorded on the blockchain.
     - Funds are transferred securely according to smart contract logic.

## Admin

1. **As an admin**, I want to verify properties submitted by property owners after reviewing their credentials so that only legitimate properties are listed on the platform.
   - **Acceptance Criteria**:
     - Admins have access to review property applications.
     - Verified properties are marked as active.
     - Only admins can perform verification actions.

2. **As an admin**, I want to manage access control within the system by adding or removing admins and setting permissions.
   - **Acceptance Criteria**:
     - Admins can manage other admins' roles.
     - Permissions for certain actions are set and managed appropriately.
     - The system enforces role-based access control using OpenZeppelin's `AccessControl`.

## Reservation Holder

1. **As a user**, I want to search and find available reservation tokens on the market that match my travel plans.
   - **Acceptance Criteria**:
     - The platform provides search functionality for available reservation tokens.
     - Users can filter tokens based on various attributes like location and dates.

2. **As a user**, I want to purchase a desired reservation token using ETH through ReservationSwap.
   - **Acceptance Criteria**:
     - The ReservationSwap contract allows buying tokens with ETH.
     - Transactions are secure with correct fund transfers.
     - Ownership of the token is transferred upon successful purchase.

3. **As a user who owns a reservation token**, I want to present this token as proof of my reservation when checking in at the property.
   - **Acceptance Criteria**:
     - Property owners recognize and validate the token as confirmation of reservation.
     - A mechanism exists for verifying token ownership at check-in.

4. **As a user who owns a reservation token**, I want to list it for sale or swap on ReservationSwap if I no longer need it.
   - **Acceptance Criteria**:
     - The ReservationSwap contract allows listing tokens for sale or swap with specified terms.
     - Users can specify prices in ETH or desired tokens for swaps.
     - Transactions are facilitated securely through smart contract logic.

## Trader/Swapper

1. **As a user with a reservation token**, I want to list it for sale on ReservationSwap specifying the price in ETH so potential buyers can purchase it directly.
   - **Acceptance Criteria**:
     - The ReservationSwap contract supports listing tokens for sale with specified prices.
     - Buyers can purchase listed tokens directly through the contract.

2. **As a user with multiple assets**, I want to propose swaps where I offer one token in exchange for another specific token or combination of assets.
   - **Acceptance Criteria**:
     - The ReservationSwap contract allows proposing swaps between tokens or with ETH.
     - Users can specify which assets they wish to exchange.
     - Swap proposals are handled securely with both parties agreeing before transfer.

3. **As a user looking for specific reservation tokens**, I want an efficient way to search and find available tokens on ReservationSwap that meet my criteria.
   - **Acceptance Criteria**:
     - The platform provides robust search functionality within ReservationSwap.
     - Users can filter tokens based on various attributes like location and dates.

4. **As any participant in ReservationSwap**, I expect all transactions to be secure and fair with no risk of fraud or loss of assets during trading.
   - **Acceptance Criteria**:
     - The smart contract ensures that both parties receive what they agreed upon.
     - Funds and tokens are locked during transactions and released only upon successful completion.

## General User

1. **As any user**, I want all transactions involving SmartStayToken and ReservationSwap contracts recorded on the blockchain for transparency and immutability.
   - **Acceptance Criteria**:
     - All actions like minting, transferring tokens are recorded on-chain.
     - The blockchain provides an auditable trail of all activities ensuring transparency and trust.

2. **As any user new to blockchain technology**, I need clear instructions on how to set up my wallet and interact with the SmartStay platform effectively without confusion.
   - **Acceptance Criteria**:
     - The platform provides comprehensive documentation and step-by-step guides.
     - User interfaces are designed intuitively with support for various wallet types ensuring ease of use.