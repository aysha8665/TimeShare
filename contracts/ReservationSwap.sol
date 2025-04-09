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

    struct SwapOffer {
        uint256 tokenId;
        uint256 targetPropertyId;
        uint16 targetYear;
        uint8 targetWeekNumber;
        uint256 ethPrice;
        address nftContract;
        uint256 nftId;
        address offerer;
        bool isActive;
    }

    mapping(uint256 => SwapOffer) public swapOffers;
    uint256 private swapOfferIdCounter = 1;

    event SwapOfferCreated(uint256 indexed offerId, uint256 indexed tokenId, address indexed offerer);
    event SwapExecuted(uint256 indexed offerId, uint256 indexed tokenId1, uint256 indexed tokenId2);
    event SwapOfferRejected(uint256 indexed offerId, address indexed rejecter);
    event SwapOfferCanceled(uint256 indexed offerId, address indexed canceler);

    constructor(address _reservationToken) {
        reservationToken = SmartStayToken(_reservationToken);
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(ADMIN_ROLE, msg.sender);
        //reservationToken.grantRole(keccak256("SWAP_CONTRACT_ROLE"), address(this));
    }

    function getNextSwapOfferId() public view returns (uint256) {
        return swapOfferIdCounter;
    }

    function createSwapOffer(
        uint256 tokenId,
        uint256 targetPropertyId,
        uint16 targetYear,
        uint8 targetWeekNumber,
        uint256 ethPrice,
        address nftContract,
        uint256 nftId
    ) external payable nonReentrant {
        if (nftContract != address(0)) {
            require(
                IERC721(nftContract).ownerOf(nftId) == msg.sender &&
                IERC721(nftContract).getApproved(nftId) == address(this),
                "NFT not approved"
            );
        }
        require(reservationToken.ownerOf(tokenId) == msg.sender, "Not token owner");
        require(reservationToken.tokenToYear(tokenId) >= reservationToken.currentYear(), "Token expired");
        require(msg.value >= ethPrice, "Insufficient ETH sent");

        uint256 offerId = swapOfferIdCounter++;

        swapOffers[offerId] = SwapOffer({
            tokenId: tokenId,
            targetPropertyId: targetPropertyId,
            targetYear: targetYear,
            targetWeekNumber: targetWeekNumber,
            ethPrice: ethPrice,
            nftContract: nftContract,
            nftId: nftId,
            offerer: msg.sender,
            isActive: true
        });

        emit SwapOfferCreated(offerId, tokenId, msg.sender);
    }

    function acceptSwapOffer(uint256 offerId, uint256 counterTokenId) external nonReentrant {
        SwapOffer memory offer = swapOffers[offerId];
        require(offer.isActive, "Offer not active");
        require(reservationToken.ownerOf(counterTokenId) == msg.sender, "Not counter token owner");
        require(
            reservationToken.tokenToYear(offer.tokenId) >= reservationToken.currentYear() &&
            reservationToken.tokenToYear(counterTokenId) >= reservationToken.currentYear(),
            "Token expired"
        );

        uint256 offerPropertyId = reservationToken.tokenToPropertyId(offer.tokenId);
        uint16 offerYear = reservationToken.tokenToYear(offer.tokenId);
        uint8 offerWeekNumber = reservationToken.tokenToWeekNumber(offer.tokenId);

        uint256 counterPropertyId = reservationToken.tokenToPropertyId(counterTokenId);
        uint16 counterYear = reservationToken.tokenToYear(counterTokenId);
        uint8 counterWeekNumber = reservationToken.tokenToWeekNumber(counterTokenId);

        bool matchesTarget = 
            (offer.targetPropertyId == 0 || offer.targetPropertyId == counterPropertyId) &&
            (offer.targetYear == 0 || offer.targetYear == counterYear) &&
            (offer.targetWeekNumber == 0 || offer.targetWeekNumber == counterWeekNumber);
        require(matchesTarget, "Does not match swap conditions");

        swapOffers[offerId].isActive = false;

        address offerer = offer.offerer;
        reservationToken.transferFrom(offerer, msg.sender, offer.tokenId);
        reservationToken.transferFrom(msg.sender, offerer, counterTokenId);

        //reservationToken.updatePropertyWeekToToken(offerPropertyId, offerYear, offerWeekNumber, offer.tokenId);
        //reservationToken.updatePropertyWeekToToken(counterPropertyId, counterYear, counterWeekNumber, counterTokenId);

        if (offer.ethPrice > 0) {
            (bool success, ) = msg.sender.call{value: offer.ethPrice}("");
            require(success, "ETH transfer failed");
        }

        if (offer.nftContract != address(0)) {
            IERC721 nft = IERC721(offer.nftContract);
            nft.transferFrom(offerer, msg.sender, offer.nftId);
        }

        emit SwapExecuted(offerId, offer.tokenId, counterTokenId);
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
        if (offer.ethPrice > 0) {
            (bool success, ) = offer.offerer.call{value: offer.ethPrice}("");
            require(success, "ETH refund failed");
        }

        offer.isActive = false;
        emit SwapOfferCanceled(offerId, msg.sender);
    }
}