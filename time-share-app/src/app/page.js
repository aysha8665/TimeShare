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
  
  // Property creation form state
  const [newPropertyName, setNewPropertyName] = useState("");
  const [newPropertyLocation, setNewPropertyLocation] = useState("");
  const [newPropertyPrice, setNewPropertyPrice] = useState("");
  const [newPropertyAmenities, setNewPropertyAmenities] = useState("");
  const [newPropertyDescription, setNewPropertyDescription] = useState("");
  
  // Minting state
  const [mintInputs, setMintInputs] = useState({});
  
  // Swap creation state
  const [selectedSlot, setSelectedSlot] = useState("");
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
      };
      fetchData();
    } else if (!account) {
      setProperties([]);
      setReservations([]);
      setSwapOffers([]);
    }
  }, [smartStayTokenReadOnly, reservationSwapReadOnly, vaultReadOnly, account]);

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
        console.log("fetchProperties::pricePerWeek", prop.pricePerWeek.toString());
        console.log("fetchProperties::parseUnits", ethers.formatUnits(prop.pricePerWeek.toString()));
        props.push({ 
          id: i, 
          name: prop.name,
          location: prop.location,
          pricePerWeek: (prop.pricePerWeek ?ethers.formatUnits(prop.pricePerWeek.toString(), 18): "0"),
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
          if (owner?.toLowerCase() === account.toLowerCase())  {
            const propertyId = await smartStayTokenReadOnly.tokenToPropertyId(tokenId);
            const year = await smartStayTokenReadOnly.tokenToYear(tokenId);
            const week = await smartStayTokenReadOnly.tokenToWeekNumber(tokenId);
            const property = properties.find((p) => p.id.toString() === propertyId.toString());
            const imageUrl = property ? property.imageUrl : "/images/default-property.jpg";
            ownedSlots.push({
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
    if (!reservationSwapReadOnly) return;
    setLoading(true);
    setErrorMessage("");
    try {
      const nextOfferId = await reservationSwapReadOnly.getNextOfferId();
      if (!nextOfferId || nextOfferId === 0n) {
        setSwapOffers([]);
        return;
      }
      const offers = [];
      for (let i = 1; i < nextOfferId; i++) {
        const offer = await reservationSwapReadOnly.offers(i);
        if (offer.isActive) {
          const propertyId = await smartStayTokenReadOnly.tokenToPropertyId(offer.tokenId);
          const property = properties.find((p) => p.id.toString() === propertyId.toString());
          const offeredPropertyName = property ? property.name : "Unknown";
          const targetProperty = offer.targetPropertyId === 0
            ? "Any"
            : properties.find((p) => p.id.toString() === offer.targetPropertyId.toString())?.name || "Unknown";
          
          offers.push({
            offerId: i,
            tokenId: offer.tokenId.toString(),
            day: offer.day.toString(),
            offerType: offer.offerType === 0 ? "SWAP" : offer.offerType === 1 ? "SALE" : "BUY",
            offeredPropertyName,
            targetProperty,
            targetYear: offer.targetYear === 0 ? "Any" : offer.targetYear.toString(),
            targetWeekNumber: offer.targetWeekNumber === 0 ? "Any" : offer.targetWeekNumber.toString(),
            targetDay: offer.targetDay.toString(),
            ethAmount: ethers.formatUnits(offer.ethAmount, "ether"),
            offerer: offer.offerer,
          });
        }
      }
      setSwapOffers(offers);
    } catch (err) {
      console.error("Error fetching swap offers:", err);
      setErrorMessage("Failed to fetch swap offers: " + err.message);
    }
    setLoading(false);
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
    console.log("handleCreateProperty::formatUnits", ethers.parseUnits(newPropertyPrice.toString(), 18));
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

  const handleCreateSwap = async (tokenId, day, targetPropertyId, targetYear, targetWeekNumber, targetDay, ethIncentiveWei) => {
    if (!reservationSwap) return;
    setLoading(true);
    setErrorMessage("");
    try {
      let tx;
      if (offerType === "SWAP") {
        tx = await reservationSwap.createOffer(
          0, // SWAP type
          tokenId,
          day,
          targetPropertyId,
          targetYear,
          targetWeekNumber,
          targetDay,
          ethIncentiveWei,
          { value: ethIncentiveWei }
        );
      } else if (offerType === "SALE") {
        tx = await reservationSwap.createOffer(
          1, // SALE type
          tokenId,
          day,
          0, 0, 0, 0,
          ethIncentiveWei
        );
      } else { // BUY
        tx = await reservationSwap.createOffer(
          2, // BUY type
          tokenId,
          day,
          0, 0, 0, 0,
          ethIncentiveWei,
          { value: ethIncentiveWei }
        );
      }
      
      await tx.wait();
      await fetchSwapOffers();
      setSelectedSlot("");
      setTargetPropertyId("");
      setTargetYear("");
      setTargetWeekNumber("");
      setTargetDay("");
      setEthIncentive("");
    } catch (err) {
      console.error("Error creating swap:", err);
      setErrorMessage(err.code === 4001 ? "Transaction rejected by user" : "Failed to create swap: " + err.message);
    }
    setLoading(false);
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

      if (offer.offerType === "SWAP") {
        const matchingSlot = reservations.find((slot) => {
          const propertyMatch = offer.targetProperty === "Any" || slot.propertyId === offer.targetPropertyId;
          const yearMatch = offer.targetYear === "Any" || slot.year === offer.targetYear;
          const weekMatch = offer.targetWeekNumber === "Any" || slot.week === offer.targetWeekNumber;
          const dayMatch = slot.day === offer.targetDay;
          return propertyMatch && yearMatch && weekMatch && dayMatch;
        });

        if (!matchingSlot) {
          setErrorMessage("No matching slot found");
          setLoading(false);
          return;
        }

        const tx = await reservationSwap.acceptSwapOffer(offerId, matchingSlot.tokenId, matchingSlot.day);
        await tx.wait();
      } else if (offer.offerType === "SALE") {
        const tx = await reservationSwap.acceptSaleOffer(offerId, { value: ethers.parseUnits(offer.ethAmount, "ether")});
        await tx.wait();
      } else { // BUY
        const tx = await reservationSwap.acceptBuyOffer(offerId);
        await tx.wait();
      }

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
                  <div className="mt-4 flex flex-col md:flex-row gap-2">
                    <input
                      type="number"
                      value={mintYear}
                      onChange={(e) => setMintInputs((prev) => ({ ...prev, [prop.id]: { ...prev[prop.id], year: e.target.value } }))}
                      placeholder="Year (e.g., 2025)"
                      className="border p-2 flex-1"
                      min="2025"
                    />
                    <input
                      type="number"
                      value={mintWeek}
                      onChange={(e) => setMintInputs((prev) => ({ ...prev, [prop.id]: { ...prev[prop.id], week: e.target.value } }))}
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
            
            <div className="mb-6 border p-4 rounded">
              <h3 className="text-xl font-medium mb-2">Create New Offer</h3>
              <div className="mb-4">
                <label className="block mb-1">Offer Type:</label>
                <select
                  value={offerType}
                  onChange={(e) => setOfferType(e.target.value)}
                  className="border p-2 w-full rounded"
                >
                  <option value="SWAP">Swap Offer</option>
                  <option value="SALE">Sell Slot</option>
                  <option value="BUY">Buy Slot</option>
                </select>
              </div>

              {offerType === "SWAP" && (
                <>
                  <div className="mb-4">
                    <label className="block mb-1">Select Slot to Offer:</label>
                    <select
                      value={selectedSlot}
                      onChange={(e) => setSelectedSlot(e.target.value)}
                      className="border p-2 w-full rounded"
                    >
                      <option value="">Select a slot</option>
                      {reservations.map((slot) => (
                        <option key={`${slot.tokenId}-${slot.day}`} value={`${slot.tokenId}-${slot.day}`}>
                          Token {slot.tokenId}, Day {slot.day}, Property {slot.propertyId}, Year {slot.year}, Week {slot.week}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div>
                      <label className="block mb-1">Target Property ID (0 for any):</label>
                      <input
                        type="number"
                        value={targetPropertyId}
                        onChange={(e) => setTargetPropertyId(e.target.value)}
                        min="0"
                        className="border p-2 w-full rounded"
                      />
                    </div>
                    <div>
                      <label className="block mb-1">Target Year (0 for any):</label>
                      <input
                        type="number"
                        value={targetYear}
                        onChange={(e) => setTargetYear(e.target.value)}
                        min="0"
                        className="border p-2 w-full rounded"
                      />
                    </div>
                    <div>
                      <label className="block mb-1">Target Week (0 for any):</label>
                      <input
                        type="number"
                        value={targetWeekNumber}
                        onChange={(e) => setTargetWeekNumber(e.target.value)}
                        min="0"
                        max="52"
                        className="border p-2 w-full rounded"
                      />
                    </div>
                    <div>
                      <label className="block mb-1">Target Day (0-6):</label>
                      <input
                        type="number"
                        value={targetDay}
                        onChange={(e) => setTargetDay(e.target.value)}
                        min="0"
                        max="6"
                        className="border p-2 w-full rounded"
                      />
                    </div>
                  </div>
                </>
              )}

              {offerType === "SALE" && (
                <div className="mb-4">
                  <label className="block mb-1">Select Slot to Sell:</label>
                  <select
                    value={selectedSlot}
                    onChange={(e) => setSelectedSlot(e.target.value)}
                    className="border p-2 w-full rounded"
                  >
                    <option value="">Select a slot</option>
                    {reservations.map((slot) => (
                      <option key={`${slot.tokenId}-${slot.day}`} value={`${slot.tokenId}-${slot.day}`}>
                        Token {slot.tokenId}, Day {slot.day}, Property {slot.propertyId}, Year {slot.year}, Week {slot.week}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {offerType === "BUY" && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block mb-1">Target Token ID:</label>
                    <input
                      type="number"
                      value={targetPropertyId}
                      onChange={(e) => setTargetPropertyId(e.target.value)}
                      min="1"
                      className="border p-2 w-full rounded"
                    />
                  </div>
                  <div>
                    <label className="block mb-1">Target Day (0-6):</label>
                    <input
                      type="number"
                      value={targetDay}
                      onChange={(e) => setTargetDay(e.target.value)}
                      min="0"
                      max="6"
                      className="border p-2 w-full rounded"
                    />
                  </div>
                </div>
              )}

              <div className="mb-4">
                <label className="block mb-1">ETH {offerType === "SALE" ? "Price" : "Incentive"}:</label>
                <input
                  type="number"
                  value={ethIncentive}
                  onChange={(e) => setEthIncentive(e.target.value)}
                  step="0.01"
                  min="0"
                  className="border p-2 w-full rounded"
                />
              </div>

              <button
                onClick={() => {
                  if (!selectedSlot && offerType !== "BUY") {
                    setErrorMessage("Please select a slot");
                    return;
                  }
                  const [tokenId, day] = selectedSlot.split("-");
                  const ethIncentiveWei = ethers.parseUnits(ethIncentive || "0", "ether");
                  handleCreateSwap(
                    tokenId || targetPropertyId,
                    day || targetDay,
                    targetPropertyId || "0",
                    targetYear || "0",
                    targetWeekNumber || "0",
                    targetDay,
                    ethIncentiveWei
                  );
                }}
                disabled={loading}
                className="bg-purple-500 text-white px-4 py-2 rounded w-full disabled:bg-gray-400"
              >
                Create {offerType === "SWAP" ? "Swap" : offerType === "SALE" ? "Sell" : "Buy"} Offer
              </button>
            </div>

            <div>
              <h3 className="text-xl font-medium mb-2">Active Offers</h3>
              {swapOffers.length === 0 ? (
                <p className="text-center text-gray-500">No active offers available.</p>
              ) : (
                <div className="grid grid-cols-1 gap-4">
                  {swapOffers.map((offer) => (
                    <div key={offer.offerId} className="border p-4 rounded">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-semibold">Offer #{offer.offerId} ({offer.offerType})</p>
                          <p className="text-sm text-gray-600">From: {offer.offerer.slice(0, 6)}...{offer.offerer.slice(-4)}</p>
                        </div>
                        <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-sm">
                          {offer.ethAmount} ETH
                        </span>
                      </div>

                      <div className="mt-2">
                        {offer.offerType === "SWAP" && (
                          <>
                            <p><strong>Offering:</strong> Token {offer.tokenId}, Day {offer.day} ({offer.offeredPropertyName})</p>
                            <p><strong>Wants:</strong> Property {offer.targetProperty}, Year {offer.targetYear}, Week {offer.targetWeekNumber}, Day {offer.targetDay}</p>
                          </>
                        )}
                        {offer.offerType === "SALE" && (
                          <p><strong>Selling:</strong> Token {offer.tokenId}, Day {offer.day} ({offer.offeredPropertyName})</p>
                        )}
                        {offer.offerType === "BUY" && (
                          <p><strong>Want to Buy:</strong> Token {offer.tokenId}, Day {offer.day}</p>
                        )}
                      </div>

                      <div className="mt-4 flex gap-2">
                        {offer.offerer.toLowerCase() === account.toLowerCase() ? (
                          <button
                            onClick={() => handleCancelSwap(offer.offerId)}
                            disabled={loading}
                            className="bg-red-500 text-white px-4 py-2 rounded flex-1 disabled:bg-gray-400"
                          >
                            Cancel Offer
                          </button>
                        ) : (
                          (offer.offerType === "SWAP" && hasMatchingSlot(offer)) || 
                          (offer.offerType === "SALE") || 
                          (offer.offerType === "BUY" && 
                            reservations.some(r => r.tokenId === offer.tokenId && r.day === offer.day))
                        ) && (
                          <button
                            onClick={() => handleAcceptSwap(offer.offerId)}
                            disabled={loading}
                            className="bg-green-500 text-white px-4 py-2 rounded flex-1 disabled:bg-gray-400"
                          >
                            {offer.offerType === "SWAP" ? "Accept Swap" : 
                             offer.offerType === "SALE" ? "Buy Slot" : "Sell Slot"}
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
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