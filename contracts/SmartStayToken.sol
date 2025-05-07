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
 * @dev ERC721 token contract for hotel reservations with integrated property and rental data management
 * Each NFT represents a unique reservation (property + year + week)
 */
contract SmartStayToken is ERC721, ERC721Enumerable, ERC721URIStorage, AccessControl {
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    bytes32 public constant SWAP_CONTRACT_ROLE = keccak256("SWAP_CONTRACT_ROLE");

    // Struct for a Property with integrated rental data
    struct Property {
        string name;
        string location; // e.g., "123 Beach Ave, Miami, FL"
        uint256 pricePerWeek; // Price in wei
        string amenities; // e.g., "Pool, WiFi, Parking"
        bool isAvailable; // Availability status
        string description; // Detailed description
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

    event PropertyCreated(uint256 indexed propertyId, string propertyName, string location, uint256 pricePerWeek, string amenities, string description);
    event PropertyUpdated(uint256 indexed propertyId, string location, uint256 pricePerWeek, string amenities, bool isAvailable, string description);
    event WeekMinted(uint256 indexed tokenId, uint256 indexed propertyId, uint16 year, uint8 weekNumber, address indexed owner);

    constructor(uint16 _currentYear) ERC721("SmartStayToken", "SST") {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(ADMIN_ROLE, msg.sender);
        currentYear = _currentYear;
    }

    /**
     * @dev Create a new property with integrated rental data
     * @param propertyName Name of the property
     * @param location Property location
     * @param pricePerWeek Price per week in wei
     * @param amenities List of amenities
     * @param description Property description
     * @return propertyId The ID of the created property
     */
    function createProperty(
        string memory propertyName,
        string memory location,
        uint256 pricePerWeek,
        string memory amenities,
        string memory description
    ) external returns (uint256) {
        require(bytes(propertyName).length > 0, "Property name cannot be empty");
        require(bytes(location).length > 0, "Location cannot be empty");
        require(pricePerWeek > 0, "Price must be greater than zero");

        uint256 propertyId = nextPropertyId++;
        properties[propertyId] = Property({
            name: propertyName,
            location: location,
            pricePerWeek: pricePerWeek,
            amenities: amenities,
            isAvailable: true,
            description: description,
            verified: false,
            active: true
        });
        propertyOwners[propertyId] = msg.sender;

        emit PropertyCreated(propertyId, propertyName, location, pricePerWeek, amenities, description);
        return propertyId;
    }

    /**
     * @dev Update property and rental data
     * @param propertyId The ID of the property
     * @param location New location
     * @param pricePerWeek New price per week in wei
     * @param amenities New amenities
     * @param isAvailable New availability status
     * @param description New description
     */
    function updateProperty(
        uint256 propertyId,
        string memory location,
        uint256 pricePerWeek,
        string memory amenities,
        bool isAvailable,
        string memory description
    ) external {
        require(properties[propertyId].active, "Property does not exist");
        require(propertyOwners[propertyId] == msg.sender || hasRole(ADMIN_ROLE, msg.sender), "Not authorized");
        require(bytes(location).length > 0, "Location cannot be empty");
        require(pricePerWeek > 0, "Price must be greater than zero");

        Property storage property = properties[propertyId];
        property.location = location;
        property.pricePerWeek = pricePerWeek;
        property.amenities = amenities;
        property.isAvailable = isAvailable;
        property.description = description;
        property.verified= false;

        emit PropertyUpdated(propertyId, location, pricePerWeek, amenities, isAvailable, description);
    }

    /**
     * @dev Get property and rental data
     * @param propertyId The ID of the property
     * @return Property struct
     */
    function getProperty(uint256 propertyId) external view returns (Property memory) {
        require(properties[propertyId].active, "Property does not exist");
        return properties[propertyId];
    }

    /**
     * @dev Verify a property
     * @param propertyId The ID of the property
     */
    function verifyProperty(uint256 propertyId) external onlyRole(ADMIN_ROLE) {
        require(properties[propertyId].active, "Property does not exist");
        properties[propertyId].verified = true;
    }

    /**
     * @dev Mint an NFT for a specific week, restricted to the property owner
     * @param propertyId The ID of the property
     * @param year The year of the reservation
     * @param weekNumber The week number (1-52)
     * @param vaultAddress The address of the NFTVault
     */
    function mintWeek(uint256 propertyId, uint16 year, uint8 weekNumber, address vaultAddress) external {
        Property memory property = properties[propertyId];
        require(property.active, "Property does not exist");
        require(property.verified, "Property is not verified");
        require(propertyOwners[propertyId] == msg.sender, "Only property owner can mint");
        require(year >= currentYear, "Cannot mint for past year");
        require(weekNumber >= 1 && weekNumber <= 52, "Invalid week number");
        require(propertyWeekToToken[propertyId][year][weekNumber] == 0, "Week already minted");
        require(vaultAddress != address(0), "Invalid vault address");
        require(property.isAvailable, "Property not available");

        uint256 tokenId = nextTokenId++;
        _mint(vaultAddress, tokenId);
        tokenToPropertyId[tokenId] = propertyId;
        tokenToYear[tokenId] = year;
        tokenToWeekNumber[tokenId] = weekNumber;
        propertyWeekToToken[propertyId][year][weekNumber] = tokenId;

        vault.initializeSlotOwnership(tokenId, msg.sender);

        emit WeekMinted(tokenId, propertyId, year, weekNumber, msg.sender);
    }

    /**
     * @dev Get the next token ID
     * @return The next token ID
     */
    function getNextTokenId() public view returns (uint256) {
        return nextTokenId;
    }


    /**
     * @dev Set the current year
     * @param year The new current year
     */
    function setCurrentYear(uint16 year) external onlyRole(ADMIN_ROLE) {
        require(year >= currentYear, "Cannot set to past year");
        currentYear = year;
    }

    /**
     * @dev Set Vault Address
     * @param _vaultAddress Vault Address
     */
    function SetVaultAddress(address _vaultAddress) external onlyRole(ADMIN_ROLE){
        vault = NFTVault(_vaultAddress);
    }

    /**
     * @dev Set the vault address
     * @param _vaultAddress The address of the NFTVault
     */
    function setVaultAddress(address _vaultAddress) external onlyRole(ADMIN_ROLE) {
        require(_vaultAddress != address(0), "Invalid vault address");
        vault = NFTVault(_vaultAddress);
    }

    /**
     * @dev Check if a week is available for a property
     * @param propertyId The ID of the property
     * @param year The year
     * @param weekNumber The week number
     * @return True if the week is available
     */
    function isWeekAvailable(uint256 propertyId, uint16 year, uint8 weekNumber) external view returns (bool) {
        Property memory property = properties[propertyId];
        return propertyWeekToToken[propertyId][year][weekNumber] == 0 && property.isAvailable;
    }

    /**
     * @dev Update the property week to token mapping
     * @param propertyId The ID of the property
     * @param year The year
     * @param weekNumber The week number
     * @param tokenId The token ID
     */
    function updatePropertyWeekToToken(
        uint256 propertyId,
        uint16 year,
        uint8 weekNumber,
        uint256 tokenId
    ) external onlyRole(SWAP_CONTRACT_ROLE) {
        propertyWeekToToken[propertyId][year][weekNumber] = tokenId;
    }

    // Override functions
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

    /**
     * @dev Set the base URI for token metadata
     * @param newBaseURI The new base URI
     */
    function setBaseURI(string memory newBaseURI) external onlyRole(ADMIN_ROLE) {
        _baseTokenURI = newBaseURI;
    }
    /**
     * @dev get Next PropertyId
     */
    function getNextPropertyId() public view returns (uint256) {
        return nextPropertyId;
    }

    /**
     * @dev Get the token URI
     * @param tokenId The token ID
     * @return The token URI
     */
    function tokenURI(uint256 tokenId)
        public
        view
        override(ERC721, ERC721URIStorage)
        returns (string memory)
    {
        return super.tokenURI(tokenId);
    }

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