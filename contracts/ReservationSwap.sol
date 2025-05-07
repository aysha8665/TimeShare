// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "./SmartStayToken.sol";
import "./NFTVault.sol";

/**
 * @title ReservationSwap
 * @dev Swapping and selling mechanism for SmartStayToken NFTs
 * Users can offer swaps with ETH incentives, list slots for sale, or propose to buy slots
 */
contract ReservationSwap is AccessControl, ReentrancyGuard {
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");

    SmartStayToken public reservationToken;
    NFTVault public vault;

    enum OfferType { SWAP, SALE, BUY }

    struct Offer {
        OfferType offerType;
        uint256 tokenId;
        uint8 day; // Day being offered (0-6 for SWAP/SALE) or targeted (BUY)
        uint256 targetPropertyId; // Only for SWAP
        uint16 targetYear; // Only for SWAP
        uint8 targetWeekNumber; // Only for SWAP
        uint8 targetDay; // Desired day (0-6), only for SWAP
        uint256 ethAmount; // Incentive for SWAP, price for SALE/BUY
        bool isActive;
        address offerer;
    }

    mapping(uint256 => Offer) public offers;
    mapping(uint256 => mapping(uint8 => uint256)) public slotDayToOfferId; // Tracks active SWAP/SALE offer per slot-day
    uint256 private offerIdCounter = 1;

    event SwapOfferCreated(uint256 indexed offerId, uint256 tokenId, uint8 day, address indexed offerer);
    event SaleOfferCreated(uint256 indexed offerId, uint256 tokenId, uint8 day, address indexed offerer);
    event BuyOfferCreated(uint256 indexed offerId, uint256 tokenId, uint8 day, address indexed offerer);
    event SwapExecuted(uint256 indexed offerId, uint256 tokenId1, uint8 day1, uint256 tokenId2, uint8 day2);
    event SaleExecuted(uint256 indexed offerId, uint256 tokenId, uint8 day, address indexed buyer);
    event BuyOfferAccepted(uint256 indexed offerId, uint256 tokenId, uint8 day, address indexed seller);
    event SwapOfferRejected(uint256 indexed offerId, address indexed rejecter);
    event BuyOfferRejected(uint256 indexed offerId, address indexed rejecter);
    event OfferCanceled(uint256 indexed offerId, address indexed canceler);

    constructor(address _reservationToken, address _vault) {
        reservationToken = SmartStayToken(_reservationToken);
        vault = NFTVault(_vault);
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(ADMIN_ROLE, msg.sender);
    }

    function getNextOfferId() public view returns (uint256) {
        return offerIdCounter;
    }

    /**
     * @dev Creates an offer for swapping a slot, selling a slot, or proposing to buy a slot
     * @param offerType Type of offer (SWAP, SALE, or BUY)
     * @param tokenId Token ID of the slot (offered for SWAP/SALE, targeted for BUY)
     * @param day Day of the slot (0-6)
     * @param targetPropertyId Target property ID for SWAP (ignored for SALE/BUY)
     * @param targetYear Target year for SWAP (ignored for SALE/BUY)
     * @param targetWeekNumber Target week number for SWAP (ignored for SALE/BUY)
     * @param targetDay Target day for SWAP (ignored for SALE/BUY)
     * @param ethAmount ETH incentive for SWAP, asking price for SALE, or offer price for BUY
     */
    function createOffer(
        OfferType offerType,
        uint256 tokenId,
        uint8 day,
        uint256 targetPropertyId,
        uint16 targetYear,
        uint8 targetWeekNumber,
        uint8 targetDay,
        uint256 ethAmount
    ) external payable nonReentrant {
        require(day < 7, "Invalid day");
        require(reservationToken.tokenToYear(tokenId) >= reservationToken.currentYear(), "Token expired");

        if (offerType == OfferType.SWAP) {
            require(targetDay < 7, "Invalid target day");
            require(msg.value == ethAmount, "Incorrect ETH sent");
            require(vault.slotOwnership(tokenId, day) == msg.sender, "Not slot owner");
            require(slotDayToOfferId[tokenId][day] == 0, "Active offer exists for this slot-day");
        } else if (offerType == OfferType.SALE) {
            require(msg.value == 0, "No ETH required for sale offer");
            require(vault.slotOwnership(tokenId, day) == msg.sender, "Not slot owner");
            require(slotDayToOfferId[tokenId][day] == 0, "Active offer exists for this slot-day");
        } else if (offerType == OfferType.BUY) {
            require(msg.value == ethAmount && ethAmount > 0, "Invalid ETH amount for buy offer");
            require(vault.slotOwnership(tokenId, day) != address(0), "Slot not owned");
        }

        uint256 offerId = offerIdCounter++;
        offers[offerId] = Offer({
            offerType: offerType,
            tokenId: tokenId,
            day: day,
            targetPropertyId: offerType == OfferType.SWAP ? targetPropertyId : 0,
            targetYear: offerType == OfferType.SWAP ? targetYear : 0,
            targetWeekNumber: offerType == OfferType.SWAP ? targetWeekNumber : 0,
            targetDay: offerType == OfferType.SWAP ? targetDay : 0,
            ethAmount: ethAmount,
            isActive: true,
            offerer: msg.sender
        });

        if (offerType == OfferType.SWAP || offerType == OfferType.SALE) {
            slotDayToOfferId[tokenId][day] = offerId;
        }

        if (offerType == OfferType.SWAP) {
            emit SwapOfferCreated(offerId, tokenId, day, msg.sender);
        } else if (offerType == OfferType.SALE) {
            emit SaleOfferCreated(offerId, tokenId, day, msg.sender);
        } else {
            emit BuyOfferCreated(offerId, tokenId, day, msg.sender);
        }
    }

    /**
     * @dev Accepts a swap offer by providing a matching counter-slot
     */
    function acceptSwapOffer(uint256 offerId, uint256 counterTokenId, uint8 counterDay) external nonReentrant {
        Offer memory offer = offers[offerId];
        require(offer.isActive, "Offer not active");
        require(offer.offerType == OfferType.SWAP, "Not a swap offer");
        require(counterDay < 7, "Invalid counter day");
        require(vault.slotOwnership(counterTokenId, counterDay) == msg.sender, "Not slot owner");
        require(
            reservationToken.tokenToYear(offer.tokenId) >= reservationToken.currentYear() &&
            reservationToken.tokenToYear(counterTokenId) >= reservationToken.currentYear(),
            "Token expired"
        );

        uint256 counterPropertyId = reservationToken.tokenToPropertyId(counterTokenId);
        uint16 counterYear = reservationToken.tokenToYear(counterTokenId);
        uint8 counterWeekNumber = reservationToken.tokenToWeekNumber(counterTokenId);

        bool matchesTarget =
            (offer.targetPropertyId == 0 || offer.targetPropertyId == counterPropertyId) &&
            (offer.targetYear == 0 || offer.targetYear == counterYear) &&
            (offer.targetWeekNumber == 0 || offer.targetWeekNumber == counterWeekNumber) &&
            (offer.targetDay == counterDay);
        require(matchesTarget, "Does not match swap conditions");

        offers[offerId].isActive = false;
        slotDayToOfferId[offer.tokenId][offer.day] = 0;

        vault.swapSlots(offer.tokenId, offer.day, counterTokenId, counterDay);

        if (offer.ethAmount > 0) {
            (bool success, ) = msg.sender.call{value: offer.ethAmount}("");
            require(success, "ETH transfer failed");
        }

        emit SwapExecuted(offerId, offer.tokenId, offer.day, counterTokenId, counterDay);
    }

    /**
     * @dev Rejects a swap offer, refunding ETH to the offerer
     */
    function rejectSwapOffer(uint256 offerId) external nonReentrant {
        Offer storage offer = offers[offerId];
        require(offer.isActive, "Offer not active");
        require(offer.offerType == OfferType.SWAP, "Not a swap offer");

        // Find the tokenId for the targeted slot
        uint256 targetTokenId = reservationToken.propertyWeekToToken(offer.targetPropertyId, offer.targetYear, offer.targetWeekNumber);
        require(targetTokenId != 0, "Target slot not minted");
        require(vault.slotOwnership(targetTokenId, offer.targetDay) == msg.sender, "Not target slot owner");

        offer.isActive = false;
        slotDayToOfferId[offer.tokenId][offer.day] = 0;

        if (offer.ethAmount > 0) {
            (bool success, ) = offer.offerer.call{value: offer.ethAmount}("");
            require(success, "ETH refund failed");
        }

        emit SwapOfferRejected(offerId, msg.sender);
    }

    /**
     * @dev Accepts a sale offer by paying the asking price in ETH
     */
    function acceptSaleOffer(uint256 offerId) external payable nonReentrant {
        Offer memory offer = offers[offerId];
        require(offer.isActive, "Offer not active");
        require(offer.offerType == OfferType.SALE, "Not a sale offer");
        require(msg.value == offer.ethAmount, "Incorrect ETH amount");

        offers[offerId].isActive = false;
        slotDayToOfferId[offer.tokenId][offer.day] = 0;

        vault.transferSlot(offer.tokenId, offer.day, msg.sender);

        (bool success, ) = offer.offerer.call{value: offer.ethAmount}("");
        require(success, "ETH transfer failed");

        emit SaleExecuted(offerId, offer.tokenId, offer.day, msg.sender);
    }

    /**
     * @dev Accepts a buy offer by selling the slot to the offerer
     */
    function acceptBuyOffer(uint256 offerId) external nonReentrant {
        Offer memory offer = offers[offerId];
        require(offer.isActive, "Offer not active");
        require(offer.offerType == OfferType.BUY, "Not a buy offer");
        require(vault.slotOwnership(offer.tokenId, offer.day) == msg.sender, "Not slot owner");
        require(reservationToken.tokenToYear(offer.tokenId) >= reservationToken.currentYear(), "Token expired");

        offers[offerId].isActive = false;

        vault.transferSlot(offer.tokenId, offer.day, offer.offerer);

        (bool success, ) = msg.sender.call{value: offer.ethAmount}("");
        require(success, "ETH transfer failed");

        emit BuyOfferAccepted(offerId, offer.tokenId, offer.day, msg.sender);
    }

    /**
     * @dev Rejects a buy offer, refunding ETH to the offerer
     */
    function rejectBuyOffer(uint256 offerId) external nonReentrant {
        Offer storage offer = offers[offerId];
        require(offer.isActive, "Offer not active");
        require(offer.offerType == OfferType.BUY, "Not a buy offer");
        require(vault.slotOwnership(offer.tokenId, offer.day) == msg.sender, "Not slot owner");

        offer.isActive = false;

        if (offer.ethAmount > 0) {
            (bool success, ) = offer.offerer.call{value: offer.ethAmount}("");
            require(success, "ETH refund failed");
        }

        emit BuyOfferRejected(offerId, msg.sender);
    }

    /**
     * @dev Cancels an offer; refunds ETH for SWAP and BUY offers
     */
    function cancelOffer(uint256 offerId) external nonReentrant {
        Offer storage offer = offers[offerId];
        require(offer.offerer == msg.sender, "Not offer creator");
        require(offer.isActive, "Offer not active");

        offer.isActive = false;
        if (offer.offerType == OfferType.SWAP || offer.offerType == OfferType.SALE) {
            slotDayToOfferId[offer.tokenId][offer.day] = 0;
        }

        if ((offer.offerType == OfferType.SWAP || offer.offerType == OfferType.BUY) && offer.ethAmount > 0) {
            (bool success, ) = offer.offerer.call{value: offer.ethAmount}("");
            require(success, "ETH refund failed");
        }

        emit OfferCanceled(offerId, msg.sender);
    }

    function supportsInterface(bytes4 interfaceId) public view override(AccessControl) returns (bool) {
        return super.supportsInterface(interfaceId);
    }
}