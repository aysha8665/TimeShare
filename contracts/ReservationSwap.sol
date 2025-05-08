// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "./SmartStayToken.sol";
import "./NFTVault.sol";

contract ReservationSwap is AccessControl, ReentrancyGuard {
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");

    SmartStayToken public reservationToken;
    NFTVault public vault;

    enum OfferType { SWAP, SALE, BUY }

    struct Offer {
        OfferType offerType;
        uint256 targetTokenId;
        uint8 targetDay;
        uint256 offeredTokenId;
        uint8 offeredDay;
        uint256 ethAmount;
        bool isActive;
        address offerer;
    }

    mapping(uint256 => Offer) public offers;
    mapping(uint256 => mapping(uint8 => uint256)) public slotDayToOfferId;
    uint256 private offerIdCounter = 1;

    // Updated event with correct parameters
    event SwapOfferCreated(
        uint256 indexed offerId,
        uint256 targetTokenId,
        uint8 targetDay,
        uint256 offeredTokenId,
        uint8 offeredDay,
        address indexed offerer
    );
    event SwapExecuted(uint256 indexed offerId, uint256 tokenId1, uint8 day1, uint256 tokenId2, uint8 day2);
    event SwapOfferRejected(uint256 indexed offerId, address indexed rejecter);
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

    function createOffer(
        OfferType offerType,
        uint256 targetTokenId,
        uint8 targetDay,
        uint256 offeredTokenId,
        uint8 offeredDay,
        uint256 ethAmount
    ) external payable nonReentrant {
        require(targetDay < 7 && offeredDay < 7, "Invalid day");
        require(
            reservationToken.tokenToYear(targetTokenId) >= reservationToken.currentYear(),
            "Target token expired"
        );
        require(
            reservationToken.tokenToYear(offeredTokenId) >= reservationToken.currentYear(),
            "Offered token expired"
        );

        if (offerType == OfferType.SWAP) {
            require(
                vault.slotOwnership(offeredTokenId, offeredDay) == msg.sender,
                "Not owner of offered slot"
            );
            require(msg.value >= ethAmount, "Incorrect ETH sent");
            require(
                slotDayToOfferId[offeredTokenId][offeredDay] == 0,
                "Existing offer for this slot"
            );
        }

        
        offers[offerIdCounter] = Offer({
            offerType: offerType,
            targetTokenId: targetTokenId,
            targetDay: targetDay,
            offeredTokenId: offeredTokenId,
            offeredDay: offeredDay,
            ethAmount: ethAmount,
            isActive: true,
            offerer: msg.sender
        });

        if (offerType == OfferType.SWAP) {
            slotDayToOfferId[offeredTokenId][offeredDay] = offerIdCounter;
        }

        emit SwapOfferCreated(
            offerIdCounter,
            targetTokenId,
            targetDay,
            offeredTokenId,
            offeredDay,
            msg.sender
        );

        offerIdCounter++;
    }

    function acceptSwapOffer(uint256 offerId) external nonReentrant {
        Offer memory offer = offers[offerId];
        require(offer.isActive, "Offer not active");
        require(offer.offerType == OfferType.SWAP, "Not a swap offer");
        
        // Verify target slot ownership
        require(
            vault.slotOwnership(offer.targetTokenId, offer.targetDay) == msg.sender,
            "Not target slot owner"
        );

        // Verify offered slot still belongs to offerer
        if (offer.offeredTokenId != 0) {
            require(
                vault.slotOwnership(offer.offeredTokenId, offer.offeredDay) == offer.offerer,
                "Offerer no longer owns slot"
            );
        }


        offers[offerId].isActive = false;
        slotDayToOfferId[offer.offeredTokenId][offer.offeredDay] = 0;

        // Execute the swap
        vault.swapSlots(
            offer.offeredTokenId,
            offer.offeredDay,
            offer.targetTokenId,
            offer.targetDay
        );

        // Transfer ETH incentive if any
        if (offer.ethAmount > 0) {
            (bool success, ) = msg.sender.call{value: offer.ethAmount}("");
            require(success, "ETH transfer failed");
        }

        emit SwapExecuted(
            offerId,
            offer.offeredTokenId,
            offer.offeredDay,
            offer.targetTokenId,
            offer.targetDay
        );
    }

    function rejectSwapOffer(uint256 offerId) external nonReentrant {
        Offer storage offer = offers[offerId];
        require(offer.isActive, "Offer not active");
        require(offer.offerType == OfferType.SWAP, "Not a swap offer");
        
        // Only target slot owner can reject
        require(
            vault.slotOwnership(offer.targetTokenId, offer.targetDay) == msg.sender,
            "Not target slot owner"
        );

        offer.isActive = false;
        slotDayToOfferId[offer.offeredTokenId][offer.offeredDay] = 0;

        // Refund ETH
        if (offer.ethAmount > 0) {
            (bool success, ) = offer.offerer.call{value: offer.ethAmount}("");
            require(success, "ETH refund failed");
        }

        emit SwapOfferRejected(offerId, msg.sender);
    }

    function cancelOffer(uint256 offerId) external nonReentrant {
        Offer storage offer = offers[offerId];
        require(offer.offerer == msg.sender, "Not offer creator");
        //require(offer.isActive, "Offer not active");

        offer.isActive = false;
        if (offer.offerType == OfferType.SWAP) {
            slotDayToOfferId[offer.offeredTokenId][offer.offeredDay] = 0;
        }

        if (offer.ethAmount > 0) {
            (bool success, ) = msg.sender.call{value: offer.ethAmount}("");
            require(success, "ETH refund failed");
        }

        emit OfferCanceled(offerId, msg.sender);
    }

    function supportsInterface(bytes4 interfaceId) public view override(AccessControl) returns (bool) {
        return super.supportsInterface(interfaceId);
    }
}