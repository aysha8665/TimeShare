// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "./SmartStayToken.sol";

contract NFTVault is ReentrancyGuard{
    SmartStayToken public immutable smartStayToken;

    // Mapping: tokenId => day (0-6) => owner address
    mapping(uint256 => mapping(uint8 => address)) public slotOwnership;

    event SlotOwnershipInitialized(uint256 indexed tokenId, address indexed initialOwner);
    event SlotTransferred(uint256 indexed tokenId, uint8 day, address indexed from, address indexed to);
    event SlotsSwapped(
        uint256 indexed tokenId1, uint8 day1, address owner1,
        uint256 indexed tokenId2, uint8 day2, address owner2
    );
    event NFTWithdrawn(uint256 indexed tokenId, address indexed owner);

    constructor(address _reservationToken) {
        smartStayToken = SmartStayToken(_reservationToken);
    }

    // Called after minting to initialize slot ownership
    function initializeSlotOwnership(uint256 tokenId, address initialOwner) external {
        require(smartStayToken.ownerOf(tokenId) == address(this), "NFT not in vault");
        require(msg.sender == initialOwner, "Only property owner can initialize"); // Could be restricted further
        for (uint8 day = 0; day < 7; day++) {
            slotOwnership[tokenId][day] = initialOwner;
        }
        emit SlotOwnershipInitialized(tokenId, initialOwner);
    }

    // Transfer a specific day's slot to another address
    function transferSlot(uint256 tokenId, uint8 day, address to) external {
        require(day < 7, "Invalid day");
        require(slotOwnership[tokenId][day] == msg.sender, "Not slot owner");
        slotOwnership[tokenId][day] = to;
        emit SlotTransferred(tokenId, day, msg.sender, to);
    }

    // Swap slots between two owners
    function swapSlots(uint256 tokenId1, uint8 day1, uint256 tokenId2, uint8 day2) external {
        require(day1 < 7 && day2 < 7, "Invalid day");
        address owner1 = slotOwnership[tokenId1][day1];
        address owner2 = slotOwnership[tokenId2][day2];
        require(owner1 == msg.sender || owner2 == msg.sender, "Not slot owner");
        slotOwnership[tokenId1][day1] = owner2;
        slotOwnership[tokenId2][day2] = owner1;
        emit SlotsSwapped(tokenId1, day1, owner1, tokenId2, day2, owner2);
    }

    // Withdraw NFT if all slots are owned by the caller
    function withdrawNFT(uint256 tokenId) external {
        for (uint8 day = 0; day < 7; day++) {
            require(slotOwnership[tokenId][day] == msg.sender, "Not all slots owned");
        }
        smartStayToken.transferFrom(address(this), msg.sender, tokenId);
        emit NFTWithdrawn(tokenId, msg.sender);
    }
}