# User Stories for SmartStay Project

## Property Owner

1. **As a property owner**, I want to register my property on the platform by submitting required details (e.g., location, amenities, photos) so that I can mint reservation tokens.  
   - **Acceptance Criteria**:  
     - Registration form enforces validations (e.g., non-empty fields, valid addresses, image uploads).  
     - Property data is stored securely on-chain or in a decentralized storage solution (e.g., IPFS).  
     - A unique property ID is generated post-registration.  

2. **As a property owner**, I want my property to undergo admin verification to ensure legitimacy before activating reservation minting.  
   - **Acceptance Criteria**:  
     - Admins can review property details and documents via a dashboard.  
     - Verified properties are marked `active` on-chain.  
     - Only `active` properties can mint reservation tokens.  

3. **As a property owner**, I want to mint ERC721 reservation tokens for specific weeks/dates, including metadata (property ID, dates, price), to manage bookings.  
   - **Acceptance Criteria**:  
     - Each token’s metadata includes `propertyId`, `startDate`, `endDate`, and `price` (stored on-chain or via IPFS).  
     - Minting is restricted to the property owner’s wallet address.  
     - Tokens are non-fungible and non-transferable until listed on ReservationSwap.  

4. **As a property owner**, I want to update my property’s status (active/inactive) or modify details (e.g., pricing, availability) to reflect changes.  
   - **Acceptance Criteria**:  
     - Property status changes trigger an on-chain event.  
     - Updates to details require re-verification if critical (e.g., location).  
     - Reservation tokens for inactive properties are automatically delisted.  

5. **As a property owner**, I want to receive ETH payments automatically via ReservationSwap’s smart contract when my reservation token is sold.  
   - **Acceptance Criteria**:  
     - ETH is transferred to the owner’s wallet upon successful sale.  
     - A fee (e.g., 2%) is deducted for the platform and recorded on-chain.  

---

## Admin

1. **As an admin**, I want to verify property submissions by reviewing documents (e.g., ownership proof) to ensure only valid properties are listed.  
   - **Acceptance Criteria**:  
     - Admin dashboard displays pending properties with documents.  
     - Verification status is updated on-chain (e.g., `verified` boolean).  
     - Property owners receive notifications post-verification.  

2. **As an admin**, I want to manage admin roles using OpenZeppelin’s `AccessControl` to ensure secure platform governance.  
   - **Acceptance Criteria**:  
     - Only `DEFAULT_ADMIN_ROLE` can grant/revoke admin privileges.  
     - Role changes emit on-chain events for transparency.  

---

## Reservation Holder (Guest)

1. **As a guest**, I want to search for available reservation tokens by filters (dates, location, price) to find matching properties.  
   - **Acceptance Criteria**:  
     - Search results are fetched from on-chain data and metadata.  
     - Filters include `maxPrice`, `dates`, and `amenities`.  

2. **As a guest**, I want to purchase a reservation token using ETH via ReservationSwap’s escrow contract to secure my booking.  
   - **Acceptance Criteria**:  
     - Full payment in ETH is required to transfer token ownership.  
     - The smart contract holds funds until check-in completion.  

3. **As a guest**, I want to display my reservation token in my wallet (e.g., MetaMask) as proof of ownership during check-in.  
   - **Acceptance Criteria**:  
     - Property owners can validate tokens via a platform interface.  
     - Token metadata includes a QR code for quick verification.  

4. **As a guest**, I want to resell or swap my reservation token on ReservationSwap if my plans change.  
   - **Acceptance Criteria**:  
     - Tokens can be listed for ETH or swapped for another token.  
     - Listings expire automatically after the reservation date.  

---

## Trader/Swapper

1. **As a trader**, I want to list my reservation token for sale on ReservationSwap with a fixed ETH price or auction.  
   - **Acceptance Criteria**:  
     - Listings include a `price` field and `expirationDate`.  
     - Auctions support bidding with a minimum reserve price.  

2. **As a trader**, I want to propose token swaps (e.g., my beach house week for a ski lodge week) to exchange reservations.  
   - **Acceptance Criteria**:  
     - Swap proposals require mutual approval from both parties.  
     - Smart contract ensures atomic swaps (all-or-nothing execution).  

3. **As a trader**, I want to browse active listings with advanced filters (e.g., “show only ocean-view properties”) to find swaps.  
   - **Acceptance Criteria**:  
     - Filters use token metadata attributes (e.g., `hasPool: true`).  
     - Off-chain indexing (e.g., The Graph) enables fast queries.  

---

## General User

1. **As a user**, I want all transactions (minting, sales, swaps) recorded on-chain for transparency.  
   - **Acceptance Criteria**:  
     - Events like `TokenMinted`, `TokenSold`, and `TokenSwapped` are emitted.  
     - Users can view transaction history via blockchain explorers.  

2. **As a new user**, I want guided wallet setup (MetaMask/Coinbase) to interact with SmartStay seamlessly.  
   - **Acceptance Criteria**:  
     - In-app tutorials explain wallet connection and gas fees.  
     - Testnet support allows practice with fake ETH.  

3. **As a user**, I expect all smart contracts to be audited and secure to prevent asset loss.  
   - **Acceptance Criteria**:  
     - Contracts use reentrancy guards and fail-safe withdrawal patterns.  
     - Third-party audit reports are publicly accessible.  