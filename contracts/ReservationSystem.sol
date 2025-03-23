// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "./TimeshareToken.sol";
/**
 * @title ReservationSystem
 * @dev Manages reservations for timeshare properties
 */
contract ReservationSystem is AccessControl, ReentrancyGuard {
    TimeshareToken public timeshareToken;
    
    bytes32 public constant PROPERTY_MANAGER_ROLE = keccak256("PROPERTY_MANAGER_ROLE");
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    
    // Reservation counter (replacing Counters.sol)
    uint256 private _reservationIdCounter;
    
    // Week struct
    struct Week {
        uint16 year;
        uint8 weekNumber; // 1-52
        bool isBlocked; // For maintenance
    }
    
    // Reservation struct
    struct Reservation {
        uint256 propertyId;
        uint16 year;
        uint8 weekNumber;
        address reservedBy;
        bool isRented;
        address renter;
        uint256 rentalPrice;
        bool isActive;
    }
    
    // Mapping from reservationId to Reservation
    mapping(uint256 => Reservation) public reservations;
    
    // Mapping from propertyId to year to week to reservationId
    mapping(uint256 => mapping(uint16 => mapping(uint8 => uint256))) public propertyWeekToReservation;
    
    // Mapping from propertyId to year to week to blocked status
    mapping(uint256 => mapping(uint16 => mapping(uint8 => bool))) public blockedWeeks;
    
    // Mapping from property to user to last year they paid maintenance fees
    mapping(uint256 => mapping(address => uint16)) public maintenanceFeePaid;
    
    // Maintenance fee collection address
    address public maintenanceFeeAddress;
    
    event WeekReserved(uint256 indexed reservationId, uint256 indexed propertyId, uint16 year, uint8 weekNumber, address indexed reservedBy);
    event ReservationCancelled(uint256 indexed reservationId);
    event WeekBlocked(uint256 indexed propertyId, uint16 year, uint8 weekNumber);
    event WeekUnblocked(uint256 indexed propertyId, uint16 year, uint8 weekNumber);
    event WeekListedForRent(uint256 indexed reservationId, uint256 price);
    event WeekRented(uint256 indexed reservationId, address indexed renter);
    event MaintenanceFeePaid(uint256 indexed propertyId, address indexed owner, uint16 year);
    
    constructor(TimeshareToken _timeshareToken, address _maintenanceFeeAddress) {
        timeshareToken = _timeshareToken;
        maintenanceFeeAddress = _maintenanceFeeAddress;
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(ADMIN_ROLE, msg.sender);
    }
    
    /**
     * @dev Get current reservation ID counter
     */
    function getReservationIdCounter() public view returns (uint256) {
        return _reservationIdCounter;
    }
    
    /**
     * @dev Increment and return the next reservation ID
     */
    function _getNextReservationId() private returns (uint256) {
        _reservationIdCounter += 1;
        return _reservationIdCounter;
    }
    
    /**
     * @dev Set maintenance fee collection address
     */
    function setMaintenanceFeeAddress(address _maintenanceFeeAddress) external onlyRole(ADMIN_ROLE) {
        maintenanceFeeAddress = _maintenanceFeeAddress;
    }
    
    /**
     * @dev Block a week for maintenance
     */
    function blockWeek(uint256 propertyId, uint16 year, uint8 weekNumber) external onlyRole(PROPERTY_MANAGER_ROLE) {
        require(weekNumber >= 1 && weekNumber <= 52, "Invalid week number");
        require(!blockedWeeks[propertyId][year][weekNumber], "Week already blocked");
        require(propertyWeekToReservation[propertyId][year][weekNumber] == 0, "Week already reserved");
        
        blockedWeeks[propertyId][year][weekNumber] = true;
        emit WeekBlocked(propertyId, year, weekNumber);
    }
    
    /**
     * @dev Unblock a week
     */
    function unblockWeek(uint256 propertyId, uint16 year, uint8 weekNumber) external onlyRole(PROPERTY_MANAGER_ROLE) {
        require(blockedWeeks[propertyId][year][weekNumber], "Week not blocked");
        
        blockedWeeks[propertyId][year][weekNumber] = false;
        emit WeekUnblocked(propertyId, year, weekNumber);
    }
    
    /**
     * @dev Pay annual maintenance fee
     */
    function payMaintenanceFee(uint256 propertyId, uint16 year) external payable nonReentrant {
        uint256 unitsOwned = timeshareToken.balanceOf(msg.sender, propertyId);
        require(unitsOwned > 0, "No ownership in this property");
        require(maintenanceFeePaid[propertyId][msg.sender] < year, "Already paid for this year");
        
        //uint256 feeAmount = unitsOwned * timeshareToken.properties(propertyId).annualMaintenanceFeePerUnit;
        (,,,,,uint256 fee,) = timeshareToken.properties(propertyId);
        uint256 feeAmount = unitsOwned * fee;
        require(msg.value >= feeAmount, "Insufficient payment");
        
        // Transfer fee to maintenance address
        (bool success, ) = maintenanceFeeAddress.call{value: feeAmount}("");
        require(success, "Fee transfer failed");
        
        // Refund excess payment
        if (msg.value > feeAmount) {
            (bool refundSuccess, ) = msg.sender.call{value: msg.value - feeAmount}("");
            require(refundSuccess, "Refund failed");
        }
        
        maintenanceFeePaid[propertyId][msg.sender] = year;
        emit MaintenanceFeePaid(propertyId, msg.sender, year);
    }
    
    /**
     * @dev Checks if owner has paid maintenance fee for the current year
     */
    function hasValidMaintenanceFee(uint256 propertyId, address owner, uint16 year) public view returns (bool) {
        return maintenanceFeePaid[propertyId][owner] >= year;
    }
    
    /**
     * @dev Reserve a week
     */
    function reserveWeek(uint256 propertyId, uint16 year, uint8 weekNumber) external nonReentrant {
        require(weekNumber >= 1 && weekNumber <= 52, "Invalid week number");
        require(!blockedWeeks[propertyId][year][weekNumber], "Week is blocked for maintenance");
        require(propertyWeekToReservation[propertyId][year][weekNumber] == 0, "Week already reserved");
        
        // Check ownership
        uint256 unitsOwned = timeshareToken.balanceOf(msg.sender, propertyId);
        require(unitsOwned > 0, "No ownership in this property");
        
        // Check maintenance fee payment
        require(hasValidMaintenanceFee(propertyId, msg.sender, year), "Maintenance fee not paid for this year");
        
        // Create reservation
        uint256 reservationId = _getNextReservationId();
        
        reservations[reservationId] = Reservation({
            propertyId: propertyId,
            year: year,
            weekNumber: weekNumber,
            reservedBy: msg.sender,
            isRented: false,
            renter: address(0),
            rentalPrice: 0,
            isActive: true
        });
        
        propertyWeekToReservation[propertyId][year][weekNumber] = reservationId;
        
        emit WeekReserved(reservationId, propertyId, year, weekNumber, msg.sender);
    }
    
    /**
     * @dev Cancel a reservation
     */
    function cancelReservation(uint256 reservationId) external nonReentrant {
        Reservation storage reservation = reservations[reservationId];
        require(reservation.isActive, "Reservation not active");
        require(reservation.reservedBy == msg.sender, "Not the reservation owner");
        require(!reservation.isRented, "Cannot cancel rented reservation");
        
        // Clear reservation
        reservation.isActive = false;
        propertyWeekToReservation[reservation.propertyId][reservation.year][reservation.weekNumber] = 0;
        
        emit ReservationCancelled(reservationId);
    }
    
    /**
     * @dev List a reserved week for rent
     */
    function listForRent(uint256 reservationId, uint256 price) external nonReentrant {
        Reservation storage reservation = reservations[reservationId];
        require(reservation.isActive, "Reservation not active");
        require(reservation.reservedBy == msg.sender, "Not the reservation owner");
        require(!reservation.isRented, "Already rented");
        
        reservation.rentalPrice = price;
        
        emit WeekListedForRent(reservationId, price);
    }
    
    /**
     * @dev Rent a week that is listed for rental
     */
    function rentWeek(uint256 reservationId) external payable nonReentrant {
        Reservation storage reservation = reservations[reservationId];
        require(reservation.isActive, "Reservation not active");
        require(!reservation.isRented, "Already rented");
        require(reservation.rentalPrice > 0, "Not listed for rent");
        require(msg.value >= reservation.rentalPrice, "Insufficient payment");
        
        // Transfer rental fee to owner
        (bool success, ) = reservation.reservedBy.call{value: reservation.rentalPrice}("");
        require(success, "Fee transfer failed");
        
        // Refund excess payment
        if (msg.value > reservation.rentalPrice) {
            (bool refundSuccess, ) = msg.sender.call{value: msg.value - reservation.rentalPrice}("");
            require(refundSuccess, "Refund failed");
        }
        
        // Update reservation
        reservation.isRented = true;
        reservation.renter = msg.sender;
        
        emit WeekRented(reservationId, msg.sender);
    }
    
    /**
     * @dev Get all reservations for a user
     * This is a view function and doesn't actually return the array (would be too gas intensive)
     * Frontend would need to call this in a loop or use events to get this data
     */
    function getReservationCount() external view returns (uint256) {
        return _reservationIdCounter;
    }
    
    /**
     * @dev Check if a week is available
     */
    function isWeekAvailable(uint256 propertyId, uint16 year, uint8 weekNumber) external view returns (bool) {
        return !blockedWeeks[propertyId][year][weekNumber] && 
               propertyWeekToReservation[propertyId][year][weekNumber] == 0;
    }
}
