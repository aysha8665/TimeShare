// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "./SmartStayToken.sol";

/**
 * @title HotelReservationSwap
 * @dev Swapping mechanism for SmartStayToken NFTs
 * Users can offer their reservations for swap with ETH or NFT incentives
 */
contract ReservationSwap is AccessControl, ReentrancyGuard {
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");

    SmartStayToken public reservationToken;
    NFTVault public vault;

    struct SwapOffer {
        uint256 tokenId;
        uint8 day; // Day being offered (0-6)
        uint256 targetPropertyId;
        uint16 targetYear;
        uint8 targetWeekNumber;
        uint8 targetDay; // Desired day (0-6)
        uint256 ethIncentive;
        bool isActive;
        address offerer;
    }

    mapping(uint256 => SwapOffer) public swapOffers;
    uint256 private swapOfferIdCounter = 1;

    event SwapOfferCreated(uint256 indexed offerId, uint256 tokenId, uint8 day, address indexed offerer);
    event SwapExecuted(uint256 indexed offerId, uint256 tokenId1, uint8 day1, uint256 tokenId2, uint8 day2);
    event SwapOfferRejected(uint256 indexed offerId, address indexed rejecter);
    event SwapOfferCanceled(uint256 indexed offerId, address indexed canceler);

    constructor(address _reservationToken, address _vault) {
        reservationToken = SmartStayToken(_reservationToken);
        vault = NFTVault(_vault);
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(ADMIN_ROLE, msg.sender);
        //reservationToken.grantRole(keccak256("SWAP_CONTRACT_ROLE"), address(this));
    }

    function getNextSwapOfferId() public view returns (uint256) {
        return swapOfferIdCounter;
    }

    function createSwapOffer(
        uint256 tokenId,
        uint8 day,
        uint256 targetPropertyId,
        uint16 targetYear,
        uint8 targetWeekNumber,
        uint8 targetDay,
        uint256 ethIncentive
    ) external payable nonReentrant {
        require(day < 7 && targetDay < 7, "Invalid day");
        require(vault.slotOwnership(tokenId, day) == msg.sender, "Not slot owner");
        require(reservationToken.tokenToYear(tokenId) >= reservationToken.currentYear(), "Token expired");
        require(msg.value >= ethIncentive, "Insufficient ETH sent");

        uint256 offerId = swapOfferIdCounter++;
        swapOffers[offerId] = SwapOffer({
            tokenId: tokenId,
            day: day,
            targetPropertyId: targetPropertyId,
            targetYear: targetYear,
            targetWeekNumber: targetWeekNumber,
            targetDay: targetDay,
            ethIncentive: ethIncentive,
            isActive: true,
            offerer: msg.sender
        });

        emit SwapOfferCreated(offerId, tokenId, day, msg.sender);
    }

    function acceptSwapOffer(uint256 offerId, uint256 counterTokenId, uint8 counterDay) external nonReentrant {
        SwapOffer memory offer = swapOffers[offerId];
        require(offer.isActive, "Offer not active");
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

        swapOffers[offerId].isActive = false;

        // Perform the swap via the vault
        vault.swapSlots(offer.tokenId, offer.day, counterTokenId, counterDay);

        // Transfer ETH incentive if provided
        if (offer.ethIncentive > 0) {
            (bool success, ) = msg.sender.call{value: offer.ethIncentive}("");
            require(success, "ETH transfer failed");
        }

        emit SwapExecuted(offerId, offer.tokenId, offer.day, counterTokenId, counterDay);
    }

    function supportsInterface(bytes4 interfaceId) public view override(AccessControl) returns (bool) {
        return super.supportsInterface(interfaceId);
    }
    function rejectSwapOffer(uint256 offerId) external {
        SwapOffer storage offer = swapOffers[offerId];
        require(offer.isActive, "Offer not active");
        // Simplified: any token owner can reject; in practice, this could target specific owners
        offer.isActive = false;
        emit SwapOfferRejected(offerId, msg.sender);
    }

    function cancelSwapOffer(uint256 offerId) external {
        SwapOffer storage offer = swapOffers[offerId];
        require(offer.offerer == msg.sender, "Not offer creator");
        require(offer.isActive, "Offer not active");

        // Refund ETH if applicable
        if (offer.ethIncentive > 0) {
            (bool success, ) = offer.offerer.call{value: offer.ethIncentive}("");
            require(success, "ETH refund failed");
        }

        offer.isActive = false;
        emit SwapOfferCanceled(offerId, msg.sender);
    }
}