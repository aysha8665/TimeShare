// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

import "./TimeshareToken.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
/**
 * @title TimeshareMarketplace
 * @dev Facilitates the buying and selling of timeshare ownership units
 */
contract TimeshareMarketplace is AccessControl, ReentrancyGuard {
    TimeshareToken public timeshareToken;
    
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    
    // Listing counter (replacing Counters.sol)
    uint256 private _listingIdCounter;
    
    // Listing struct
    struct Listing {
        uint256 propertyId;
        address seller;
        uint256 unitsForSale;
        uint256 pricePerUnit;
        bool isActive;
    }
    
    // Mapping from listingId to Listing
    mapping(uint256 => Listing) public listings;
    
    // Platform fee percentage (in basis points, e.g., 250 = 2.5%)
    uint256 public platformFeePercentage;
    address public platformFeeAddress;
    
    event ListingCreated(uint256 indexed listingId, uint256 indexed propertyId, address indexed seller, uint256 unitsForSale, uint256 pricePerUnit);
    event ListingUpdated(uint256 indexed listingId, uint256 unitsForSale, uint256 pricePerUnit);
    event ListingCancelled(uint256 indexed listingId);
    event UnitsPurchased(uint256 indexed listingId, address indexed buyer, uint256 unitsPurchased, uint256 totalPrice);
    
    constructor(TimeshareToken _timeshareToken, address _platformFeeAddress, uint256 _platformFeePercentage) {
        timeshareToken = _timeshareToken;
        platformFeeAddress = _platformFeeAddress;
        platformFeePercentage = _platformFeePercentage;
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(ADMIN_ROLE, msg.sender);
    }
    
    /**
     * @dev Get current listing ID counter
     */
    function getListingIdCounter() public view returns (uint256) {
        return _listingIdCounter;
    }
    
    /**
     * @dev Increment and return the next listing ID
     */
    function _getNextListingId() private returns (uint256) {
        _listingIdCounter += 1;
        return _listingIdCounter;
    }
    
    /**
     * @dev Update platform fee settings
     */
    function updatePlatformFee(address _platformFeeAddress, uint256 _platformFeePercentage) external onlyRole(ADMIN_ROLE) {
        require(_platformFeePercentage <= 1000, "Fee too high"); // Max 10%
        platformFeeAddress = _platformFeeAddress;
        platformFeePercentage = _platformFeePercentage;
    }
    
    /**
     * @dev Create a new listing to sell ownership units
     */
    function createListing(uint256 propertyId, uint256 unitsForSale, uint256 pricePerUnit) external nonReentrant {
        require(unitsForSale > 0, "Must sell at least one unit");
        require(pricePerUnit > 0, "Price must be greater than zero");
        
        // Check if seller has enough units
        uint256 unitsOwned = timeshareToken.balanceOf(msg.sender, propertyId);
        require(unitsOwned >= unitsForSale, "Not enough units owned");
        
        // Check if property exists
        (,,,,,,bool active) = timeshareToken.properties(propertyId);
        require(active, "Property does not exist");
        
        // Create listing
        uint256 listingId = _getNextListingId();
        
        listings[listingId] = Listing({
            propertyId: propertyId,
            seller: msg.sender,
            unitsForSale: unitsForSale,
            pricePerUnit: pricePerUnit,
            isActive: true
        });
        
        // Approve transfer to this contract
        timeshareToken.setApprovalForAll(address(this), true);
        
        emit ListingCreated(listingId, propertyId, msg.sender, unitsForSale, pricePerUnit);
    }
    
    /**
     * @dev Update an existing listing
     */
    function updateListing(uint256 listingId, uint256 unitsForSale, uint256 pricePerUnit) external nonReentrant {
        Listing storage listing = listings[listingId];
        require(listing.isActive, "Listing not active");
        require(listing.seller == msg.sender, "Not the seller");
        require(unitsForSale > 0, "Must sell at least one unit");
        require(pricePerUnit > 0, "Price must be greater than zero");
        
        // Check if seller has enough units
        uint256 unitsOwned = timeshareToken.balanceOf(msg.sender, listing.propertyId);
        require(unitsOwned >= unitsForSale, "Not enough units owned");
        
        listing.unitsForSale = unitsForSale;
        listing.pricePerUnit = pricePerUnit;
        
        emit ListingUpdated(listingId, unitsForSale, pricePerUnit);
    }
    
    /**
     * @dev Cancel a listing
     */
    function cancelListing(uint256 listingId) external nonReentrant {
        Listing storage listing = listings[listingId];
        require(listing.isActive, "Listing not active");
        require(listing.seller == msg.sender, "Not the seller");
        
        listing.isActive = false;
        
        emit ListingCancelled(listingId);
    }
    
    /**
     * @dev Purchase units from a listing
     */
    function purchaseUnits(uint256 listingId, uint256 unitsToPurchase) external payable nonReentrant {
        Listing storage listing = listings[listingId];
        require(listing.isActive, "Listing not active");
        require(unitsToPurchase > 0, "Must buy at least one unit");
        require(unitsToPurchase <= listing.unitsForSale, "Not enough units for sale");
        
        uint256 totalPrice = unitsToPurchase * listing.pricePerUnit;
        require(msg.value >= totalPrice, "Insufficient payment");
        
        // Calculate platform fee
        uint256 platformFee = (totalPrice * platformFeePercentage) / 10000;
        uint256 sellerAmount = totalPrice - platformFee;
        
        // Transfer ownership
        timeshareToken.safeTransferFrom(listing.seller, msg.sender, listing.propertyId, unitsToPurchase, "");
        
        // Transfer funds
        if (platformFee > 0) {
            (bool feePaid, ) = platformFeeAddress.call{value: platformFee}("");
            require(feePaid, "Platform fee transfer failed");
        }
        
        (bool sellerPaid, ) = listing.seller.call{value: sellerAmount}("");
        require(sellerPaid, "Seller payment failed");
        
        // Refund excess payment
        if (msg.value > totalPrice) {
            (bool refundSuccess, ) = msg.sender.call{value: msg.value - totalPrice}("");
            require(refundSuccess, "Refund failed");
        }
        
        // Update listing
        listing.unitsForSale -= unitsToPurchase;
        if (listing.unitsForSale == 0) {
            listing.isActive = false;
        }
        
        emit UnitsPurchased(listingId, msg.sender, unitsToPurchase, totalPrice);
    }
    
    /**
     * @dev Get active listings count
     */
    function getListingCount() external view returns (uint256) {
        return _listingIdCounter;
    }
}
