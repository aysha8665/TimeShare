"use client";
import { useState, useEffect } from "react";
import { ethers } from "ethers";
import useMetaMask from './hooks/useMetaMask';
import SmartStayToken from '../../../artifacts/contracts/SmartStayToken.sol/SmartStayToken.json';
import ReservationSwap from '../../../artifacts/contracts/ReservationSwap.sol/ReservationSwap.json';

const SMART_STAY_ADDRESS = "0x5FbDB2315678afecb367f032d93F642f64180aa3";
const RESERVATION_SWAP_ADDRESS = "0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9";
const VAULT_ADDRESS = "0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0";

export default function Home() {
  const [activeTab, setActiveTab] = useState("properties");
  const { provider, signer, account, connect, error, isConnecting } = useMetaMask();
  const [smartStayToken, setSmartStayToken] = useState(null);
  const [smartStayTokenReadOnly, setSmartStayTokenReadOnly] = useState(null);
  const [reservationSwap, setReservationSwap] = useState(null);
  const [reservationSwapReadOnly, setReservationSwapReadOnly] = useState(null);
  const [vaultReadOnly, setVaultReadOnly] = useState(null);
  const [properties, setProperties] = useState([]);
  const [reservations, setReservations] = useState([]);
  const [swapOffers, setSwapOffers] = useState([]);

  const [allSlots, setAllSlots] = useState([]);
  const [showOfferModal, setShowOfferModal] = useState(false);
  const [availableTargetSlots, setAvailableTargetSlots] = useState([]);
  
  // Property creation form state
  const [newPropertyName, setNewPropertyName] = useState("");
  const [newPropertyLocation, setNewPropertyLocation] = useState("");
  const [newPropertyPrice, setNewPropertyPrice] = useState("");
  const [newPropertyAmenities, setNewPropertyAmenities] = useState("");
  const [newPropertyDescription, setNewPropertyDescription] = useState("");
  const [selectedTargetSlot, setSelectedTargetSlot] = useState(null);
  
  // Minting state
  const [mintInputs, setMintInputs] = useState({});
  
  // Swap creation state
  const [selectedOfferedSlot, setSelectedOfferedSlot] = useState("");
  const [targetPropertyId, setTargetPropertyId] = useState("");
  const [targetYear, setTargetYear] = useState("");
  const [targetWeekNumber, setTargetWeekNumber] = useState("");
  const [targetDay, setTargetDay] = useState("");
  const [ethIncentive, setEthIncentive] = useState("");
  const [offerType, setOfferType] = useState("SWAP");
  
  // UI state
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const vaultAbi = [
    "function slotOwnership(uint256 tokenId, uint8 day) view returns (address)",
    "function initializeSlotOwnership(uint256 tokenId, address initialOwner) external",
    "function transferSlot(uint256 tokenId, uint8 day, address to) external",
    "function swapSlots(uint256 tokenId1, uint8 day1, uint256 tokenId2, uint8 day2) external"
  ];

  const [operationLoading, setOperationLoading] = useState({
    properties: false,
    reservations: false,
    swaps: false,
    general: false
  });

  useEffect(() => {
    let smartStayReadOnly;
    let swapReadOnly;
    let vaultReadOnly;
  
    // Define an async helper function to handle asynchronous operations
    const initializeContracts = async () => {
      if (provider) {
        try {
          // Check if contract exists at the address
          const code = await provider.getCode(SMART_STAY_ADDRESS);
          console.log("Code at SmartStayToken address:", code);
          if (code === "0x") {
            console.error("No contract found at", SMART_STAY_ADDRESS);
          } else {
            console.log("Contract found at", SMART_STAY_ADDRESS);
          }
  
          smartStayReadOnly = new ethers.Contract(
            SMART_STAY_ADDRESS,
            SmartStayToken.abi,
            provider
          );
        } catch (err) {
          console.error("Contract init error:", err);
        }
  
        try {
          swapReadOnly = new ethers.Contract(
            RESERVATION_SWAP_ADDRESS,
            ReservationSwap.abi,
            provider
          );
        } catch (err) {
          console.error("Contract init error:", err);
        }
  
        try {
          vaultReadOnly = new ethers.Contract(VAULT_ADDRESS, vaultAbi, provider);
        } catch (err) {
          console.error("Contract init error:", err);
        }
  
        setSmartStayTokenReadOnly(smartStayReadOnly);
        setReservationSwapReadOnly(swapReadOnly);
        setVaultReadOnly(vaultReadOnly);
      }
  
      if (signer) {
        try {
          const smartStay = new ethers.Contract(
            SMART_STAY_ADDRESS,
            SmartStayToken.abi,
            signer
          );
          const swapContract = new ethers.Contract(
            RESERVATION_SWAP_ADDRESS,
            ReservationSwap.abi,
            signer
          );
          setSmartStayToken(smartStay);
          setReservationSwap(swapContract);
        } catch (err) {
          setErrorMessage("Failed to initialize contracts: " + err.message);
        }
      } else {
        setSmartStayToken(null);
        setReservationSwap(null);
      }
    };
  
    // Call the async function
    initializeContracts();
  }, [provider, signer]);

  useEffect(() => {
    if (smartStayTokenReadOnly && reservationSwapReadOnly && vaultReadOnly && account) {
      const fetchData = async () => {
        await fetchProperties();
        await fetchReservations();
        await fetchSwapOffers();
        await fetchAllSlots(); 
      };
      fetchData();
    } else if (!account) {
      setProperties([]);
      setReservations([]);
      setSwapOffers([]);
      setAllSlots([]);
    }
  }, [smartStayTokenReadOnly, reservationSwapReadOnly, vaultReadOnly, account]);

  const fetchAllSlots = async () => {
    if (!smartStayTokenReadOnly || !vaultReadOnly) return;
    
    try {
      const nextTokenId = await smartStayTokenReadOnly.getNextTokenId();
      const slots = [];
  
      for (let tokenId = 1; tokenId < nextTokenId; tokenId++) {
        const [propertyId, year, weekNumber] = await Promise.all([
          smartStayTokenReadOnly.tokenToPropertyId(tokenId),
          smartStayTokenReadOnly.tokenToYear(tokenId),
          smartStayTokenReadOnly.tokenToWeekNumber(tokenId)
        ]);
        
        const property = await smartStayTokenReadOnly.properties(propertyId);
        
        for (let day = 0; day < 7; day++) {
          const owner = await vaultReadOnly.slotOwnership(tokenId, day);
          slots.push({
            tokenId: tokenId.toString(),
            day: day.toString(),
            propertyId: propertyId.toString(),
            propertyName: property.name,
            year: year.toString(),
            week: weekNumber.toString(),
            owner: owner.toLowerCase(),
            imageUrl: `/images/property${propertyId}.jpg`
          });
        }
      }
  
      setAllSlots(slots);
      // Filter out user-owned slots and current offering slot
      setAvailableTargetSlots(slots.filter(slot => 
        slot.owner === account.toLowerCase() && 
        !(slot.tokenId === selectedTargetSlot?.tokenId && slot.day === selectedTargetSlot?.day)
      ));
    } catch (err) {
      console.error("Error fetching slots:", err);
      setErrorMessage("Failed to load available slots");
    }
  };


  const fetchProperties = async () => {
    if (!smartStayTokenReadOnly) return;
    setOperationLoading(prev => ({...prev, properties: true}));
    setErrorMessage("");
    try {
      const nextId = await smartStayTokenReadOnly.getNextPropertyId();
      const nextIdNum = nextId ? Number(nextId) : 0;
      if (!nextId || nextId === 0n) {
        setProperties([]);
        return;
      }
      const props = [];
      for (let i = 1; i < nextIdNum; i++) {
        const owner = await smartStayTokenReadOnly.propertyOwners(i); // Get owner
        const prop = await smartStayTokenReadOnly.properties(i);
        const imageUrl = `/images/property${i}.jpg`;
        let price = ethers.formatUnits(prop.pricePerWeek.toString(), 18) ;
        console.log("fetchProperties::pricePerWeek", prop.pricePerWeek.toString());
        console.log("fetchProperties::formatUnits", price);
        props.push({ 
          id: i, 
          name: prop.name,
          location: prop.location,
          pricePerWeek: (prop.pricePerWeek ? price : "0.00"),
          amenities: prop.amenities,
          description: prop.description,
          verified: prop.verified, 
          active: prop.active, 
          imageUrl ,
          owner: owner.toLowerCase()
        });
      }
      setProperties(props);
    } catch (err) {
      console.error("Error fetching properties:", err);
      if (err.code === "BAD_DATA") {
        setErrorMessage("Failed to fetch properties: Invalid data returned from contract. Check contract deployment.");
      } else {
        setErrorMessage("Failed to fetch properties: " + err.message);
      }
    } finally {
      setOperationLoading(prev => ({...prev, properties: false}));
    }
  };
  
  const fetchReservations = async () => {
    if (!vaultReadOnly || !smartStayTokenReadOnly || !account) return;
    setLoading(true);
    setErrorMessage("");
    try {
      const nextTokenId = await smartStayTokenReadOnly.getNextTokenId();
      const nextTokenIdNum = nextTokenId ? Number(nextTokenId) : 0;
      if (!nextTokenId || nextTokenId === 0n) {
        setReservations([]);
        return;
      }
      const ownedSlots = [];
      for (let tokenId = 1; tokenId < nextTokenIdNum; tokenId++) {
        for (let day = 0; day < 7; day++) {
          const owner = await vaultReadOnly.slotOwnership(tokenId, day);
          const prop = await smartStayTokenReadOnly.properties(tokenId);
          if (owner?.toLowerCase() === account.toLowerCase())  {
            const propertyId = await smartStayTokenReadOnly.tokenToPropertyId(tokenId);
            const year = await smartStayTokenReadOnly.tokenToYear(tokenId);
            const week = await smartStayTokenReadOnly.tokenToWeekNumber(tokenId);
            const property = properties.find((p) => p.id.toString() === propertyId.toString());
            const imageUrl = property ? property.imageUrl : "/images/default-property.jpg";
            const name = prop.name ;
            ownedSlots.push({
              name: name.toString(),
              tokenId: tokenId.toString(),
              day: day.toString(),
              propertyId: propertyId.toString(),
              year: year.toString(),
              week: week.toString(),
              imageUrl,
            });
          }
        }
      }
      setReservations(ownedSlots);
    } catch (err) {
      console.error("Error fetching reservations:", err);
      setErrorMessage("Failed to fetch reservations: " + err.message);
    }
    setLoading(false);
  };
  
  const fetchSwapOffers = async () => {
    if (!reservationSwapReadOnly || !smartStayTokenReadOnly) return;
    setLoading(true);
    setErrorMessage("");
  
    try {
      console.log("[DEBUG] Starting swap offers fetch");
    console.log("[DEBUG] Current account:", account);

      const nextOfferId = await reservationSwapReadOnly.getNextOfferId();
      console.log("[DEBUG] Next offer ID:", nextOfferId.toString());

      if (!nextOfferId || nextOfferId === 0n) {
        setSwapOffers([]);
        return;
      }
  
      const offers = [];
      const offerPromises = [];
  
      // Pre-fetch all offers first
      for (let i = 1; i < nextOfferId; i++) {
        offerPromises.push(reservationSwapReadOnly.offers(i));
      }
  
      const rawOffers = await Promise.all(offerPromises);
  
      for (let i = 0; i < rawOffers.length; i++) {
        const offer = rawOffers[i];
      console.log(`[DEBUG] Processing offer ${i + 1}:`, offer);

        if (!offer.isActive) continue;
  
        try {

                  // Add debug logs for ownership checks
        const targetOwner = await vaultReadOnly.slotOwnership(
          offer.targetTokenId, 
          offer.targetDay
        );
        console.log(`[DEBUG] Target slot owner: ${targetOwner.toLowerCase()} vs current account: ${account}`);
        
        const offeredOwner = await vaultReadOnly.slotOwnership(
          offer.offeredTokenId, 
          offer.offeredDay
        );
        console.log(`[DEBUG] Offered slot owner: ${offeredOwner.toLowerCase()} vs offerer: ${offer.offerer}`);

        let currentTargetSlotOwner= await vaultReadOnly.slotOwnership(
          offer.targetTokenId, 
          offer.targetDay
        );
        const isTargetOwnedByCurrentUser = currentTargetSlotOwner.toLowerCase() === account.toLowerCase();

const isSwapPossible = offer.offerType === 0 ? 
  (await vaultReadOnly.slotOwnership(
    offer.offeredTokenId, 
    offer.offeredDay
  )) === offer.offerer : 
  true;

  console.log(`[DEBUG] Offer ${i + 1} results:`, {
    isTargetOwnedByCurrentUser,
    isSwapPossible
  });

          // Get details for both sides of the offer
          const [offeredPropertyId, targetPropertyId] = await Promise.all([
            smartStayTokenReadOnly.tokenToPropertyId(offer.offeredTokenId),
            offer.targetTokenId !== 0n ? 
              smartStayTokenReadOnly.tokenToPropertyId(offer.targetTokenId) : 
              Promise.resolve(0n)
          ]);
  
          // Fetch property data in parallel
          const [offeredProperty, targetProperty] = await Promise.all([
            smartStayTokenReadOnly.properties(offeredPropertyId),
            offer.targetTokenId !== 0n ? 
              smartStayTokenReadOnly.properties(targetPropertyId) : 
              Promise.resolve(null)
          ]);
  
          // Convert offer type to string
          const offerTypeStr = "SWAP";
           // offer.offerType === 0 ? "SWAP" : 
           // offer.offerType === 1 ? "SALE" : "BUY";
  
          // Format ETH amount
          const ethAmount = ethers.formatUnits(offer.ethAmount.toString(), 18);
  
          offers.push({
            offerId: i + 1, // offer IDs start at 1
            offerType: offerTypeStr,
            offered: {
              tokenId: offer.offeredTokenId.toString(),
              day: offer.offeredDay.toString(),
              propertyId: offeredPropertyId.toString(),
              name: offeredProperty.name || "Unknown",
              imageUrl: `/images/property${offeredPropertyId}.jpg`,
              isTargetOwnedByCurrentUser,
              isSwapPossible
            },
            target: {
              tokenId: offer.targetTokenId.toString(),
              day: offer.targetDay.toString(),
              propertyId: targetPropertyId.toString(),
              name: targetProperty?.name || "Any",
              imageUrl: targetPropertyId !== 0n ? 
                `/images/property${targetPropertyId}.jpg` : 
                "/images/default-property.jpg"
            },
            ethAmount,
            offerer: offer.offerer,
            isSwapPossible: offerTypeStr === "SWAP" ? 
              await checkSwapFeasibility(offer) : 
              null
          });
        } catch (err) {
          console.error(`Error processing offer ${i + 1}:`, err);
        }
      }
  
      setSwapOffers(offers);
    } catch (err) {
      console.error("Error fetching swap offers:", err);
      setErrorMessage("Failed to fetch swap offers: " + err.message);
    } finally {
      setLoading(false);
    }
  };
  
  // Helper function to check swap feasibility
  const checkSwapFeasibility = async (offer) => {
    try {
      const [offeredOwner, targetOwner] = await Promise.all([
        vaultReadOnly.slotOwnership(offer.offeredTokenId, offer.offeredDay),
        vaultReadOnly.slotOwnership(offer.targetTokenId, offer.targetDay)
      ]);
  
      return offeredOwner === offer.offerer && targetOwner !== offer.offerer;
    } catch (err) {
      console.error("Feasibility check failed:", err);
      return false;
    }
  };

  const handleCreateProperty = async () => {
    if (!smartStayToken) {
      console.error("Contract not connected");
      setErrorMessage("Please connect your wallet first");
      return;
    }
  
    // Validate inputs
    if (!newPropertyName || !newPropertyLocation || !newPropertyPrice) {
      setErrorMessage("Name, Location and Price are required");
      return;
    }
  
    console.log("Creating property with:", {
      name: newPropertyName,
      location: newPropertyLocation,
      price: newPropertyPrice
    });
  
    setOperationLoading(prev => ({...prev, general: true}));
    setErrorMessage("");
    console.log("handleCreateProperty::newPropertyPrice", newPropertyPrice.toString());
    console.log("handleCreateProperty::parseUnits", ethers.parseUnits(newPropertyPrice.toString(), 18));
    try {
      const tx = await smartStayToken.createProperty(
        newPropertyName,
        newPropertyLocation,
        ethers.parseUnits(newPropertyPrice.toString(), 18),
        newPropertyAmenities || "",
        newPropertyDescription || "",
      );
  
      console.log("TX hash:", tx.hash);
      console.log("Waiting for confirmation...");
  
      const receipt = await tx.wait();
      console.log("Confirmed in block:", receipt.blockNumber);
  
      if (receipt.status === 0) {
        throw new Error("Transaction reverted");
      }
  
      // Verify creation
      const propertyCount = await smartStayToken.getNextPropertyId();
      const newProperty = await smartStayToken.properties(propertyCount - 1n);
      console.log("New property created:", {
        id: propertyCount - 1n,
        name: newProperty.name,
        verified: newProperty.verified
      });
  
      // Reset form
      setNewPropertyName("");
      setNewPropertyLocation("");
      setNewPropertyPrice("");
      setNewPropertyAmenities("");
      setNewPropertyDescription("");
  
      // Refresh data
      await fetchProperties();
      setErrorMessage("Property created successfully!");
  
    } catch (err) {
      console.error("Creation error:", err);
      
      let errorMsg = "Creation failed";
      if (err.code === 4001) errorMsg = "User denied transaction";
      else if (err.reason) errorMsg = `Contract error: ${err.reason}`;
      else if (err.message.includes("revert")) {
        errorMsg = err.message.split("revert")[1]?.trim() || "Contract reverted";
      }
  
      setErrorMessage(errorMsg);
    } finally {
      setOperationLoading(prev => ({...prev, general: false}));
    }
  };

  const handleMintWeek = async (propertyId, year, week) => {
    const property = properties.find(p => p.id === propertyId);
    if (!property || property.owner !== account.toLowerCase()) {
      setErrorMessage("Only the property owner can mint weeks");
      return;
    }
    if (!smartStayToken) return;
    const yearNum = parseInt(year);
    const weekNum = parseInt(week);
    if (isNaN(yearNum) || isNaN(weekNum) || yearNum < 2025 || weekNum < 1 || weekNum > 52) {
      setErrorMessage("Please enter a valid year (2025 or later) and week number (1-52)");
      return;
    }
    setLoading(true);
    setErrorMessage("");
    try {
      const tx = await smartStayToken.mintWeek(propertyId, yearNum, weekNum, VAULT_ADDRESS);
      await tx.wait();
      await fetchReservations();
      setMintInputs(prev => ({ ...prev, [propertyId]: { year: "", week: "" } }));
    } catch (err) {
      console.error("Error minting week:", err);
      setErrorMessage(err.code === 4001 ? "Transaction rejected by user" : "Failed to mint week: " + err.message);
    }
    setLoading(false);
  };
  const handleCreateSwap = async () => {
    if (!reservationSwap || !selectedTargetSlot || !account) return;
    setLoading(true);
    setErrorMessage("");
  
    try {
      // 1. Verify ownership of offered slot
      const targetSlotOwner = await vaultReadOnly.slotOwnership(
        selectedTargetSlot.tokenId, 
        selectedTargetSlot.day
      );

      const offeredSlotOwner  = await vaultReadOnly.slotOwnership(
        selectedOfferedSlot.tokenId, 
        selectedOfferedSlot.day
      );
      
      console.log("account", account.toLowerCase());
      console.log("offeredSlotOwner", offeredSlotOwner.toLowerCase());
      console.log("offered selectedTargetSlot tokenId", selectedTargetSlot.tokenId);
      
      console.log("selectedTarget SlotOwner", targetSlotOwner.toLowerCase());
      console.log("selectedOfferedSlot tokenId", selectedOfferedSlot.tokenId);

      if (offeredSlotOwner.toLowerCase() !== account.toLowerCase()) {
        throw new Error("You don't own the slot you're trying to offer");
      }
      
      // 2. Check if the slot is already offered  
      // 2. Validate required fields
      if (offerType === "SWAP" && !selectedOfferedSlot) {
        throw new Error("Please select a target slot for swap");
      }
      if (!ethIncentive || Number(ethIncentive) <= 0) {
        throw new Error("Invalid ETH amount");
      }
  
      const price = ethers.parseUnits(ethIncentive.toString(), 18);
      let tx;
  
      if (offerType === "SWAP") {
        // 3. Proper parameter structure for SWAP
        tx = await reservationSwap.createOffer(
          0, // SWAP type
          selectedTargetSlot.tokenId,        // Offered token ID (YOUR slot)
          selectedTargetSlot.day,            // Offered day (YOUR slot)
          selectedOfferedSlot.tokenId,  // Target token ID
          selectedOfferedSlot.day,      // Target day
          
          price,
          { value: price }
        );
      } else if (offerType === "SALE") {
        // SALE parameter structure
        tx = await reservationSwap.createOffer(
          1, // SALE type
          0, 0, // No target
          selectedTargetSlot.tokenId,
          selectedTargetSlot.day,
          price
        );
      } else { // BUY
        // BUY parameter structure
        tx = await reservationSwap.createOffer(
          2, // BUY type
          0, 0, // No target
          selectedTargetSlot.tokenId,
          selectedTargetSlot.day,
          price,
          { value: price }
        );
      }
  
      await tx.wait();
      await fetchSwapOffers();
      
      // Reset state
      setSelectedTargetSlot(null);
      setSelectedOfferedSlot(null);
      setEthIncentive("");
      setShowOfferModal(false);
  
    } catch (err) {
      console.error("Swap creation failed:", err);
      let errorMsg = err.reason?.split("revert ")[1] || err.message;
      if (err.code === 4001) errorMsg = "Transaction rejected";
      setErrorMessage(errorMsg);
    } finally {
      setLoading(false);
    }
  };
  

  const handleAcceptSwap = async (offerId) => {
    if (!reservationSwap) return;
    setLoading(true);
    setErrorMessage("");
    try {
      const offer = swapOffers.find((o) => o.offerId === offerId);
      if (!offer) {
        setErrorMessage("Offer not found");
        setLoading(false);
        return;
      }
  
      // Corrected: Check if user owns the target slot (tokenId + day)
      const matchingSlot = reservations.find((slot) => 
        slot.tokenId === offer.target.tokenId && 
        slot.day === offer.target.day
      );
  
      if (!matchingSlot) {
        setErrorMessage("You don't own the target slot");
        setLoading(false);
        return;
      }
  
      // Execute the swap
      const tx = await reservationSwap.acceptSwapOffer(offerId);
      await tx.wait();
  
      await fetchSwapOffers();
      await fetchReservations();
    } catch (err) {
      console.error("Error accepting swap:", err);
      setErrorMessage(err.code === 4001 ? "Transaction rejected by user" : "Failed to accept swap: " + err.message);
    }
    setLoading(false);
  };

  const handleCancelSwap = async (offerId) => {
    if (!reservationSwap) return;
    setLoading(true);
    setErrorMessage("");
    try {
      const tx = await reservationSwap.cancelOffer(offerId);
      await tx.wait();
      await fetchSwapOffers();
    } catch (err) {
      console.error("Error canceling swap:", err);
      setErrorMessage(err.code === 4001 ? "Transaction rejected by user" : "Failed to cancel swap: " + err.message);
    }
    setLoading(false);
  };

  const handleVerifyProperty = async (propertyId) => {
    if (!smartStayToken) return;
    setLoading(true);
    setErrorMessage("");
    try {
      const tx = await smartStayToken.verifyProperty(propertyId);
      await tx.wait();
      await fetchProperties();
    } catch (err) {
      console.error("Error verifying property:", err);
      setErrorMessage(err.code === 4001 ? "Transaction rejected by user" : "Failed to verify property: " + err.message);
    }
    setLoading(false);
  };

  const hasMatchingSlot = (offer) => {
    if (offer.offerType !== "SWAP") return false;
    
    return reservations.some((slot) => {
      const propertyMatch = offer.targetProperty === "Any" || slot.propertyId === offer.targetPropertyId;
      const yearMatch = offer.targetYear === "Any" || slot.year === offer.targetYear;
      const weekMatch = offer.targetWeekNumber === "Any" || slot.week === offer.targetWeekNumber;
      const dayMatch = slot.day === offer.targetDay;
      return propertyMatch && yearMatch && weekMatch && dayMatch;
    });
  };

  const disconnect = () => {
    setAccount(null);
    setSmartStayToken(null);
    setReservationSwap(null);
    setProperties([]);
    setReservations([]);
    setSwapOffers([]);
    setErrorMessage("Disconnected. Please reconnect to MetaMask.");
  };

  if (!account) {
    return (
      <main className="min-h-screen p-8">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-3xl font-bold mb-8">Smart Stay dApp</h1>
          <button
            onClick={connect}
            disabled={isConnecting}
            className="bg-blue-500 text-white px-6 py-2 rounded hover:bg-blue-600"
          >
            {isConnecting ? "Connecting..." : "Connect MetaMask"}
          </button>
          {error && <p className="text-red-500 mt-4">{error}</p>}
          {errorMessage && <p className="text-red-500 mt-4">{errorMessage}</p>}
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-center mb-8">Smart Stay dApp</h1>
        <div className="text-center mb-4">
          <p>Connected: {account.slice(0, 6)}...{account.slice(-4)}</p>
          <div className="mt-2">
            <button
              onClick={() => window.ethereum.request({ method: "wallet_requestPermissions", params: [{ eth_accounts: {} }] })}
              className="bg-orange-500 text-white px-4 py-2 rounded hover:bg-orange-600 mr-2"
            >
              Switch Account
            </button>
            <button
              onClick={disconnect}
              className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600"
            >
              Disconnect
            </button>
          </div>
        </div>
        {errorMessage && <p className="text-red-500 text-center mb-4">{errorMessage}</p>}

        <div className="flex justify-center mb-8">
          <button className={`px-4 py-2 ${activeTab === "properties" ? "bg-blue-500 text-white" : "bg-gray-200"}`} onClick={() => setActiveTab("properties")}>Properties</button>
          <button className={`px-4 py-2 ${activeTab === "reservations" ? "bg-blue-500 text-white" : "bg-gray-200"}`} onClick={() => setActiveTab("reservations")}>My Reservations</button>
          <button className={`px-4 py-2 ${activeTab === "swap" ? "bg-blue-500 text-white" : "bg-gray-200"}`} onClick={() => setActiveTab("swap")}>Swap Market</button>
          <button className={`px-4 py-2 ${activeTab === "admin" ? "bg-blue-500 text-white" : "bg-gray-200"}`} onClick={() => setActiveTab("admin")}>Admin</button>
        </div>

        
        {loading ? (
          <div className="fixed top-4 right-4 bg-blue-500 text-white p-4 rounded-lg shadow-lg">
            <div className="flex items-center gap-2">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
              <span>Loading...</span>
            </div>
          </div>
        ) : (
          <div>
            {activeTab === "properties" && properties.length === 0 && (
              <p className="text-center py-4">No properties found</p>
            )}
            {activeTab === "reservations" && reservations.length === 0 && (
              <p className="text-center py-4">No reservations found</p>
            )}
            {activeTab === "swap" && swapOffers.length === 0 && (
              <p className="text-center py-4">No swap offers available</p>
            )}

            {/* Rest of your tab content */}
            {activeTab === "properties" && (
              <div>{/* Properties content */}</div>
            )}
            {activeTab === "reservations" && (
              <div>{/* Reservations content */}</div>
            )}
            {activeTab === "swap" && (
              <div>{/* Swap market content */}</div>
            )}
          </div>
        )}


        {activeTab === "properties" && (
          <div>
            <h2 className="text-2xl font-semibold mb-4">Properties</h2>
            <div className="mb-4 border p-4 rounded">
              <h3 className="text-lg font-medium mb-2">Create New Property</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <input
                  type="text"
                  value={newPropertyName}
                  onChange={(e) => setNewPropertyName(e.target.value)}
                  placeholder="Property Name"
                  className="border p-2"
                />
                <input
                  type="text"
                  value={newPropertyLocation}
                  onChange={(e) => setNewPropertyLocation(e.target.value)}
                  placeholder="Location"
                  className="border p-2"
                />
                <input
                  type="number"
                  value={newPropertyPrice}
                  onChange={(e) => setNewPropertyPrice(e.target.value)}
                  placeholder="Price per week (ETH)" 
                  className="border p-2"
                />
                <input
                  type="text"
                  value={newPropertyAmenities}
                  onChange={(e) => setNewPropertyAmenities(e.target.value)}
                  placeholder="Amenities (comma separated)"
                  className="border p-2"
                />
                <textarea
                  value={newPropertyDescription}
                  onChange={(e) => setNewPropertyDescription(e.target.value)}
                  placeholder="Description"
                  className="border p-2 md:col-span-2"
                  rows={3}
                />
              </div>
              <button
              onClick={handleCreateProperty}
              disabled={operationLoading.general || !newPropertyName || !newPropertyLocation || !newPropertyPrice}
              className="bg-green-500 text-white px-4 py-2 rounded mt-2 disabled:bg-gray-400"
            >
              {operationLoading.general ? "Creating..." : "Create Property"}
            </button>
            </div>
            {properties.map((prop) => {
              const mintYear = mintInputs[prop.id]?.year || "";
              const mintWeek = mintInputs[prop.id]?.week || "";
              const isOwner = prop.owner === account.toLowerCase();
              console.log("prop.owner", prop.owner.toString());
              console.log("account.toLowerCase()", prop.owner.toString());
              console.log("prop.id", prop.id.toString());

              return (
                <div key={prop.id} className="border p-4 mb-4 rounded">
                  <div className="flex flex-col md:flex-row gap-4">
                    <img
                      src={prop.imageUrl}
                      alt={prop.name}
                      className="w-full md:w-48 h-48 object-cover rounded"
                      onError={(e) => e.target.src = "/images/default-property.jpg"}
                    />
                    <div className="flex-1">
                      <h3 className="text-xl font-semibold">{prop.name} (ID: {prop.id})</h3>
                      <p className="text-gray-600">{prop.location}</p>
                      <p className="mt-2"><strong>Price:</strong> {prop.pricePerWeek} ETH/week</p>
                      <p><strong>Amenities:</strong> {prop.amenities}</p>
                      <p className="mt-2">{prop.description}</p>
                      <div className="mt-4 flex flex-wrap gap-2">
                        <span className={`px-2 py-1 rounded ${prop.verified ? "bg-green-100 text-green-800" : "bg-yellow-100 text-yellow-800"}`}>
                          {prop.verified ? "Verified" : "Unverified"}
                        </span>
                        <span className={`px-2 py-1 rounded ${prop.active ? "bg-blue-100 text-blue-800" : "bg-red-100 text-red-800"}`}>
                          {prop.active ? "Active" : "Inactive"}
                        </span>
                      </div>
                    </div>
                  </div>
                  {isOwner && (
        <div className="mt-4 flex flex-col md:flex-row gap-2">
          <input
            type="number"
            value={mintYear}
            onChange={(e) => setMintInputs((prev) => ({ 
              ...prev, 
              [prop.id]: { ...prev[prop.id], year: e.target.value } 
            }))}
            placeholder="Year (e.g., 2025)"
            className="border p-2 flex-1"
            min="2025"
          />
          <input
            type="number"
            value={mintWeek}
            onChange={(e) => setMintInputs((prev) => ({ 
              ...prev, 
              [prop.id]: { ...prev[prop.id], week: e.target.value } 
            }))}
            placeholder="Week (1-52)"
            className="border p-2 flex-1"
            min="1"
            max="52"
          />
          <button
            onClick={() => handleMintWeek(prop.id, mintYear, mintWeek)}
            disabled={loading || !mintYear || !mintWeek}
            className="bg-blue-500 text-white px-4 py-2 rounded disabled:bg-gray-400"
          >
            Mint Week
          </button>
        </div>
      )}
                </div>
              );
            })}
          </div>
        )}

        {activeTab === "reservations" && (
          <div>
            <h2 className="text-2xl font-semibold mb-4">My Reservations</h2>
            {reservations.length === 0 ? (
              <p className="text-center text-gray-500">You have no reservations.</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {reservations.map((res) => (
                  <div key={`${res.tokenId}-${res.day}`} className="border p-4 rounded">
                    <div className="flex gap-4">
                      <img
                        src={res.imageUrl}
                        alt={`Reservation ${res.tokenId} Day ${res.day}`}
                        className="w-24 h-24 object-cover rounded"
                        onError={(e) => e.target.src = "/images/default-property.jpg"}
                      />
                      <div>
                        <p><strong>Name:</strong> {res.name}</p>
                        <p><strong>Property ID:</strong> {res.propertyId}</p>
                        <p><strong>Token ID:</strong> {res.tokenId}</p>
                        <p><strong>Day:</strong> {res.day}</p>
                        <p><strong>Year:</strong> {res.year}</p>
                        <p><strong>Week:</strong> {res.week}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === "swap" && (
          <div>
            <h2 className="text-2xl font-semibold mb-4">Swap Market</h2>
            
            {/* All Available Slots Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
              {allSlots.map((slot) => (
                <div key={`${slot.tokenId}-${slot.day}`} className="border p-4 rounded-lg shadow-sm">
                  <div className="flex gap-4">
                    <img
                      src={slot.imageUrl}
                      alt={slot.propertyName}
                      className="w-20 h-20 object-cover rounded"
                      onError={(e) => e.target.src = "/images/default-property.jpg"}
                    />
                    <div className="flex-1">
                      <h3 className="font-semibold">{slot.propertyName}</h3>
                      <div className="text-sm text-gray-600">
                        <p>Token: #{slot.tokenId}</p>
                        <p>Day {slot.day} • Week {slot.week} • {slot.year}</p>
                        <p>Owner: {slot.owner === account.toLowerCase() ? 
                          <span className="text-green-600">You</span> : 
                          `${slot.owner.slice(0, 4)}...${slot.owner.slice(-4)}`}
                        </p>
                      </div>
                      
                      {slot.owner != account.toLowerCase() && (
                        <button
                          onClick={() => {
                            setSelectedTargetSlot(slot);
                            setShowOfferModal(true);
                          }}
                          className="mt-2 w-full bg-blue-100 text-blue-600 hover:bg-blue-200 px-3 py-1.5 rounded text-sm"
                        >
                          Create Offer
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Create Offer Modal */}
            {showOfferModal && (
              <div className="fixed inset-0 bg-black/50 flex items-center justify-center">
                <div className="bg-white p-6 rounded-lg max-w-2xl w-full">
                  <h3 className="text-lg font-semibold mb-4">
                    Create Offer for {selectedTargetSlot.tokenId} (Day {selectedTargetSlot.day})
                  </h3>

                  {/* ETH Incentive Input - Always Visible */}
                  <div className="mb-4">
                    <label className="block text-sm font-medium mb-1">
                      ETH Incentive/Price (required)
                    </label>
                    <input
                      type="number"
                      value={ethIncentive}
                      onChange={(e) => setEthIncentive(e.target.value)}
                      placeholder="0.00"
                      className="border p-2 w-full rounded"
                      min="0"
                      step="0.01"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Offer Type Selection */}
                    <div className="space-y-4">
                      <div className="mb-4">
                        <label className="block text-sm font-medium mb-1">
                          Offer Type
                        </label>
                        <select
                          value={offerType}
                          onChange={(e) => setOfferType(e.target.value)}
                          className="border p-2 w-full rounded"
                        >
                          <option value="SWAP">Swap</option>
                        </select>
                      </div>

                      {/* Target Slot Selection - Only for SWAP */}
                      {offerType === "SWAP" && (
                        <div className="max-h-96 overflow-y-auto">
                          <h4 className="font-medium mb-2">Requesting Slot (Optional)</h4>
                          <div className="grid grid-cols-1 gap-2">
                            {availableTargetSlots.map(slot => (
                              <div
                                key={`${slot.tokenId}-${slot.day}`}
                                onClick={() => setSelectedOfferedSlot(slot)}
                                className={`p-3 border rounded-lg cursor-pointer ${
                                  selectedOfferedSlot?.tokenId === slot.tokenId && 
                                  selectedOfferedSlot?.day === slot.day
                                    ? "border-blue-500 bg-blue-50"
                                    : "hover:border-gray-300"
                                }`}
                              >
                                <div className="flex items-center gap-3">
                                  <img
                                    src={slot.imageUrl}
                                    alt={slot.propertyName}
                                    className="w-12 h-12 object-cover rounded"
                                  />
                                  <div>
                                    <p className="font-medium">{slot.propertyName}</p>
                                    <p className="text-sm text-gray-600">
                                      Week {slot.week} • Year {slot.year} • Day {slot.day}
                                    </p>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Offer Details */}
                    <div className="space-y-4">
                      <div className="p-4 bg-gray-50 rounded-lg">
                        <h4 className="font-medium mb-2">Offer Details</h4>
                        
                        {offerType === "SWAP" && selectedOfferedSlot ? (
                          <div className="flex items-center gap-3 mb-4">
                            <div className="flex-1">
                              <p className="text-sm">Your Slot:</p>
                              <p className="font-medium">
                                {selectedTargetSlot.tokenId} (Day {selectedTargetSlot.day})
                              </p>
                            </div>
                            <span className="text-2xl">⇄</span>
                            <div className="flex-1">
                              <p className="text-sm">Requesting:</p>
                              <p className="font-medium">
                                {selectedOfferedSlot.tokenId} (Day {selectedOfferedSlot.day})
                              </p>
                            </div>
                          </div>
                        ) : offerType === "SALE" ? (
                          <p className="text-sm mb-4">
                            You're offering to sell this slot for {ethIncentive || "0.00"} ETH
                          </p>
                        ) : (
                          <p className="text-sm mb-4">
                            You're offering to buy this slot for {ethIncentive || "0.00"} ETH
                          </p>
                        )}

                        <div className="flex gap-2">
                          <button
                            onClick={() => {
                              handleCreateSwap(
                                selectedTargetSlot.tokenId,
                                selectedTargetSlot.day,
                                selectedOfferedSlot?.tokenId || 0,
                                selectedOfferedSlot?.day || 0,
                                ethIncentive
                              )
                            }}
                            className="flex-1 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
                            
                          >
                            {offerType === "SWAP" ? "Create Swap Offer" : 
                            offerType === "SALE" ? "List for Sale" : "Create Buy Offer"}
                          </button>
                          <button
                            onClick={() => {
                              setShowOfferModal(false);
                              setSelectedOfferedSlot(null);
                              setEthIncentive("");
                            }}
                            className="px-4 py-2 border rounded hover:bg-gray-100"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Active Offers Section */}
            <div className="mt-8">
              <h3 className="text-xl font-semibold mb-4">Active Offers</h3>
         
<div className="space-y-4">
  {swapOffers.map((offer) => (
    <div key={offer.offerId} className="border p-4 rounded-lg">
      <div className="flex justify-between items-start mb-2">
        <div>
          <p className="font-medium">Offer #{offer.offerId}</p>
          <p className="text-sm text-gray-600">
            {offer.offerType} • {offer.ethAmount} ETH
          </p>
        </div>
        <span className={`px-2 py-1 rounded text-sm ${
          offer.offerType === "SWAP" ? "bg-purple-100 text-purple-800" :
          offer.offerType === "SALE" ? "bg-green-100 text-green-800" :
          "bg-blue-100 text-blue-800"
        }`}>
          {offer.offerType}
        </span>
      </div>

      {/* Offer Details */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        {/* Offered Slot */}
        <div className="p-3 bg-gray-50 rounded">
          <p className="text-sm font-medium text-gray-600">Offering</p>
          <div className="flex items-center gap-2 mt-1">
            <img 
              src={offer.offered.imageUrl}
              alt={offer.offered.name}
              className="w-10 h-10 object-cover rounded"
            />
            <div>
              <p className="font-medium">{offer.offered.name}</p>
              <p className="text-sm">Token #{offer.offered.tokenId} (Day {offer.offered.day})</p>
            </div>
          </div>
        </div>

        {/* Target Slot */}
        <div className="p-3 bg-gray-50 rounded">
          <p className="text-sm font-medium text-gray-600">Requesting</p>
          {offer.target.tokenId ? (
            <div className="flex items-center gap-2 mt-1">
              <img 
                src={offer.target.imageUrl}
                alt={offer.target.name}
                className="w-10 h-10 object-cover rounded"
              />
              <div>
                <p className="font-medium">{offer.target.name}</p>
                <p className="text-sm">Token #{offer.target.tokenId} (Day {offer.target.day})</p>
              </div>
            </div>
          ) : (
            <p className="mt-1 text-gray-500">Any available slot</p>
          )}
        </div>
      </div>

      {/* Offer Actions */}
      <div className="flex gap-2 justify-end border-t pt-3">
        {/* Cancel Button - Only for offer creator */}
        {offer.offerer.toLowerCase() === account.toLowerCase() && (
          <button
            onClick={() => handleCancelSwap(offer.offerId)}
            className="px-3 py-1.5 text-sm bg-red-100 text-red-600 hover:bg-red-200 rounded"
          >
            Cancel Offer
          </button>
        )}

        {/* Accept Button - Only for target slot owner offer.isTargetOwnedByCurrentUser*/}
        { true && (
          <button
            onClick={() => handleAcceptSwap(offer.offerId)}
            className="px-3 py-1.5 text-sm bg-green-100 text-green-600 hover:bg-green-200 rounded"
          >
            Accept Swap
          </button>
        )}
      </div>
    </div>
  ))}
</div>
            </div>
          </div>
        )}

        {activeTab === "admin" && (
          <div>
            <h2 className="text-2xl font-semibold mb-4">Admin Panel</h2>
            <p className="mb-4">Manage property verification (Admin only)</p>
            {properties.length === 0 ? (
              <p className="text-center text-gray-500">No properties available to verify.</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {properties.map((prop) => (
                  <div key={prop.id} className="border p-4 rounded">
                    <h3 className="text-lg font-semibold">{prop.name} (ID: {prop.id})</h3>
                    <div className="flex justify-between items-center mt-2">
                      <div>
                        <p className={prop.verified ? "text-green-600" : "text-yellow-600"}>
                          {prop.verified ? "Verified" : "Unverified"}
                        </p>
                      </div>
                      {!prop.verified && (
                        <button
                          onClick={() => handleVerifyProperty(prop.id)}
                          disabled={loading}
                          className="bg-yellow-500 text-white px-4 py-2 rounded disabled:bg-gray-400"
                        >
                          Verify
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </main>
  );
}