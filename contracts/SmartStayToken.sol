// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/Strings.sol";
import "./NFTVault.sol";

/**
 * @title SmartStayToken
 * @dev ERC721 token contract for hotel reservations
 * Each NFT represents a unique reservation (property + year + week)
 */
contract SmartStayToken is ERC721, ERC721Enumerable, ERC721URIStorage, AccessControl {
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    bytes32 public constant SWAP_CONTRACT_ROLE = keccak256("SWAP_CONTRACT_ROLE");

    // Struct for a Property Property
    struct Property {
        string name;
        bool verified;
        bool active;
    }

    uint256 private nextPropertyId = 1;
    uint256 private nextTokenId = 1;
    uint16 public currentYear;

    mapping(uint256 => Property) public properties;
    mapping(uint256 => address) public propertyOwners; 
    mapping(uint256 => uint256) public tokenToPropertyId;
    mapping(uint256 => uint16) public tokenToYear;
    mapping(uint256 => uint8) public tokenToWeekNumber;
    mapping(uint256 => mapping(uint16 => mapping(uint8 => uint256))) public propertyWeekToToken;

    NFTVault public vault;

    event PropertyCreated(uint256 propertyId, string propertyName);
    event WeekMinted(uint256 tokenId, uint256 propertyId, uint16 year, uint8 weekNumber, address owner);

    constructor(uint16 _currentYear, address _vaultAddress) ERC721("SmartStayToken", "SST") {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(ADMIN_ROLE, msg.sender);
        currentYear = _currentYear;
        vault = NFTVault(_vaultAddress);
    }
    function createProperty(string memory propertyName) external returns (uint256) {
        uint256 propertyId = nextPropertyId++;
        properties[propertyId] = Property({name: propertyName, verified: false, active: true});
        propertyOwners[propertyId] = msg.sender; // Record the creator as the owner
        emit PropertyCreated(propertyId, propertyName);
        return propertyId;
    }

    function verifyProperty(uint256 propertyId) external onlyRole(ADMIN_ROLE) {
        properties[propertyId].verified = true;
    }

    // Mint an NFT for a specific week, restricted to the property owner
    function mintWeek(uint256 propertyId, uint16 year, uint8 weekNumber, address vaultAddress) external {
        require(properties[propertyId].active, "Property does not exist");
        require(propertyOwners[propertyId] == msg.sender, "Only property owner can mint");
        require(year >= currentYear, "Cannot mint for past year");
        require(weekNumber >= 1 && weekNumber <= 52, "Invalid week number");
        require(propertyWeekToToken[propertyId][year][weekNumber] == 0, "Week already minted");
        require(vaultAddress != address(0), "Invalid vault address");

        uint256 tokenId = nextTokenId++;
        _mint(vaultAddress, tokenId); // Mint to the vault
        tokenToPropertyId[tokenId] = propertyId;
        tokenToYear[tokenId] = year;
        tokenToWeekNumber[tokenId] = weekNumber;
        propertyWeekToToken[propertyId][year][weekNumber] = tokenId;

        // Initialize slot ownership in the vault
        vault.initializeSlotOwnership(tokenId, msg.sender);

        emit WeekMinted(tokenId, propertyId, year, weekNumber, msg.sender);
    }

    // Helper function to get the next token ID (simplified for this example)
    function getNextTokenId() public view returns (uint256) {
        return nextTokenId;
    }

    function getNextPropertyId() public view returns (uint256) {
        return nextPropertyId;
    }
    function setCurrentYear(uint16 year) external onlyRole(ADMIN_ROLE) {
        require(year >= currentYear, "Cannot set to past year");
        currentYear = year;
    }

    function isWeekAvailable(uint256 propertyId, uint16 year, uint8 weekNumber) external view returns (bool) {
        return propertyWeekToToken[propertyId][year][weekNumber] == 0;
    }

    function updatePropertyWeekToToken(
        uint256 propertyId,
        uint16 year,
        uint8 weekNumber,
        uint256 tokenId
    ) external onlyRole(SWAP_CONTRACT_ROLE) {
        propertyWeekToToken[propertyId][year][weekNumber] = tokenId;
    }

// Other override functions
    function supportsInterface(bytes4 interfaceId) 
        public 
        view 
        override(ERC721, ERC721Enumerable, ERC721URIStorage, AccessControl) 
        returns (bool) 
    {
        return super.supportsInterface(interfaceId);
    }

    string private _baseTokenURI;

    function _baseURI() internal view override returns (string memory) {
        return _baseTokenURI;
    }

    function setBaseURI(string memory newBaseURI) external onlyRole(ADMIN_ROLE) {
        _baseTokenURI = newBaseURI;
    }
    function tokenURI(uint256 tokenId)
            public
            view
            override(ERC721, ERC721URIStorage)
            returns (string memory)
        {
            return super.tokenURI(tokenId);
        }

    // Required overrides for OpenZeppelin v5.0.0
    function _update(address to, uint256 tokenId, address auth)
        internal
        override(ERC721, ERC721Enumerable)
        returns (address)
    {
        return super._update(to, tokenId, auth);
    }

    function _increaseBalance(address account, uint128 amount)
        internal
        override(ERC721, ERC721Enumerable)
    {
        super._increaseBalance(account, amount);
    }
}