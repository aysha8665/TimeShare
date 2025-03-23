// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title TimeshareToken
 * @dev ERC1155 token representing ownership in timeshare properties
 * Different token IDs represent different properties
 * Token amounts represent ownership percentage
 */
contract TimeshareToken is ERC1155, AccessControl {
    bytes32 public constant PROPERTY_MANAGER_ROLE = keccak256("PROPERTY_MANAGER_ROLE");
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");

    // Property details struct
    struct Property {
        string name;
        string location;
        string description;
        string amenities;
        uint256 totalUnits;
        uint256 annualMaintenanceFeePerUnit;
        bool active;
    }

    // Mapping from property ID to Property struct
    mapping(uint256 => Property) public properties;
    // Next available property ID
    uint256 private nextPropertyId = 1;

    event PropertyCreated(uint256 indexed propertyId, string name, string location);
    event PropertyUpdated(uint256 indexed propertyId, string name, string location);
    event OwnershipTransferred(uint256 indexed propertyId, address indexed from, address indexed to, uint256 amount);

    constructor() ERC1155("https://api.timeshare-project.com/metadata/{id}.json") {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(ADMIN_ROLE, msg.sender);
    }

    /**
     * @dev Creates a new timeshare property
     * @param name Name of the property
     * @param location Location of the property
     * @param description Description of the property
     * @param amenities List of amenities
     * @param totalUnits Total ownership units for this property
     * @param maintenanceFee Annual maintenance fee per unit
     * @return propertyId ID of the newly created property
     */
    function createProperty(
        string memory name,
        string memory location,
        string memory description,
        string memory amenities,
        uint256 totalUnits,
        uint256 maintenanceFee
    ) external onlyRole(ADMIN_ROLE) returns (uint256 propertyId) {
        propertyId = nextPropertyId++;
        
        properties[propertyId] = Property({
            name: name,
            location: location,
            description: description,
            amenities: amenities,
            totalUnits: totalUnits,
            annualMaintenanceFeePerUnit: maintenanceFee,
            active: true
        });
        
        emit PropertyCreated(propertyId, name, location);
        return propertyId;
    }

    /**
     * @dev Updates property details
     */
    function updateProperty(
        uint256 propertyId,
        string memory name,
        string memory location,
        string memory description,
        string memory amenities,
        uint256 maintenanceFee
    ) external onlyRole(ADMIN_ROLE) {
        require(properties[propertyId].active, "Property does not exist");
        
        Property storage property = properties[propertyId];
        property.name = name;
        property.location = location;
        property.description = description;
        property.amenities = amenities;
        property.annualMaintenanceFeePerUnit = maintenanceFee;
        
        emit PropertyUpdated(propertyId, name, location);
    }

    /**
     * @dev Mints ownership tokens to initial owners
     */
    function mintInitialOwnership(
        uint256 propertyId,
        address[] memory owners,
        uint256[] memory amounts
    ) external onlyRole(ADMIN_ROLE) {
        require(properties[propertyId].active, "Property does not exist");
        require(owners.length == amounts.length, "Arrays length mismatch");
        
        uint256 totalAmount = 0;
        for (uint256 i = 0; i < amounts.length; i++) {
            totalAmount += amounts[i];
        }
        
        require(totalAmount <= properties[propertyId].totalUnits, "Total exceeds available units");
        
        for (uint256 i = 0; i < owners.length; i++) {
            _mint(owners[i], propertyId, amounts[i], "");
        }
    }

    /**
     * @dev Gets the number of units owned by an address for a property
     */
    function unitsOwned(address owner, uint256 propertyId) external view returns (uint256) {
        return balanceOf(owner, propertyId);
    }

    /**
     * @dev Override for the transfer function to emit our custom event
     */
    function safeTransferFrom(
        address from,
        address to,
        uint256 id,
        uint256 amount,
        bytes memory data
    ) public override {
        super.safeTransferFrom(from, to, id, amount, data);
        emit OwnershipTransferred(id, from, to, amount);
    }

    // The following functions are overrides required by Solidity
    function supportsInterface(bytes4 interfaceId) public view override(ERC1155, AccessControl) returns (bool) {
        return super.supportsInterface(interfaceId);
    }
}
