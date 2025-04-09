"use client";
import { useState, useEffect } from "react";
import { ethers } from "ethers";
import useMetaMask from './hooks/useMetaMask';
import SmartStayToken from '../../../artifacts/contracts/SmartStayToken.sol/SmartStayToken.json';
import ReservationSwap from '../../../artifacts/contracts/ReservationSwap.sol/ReservationSwap.json';

const SMART_STAY_ADDRESS = "0xd893421aA2f04272cb8B2deAb6BBEa5Ad71FC6D7";
const RESERVATION_SWAP_ADDRESS = "0x6A51922a144366061D7D4812B8fe3fC38B7b5fcC";

export default function Home() {
  const [activeTab, setActiveTab] = useState("properties");
  const { provider, signer, account, connect, error, isConnecting } = useMetaMask();
  const [smartStayToken, setSmartStayToken] = useState(null);
  const [smartStayTokenReadOnly, setSmartStayTokenReadOnly] = useState(null); // For read-only calls
  const [reservationSwap, setReservationSwap] = useState(null);
  const [reservationSwapReadOnly, setReservationSwapReadOnly] = useState(null); // For read-only calls
  const [properties, setProperties] = useState([]);
  const [reservations, setReservations] = useState([]);
  const [swapOffers, setSwapOffers] = useState([]);
  const [newPropertyName, setNewPropertyName] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [mintInputs, setMintInputs] = useState({});
  const [allReservations, setAllReservations] = useState([]);

  // Initialize contracts
  useEffect(() => {
    if (provider) {
      // Read-only contracts (use provider)
      const smartStayReadOnly = new ethers.Contract(SMART_STAY_ADDRESS, SmartStayToken.abi, provider);
      const swapReadOnly = new ethers.Contract(RESERVATION_SWAP_ADDRESS, ReservationSwap.abi, provider);
      setSmartStayTokenReadOnly(smartStayReadOnly);
      setReservationSwapReadOnly(swapReadOnly);
    }
    if (signer) {
      // Write-enabled contracts (use signer)
      try {
        const smartStay = new ethers.Contract(SMART_STAY_ADDRESS, SmartStayToken.abi, signer);
        const swapContract = new ethers.Contract(RESERVATION_SWAP_ADDRESS, ReservationSwap.abi, signer);
        setSmartStayToken(smartStay);
        setReservationSwap(swapContract);
      } catch (err) {
        setErrorMessage("Failed to initialize contracts: " + err.message);
      }
    } else {
      setSmartStayToken(null);
      setReservationSwap(null);
    }
  }, [provider, signer]);

  // Fetch data when contracts and account are ready
  // Ensure fetchReservations is called after fetchProperties to have property data available
  useEffect(() => {
    if (smartStayTokenReadOnly && reservationSwapReadOnly && account) {
      const fetchData = async () => {
        await fetchProperties(); // Fetch properties first for image data
        await fetchReservations();
        await fetchSwapOffers();
        await fetchAllReservations();
      };
      fetchData();
    } else if (!account) {
      setProperties([]);
      setReservations([]);
      setSwapOffers([]);
      setAllReservations([]);
    }
  }, [smartStayTokenReadOnly, reservationSwapReadOnly, account]);

  const fetchAllReservations = async () => {
    if (!smartStayTokenReadOnly) return;
    setLoading(true);
    setErrorMessage("");
    try {
      const nextTokenId = await smartStayTokenReadOnly.getNextTokenId();
      if (!nextTokenId) throw new Error("getNextTokenId returned invalid data");
      const reservations = [];
      for (let i = 1; i < nextTokenId; i++) {
        try {
          const owner = await smartStayTokenReadOnly.ownerOf(i);
          const propertyId = await smartStayTokenReadOnly.tokenToPropertyId(i);
          const year = await smartStayTokenReadOnly.tokenToYear(i);
          const week = await smartStayTokenReadOnly.tokenToWeekNumber(i);
          const property = properties.find((p) => p.id.toString() === propertyId.toString());
          const propertyImageUrl = property ? property.imageUrl : "/images/default-property.jpg";
          //const nftImageUrl = `/images/token${i}.jpg`; // Unique NFT image per tokenId
          const nftImageUrl = `/images/token.jpg`; // Unique NFT image per tokenId
          reservations.push({
            tokenId: i.toString(),
            propertyId: propertyId.toString(),
            year: year.toString(),
            week: week.toString(),
            owner,
            propertyImageUrl, // Property image
            nftImageUrl,     // NFT-specific image
          });
        } catch (err) {
          console.log(`Token ${i} does not exist or is invalid`);
        }
      }
      setAllReservations(reservations);
    } catch (err) {
      console.error("Error fetching all reservations:", err);
      setErrorMessage("Failed to fetch all reservations: " + err.message);
    }
    setLoading(false);
  };

  const fetchProperties = async () => {
    if (!smartStayTokenReadOnly) return;
    setLoading(true);
    setErrorMessage("");
    console.log("Fetching properties...");
    const timeout = setTimeout(() => {
      setLoading(false);
      setErrorMessage("Property fetch timed out");
    }, 10000);
    try {
      console.log("Calling getNextPropertyId...");
      const nextId = await smartStayTokenReadOnly.getNextPropertyId();
      console.log("Next ID received:", nextId.toString());
      if (!nextId) throw new Error("getNextPropertyId returned invalid data");
      const props = [];
      for (let i = 1; i < nextId; i++) {
        console.log(`Fetching property ${i}...`);
        const prop = await smartStayTokenReadOnly.properties(i);
        // Add an image URL based on property ID (adjust path/naming as needed)
        //const imageUrl = `/images/property${i}.jpg`; // Assumes images are named like property1.jpg, property2.jpg, etc.
        const imageUrl = `/images/property${i}.jpg`; // Assumes images are named like property1.jpg, property2.jpg, etc.
        props.push({ id: i, name: prop.name, verified: prop.verified, active: prop.active, imageUrl });
      }
      setProperties(props);
      console.log("Properties fetched:", props);
    } catch (err) {
      console.error("Error fetching properties:", err);
      setErrorMessage("Failed to fetch properties: " + err.message);
    }
    clearTimeout(timeout);
    setLoading(false);
    console.log("Fetch properties complete");
  };

  const fetchReservations = async () => {
    if (!smartStayTokenReadOnly || !account) return;
    setLoading(true);
    setErrorMessage("");
    try {
      const balance = await smartStayTokenReadOnly.balanceOf(account);
      if (balance === undefined) throw new Error("balanceOf returned invalid data");
      const res = [];
      for (let i = 0; i < balance; i++) {
        const tokenId = await smartStayTokenReadOnly.tokenOfOwnerByIndex(account, i);
        const propertyId = await smartStayTokenReadOnly.tokenToPropertyId(tokenId);
        const year = await smartStayTokenReadOnly.tokenToYear(tokenId);
        const week = await smartStayTokenReadOnly.tokenToWeekNumber(tokenId);
        // Find the property to get its image
        const property = properties.find((p) => p.id.toString() === propertyId.toString());
        const imageUrl = property ? property.imageUrl : "/images/default-property.jpg";
        res.push({
          tokenId: tokenId.toString(),
          propertyId: propertyId.toString(),
          year: year.toString(),
          week: week.toString(),
          imageUrl, // Add image URL to reservation
        });
      }
      setReservations(res);
    } catch (err) {
      console.error("Error fetching reservations:", err);
      setErrorMessage("Failed to fetch reservations: " + err.message);
    }
    setLoading(false);
  };

  const fetchSwapOffers = async () => {
    // Step 1: Verify reservationSwapReadOnly
    console.log("Step 1: Checking reservationSwapReadOnly:", reservationSwapReadOnly);
    if (!reservationSwapReadOnly) {
      console.log("Step 1: reservationSwapReadOnly is null or undefined, exiting.");
      return;
    }
  
    setLoading(true);
    setErrorMessage("");
  
    try {
      // Step 2: Fetch and log offerCount
      const offerCount = await reservationSwapReadOnly.getNextSwapOfferId();
      console.log("Step 2: offerCount:", offerCount.toString());
      if (!offerCount) {
        console.log("Step 2: offerCount is invalid (0 or undefined), throwing error.");
        throw new Error("getNextSwapOfferId returned invalid data");
      }
  
      const offers = [];
      // Step 3: Loop through offers and log each one
      console.log("Step 3: Starting loop with offerCount:", offerCount.toString());
      for (let i = 1; i < offerCount; i++) {
        console.log("Step 3: Fetching swapOffers for ID:", i);
        const offer = await reservationSwapReadOnly.swapOffers(i);
        console.log("Step 3: Offer at ID", i, ":", offer);
  
        // Step 4: Check if offer is active
        if (offer.isActive) {
          console.log("Step 4: Offer", i, "is active:", offer);
          const property = properties.find((p) => p.id.toString() === offer.targetPropertyId.toString());
          const targetPropertyImageUrl = property ? property.imageUrl : "/images/default-property.jpg";
          const nftImageUrl = `/images/token.jpg`; // Static for now
  
          offers.push({
            offerId: i,
            tokenId: offer.tokenId.toString(),
            targetPropertyId: offer.targetPropertyId.toString(),
            targetYear: offer.targetYear.toString(),
            targetWeekNumber: offer.targetWeekNumber.toString(),
            ethPrice: ethers.formatEther(offer.ethPrice),
            offerer: offer.offerer,
            targetPropertyImageUrl,
            nftImageUrl,
          });
          console.log("Step 4: Added offer", i, "to offers array:", offers[offers.length - 1]);
        } else {
          console.log("Step 4: Offer", i, "is not active, skipping.");
        }
      }
  
      // Step 5: Log final offers array and update state
      console.log("Step 5: Final offers array:", offers);
      setSwapOffers(offers);
      console.log("Step 5: setSwapOffers called with:", offers);
  
    } catch (err) {
      // Step 6: Log any errors
      console.error("Step 6: Error fetching swap offers:", err);
      setErrorMessage("Failed to fetch swap offers: " + err.message);
    }
  
    setLoading(false);
    console.log("Step 6: Loading set to false, function complete.");
  };

  const handleCreateProperty = async () => {
    if (!smartStayToken) return;
    setLoading(true);
    setErrorMessage("");
    console.log("Starting createProperty with name:", newPropertyName);
    try {
      const tx = await smartStayToken.createProperty(newPropertyName);
      console.log("Transaction sent:", tx.hash);
      await tx.wait();
      console.log("Transaction confirmed");
      setNewPropertyName("");
      await fetchProperties();
    } catch (err) {
      console.error("Error creating property:", err);
      if (err.code === 4001) {
        setErrorMessage("Transaction rejected by user");
      } else {
        setErrorMessage("Failed to create property: " + err.message);
      }
    }
    setLoading(false);
  };

  const handleMintWeek = async (propertyId, year, week) => {
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
      const tx = await smartStayToken.mintWeek(propertyId, yearNum, weekNum);
      await tx.wait();
      await fetchReservations();
      setMintInputs(prev => ({
        ...prev,
        [propertyId]: { year: "", week: "" }
      }));
    } catch (err) {
      console.error("Error minting week:", err);
      if (err.code === 4001) {
        setErrorMessage("Transaction rejected by user");
      } else {
        setErrorMessage("Failed to mint week: " + err.message);
      }
    }
    setLoading(false);
  };


  const handleCreateSwap = async (tokenId, targetPropertyId, targetYear, targetWeek, ethPrice, nftContract, nftId) => {
    console.log("Step 1: Starting handleCreateSwap with params:", { tokenId, targetPropertyId, targetYear, targetWeek, ethPrice, nftContract, nftId });
    if (!reservationSwap || !signer) {
      console.log("Step 1: reservationSwap or signer missing, exiting.");
      return;
    }
  
    setLoading(true);
    setErrorMessage("");
  
    try {
      // Step 2: Approve SmartStayToken NFT for ReservationSwap contract
      const smartStay = new ethers.Contract(SMART_STAY_ADDRESS, SmartStayToken.abi, signer);
      const approvedAddress = await smartStay.getApproved(tokenId);
      const swapContractAddress = RESERVATION_SWAP_ADDRESS;
  
      if (approvedAddress.toLowerCase() !== swapContractAddress.toLowerCase()) {
        console.log("Step 2: Approving SmartStayToken NFT", tokenId, "for swap contract");
        const approveTx = await smartStay.approve(swapContractAddress, tokenId);
        console.log("Step 2: Approval TX sent:", approveTx.hash);
        await approveTx.wait();
        console.log("Step 2: SmartStayToken NFT approved");
      }
  
      // Step 3: Approve optional NFT if provided
      if (nftContract && nftContract !== ethers.ZeroAddress && nftId) {
        console.log("Step 3: Approving NFT with contract:", nftContract, "and ID:", nftId);
        const nft = new ethers.Contract(nftContract, ["function approve(address to, uint256 tokenId) external", "function getApproved(uint256 tokenId) view returns (address)"], signer);
        const approvedAddress = await nft.getApproved(nftId);
        if (approvedAddress.toLowerCase() !== swapContractAddress.toLowerCase()) {
          const approveTx = await nft.approve(swapContractAddress, nftId);
          console.log("Step 3: Approval TX sent:", approveTx.hash);
          await approveTx.wait();
          console.log(`Step 3: NFT ${nftId} approved for swap contract`);
        }
      }
  
      // Step 4: Create the swap offer
      const ethPriceWei = ethers.parseEther(ethPrice.toString());
      console.log("Step 4: Creating swap offer with ETH price (wei):", ethPriceWei.toString());
      const tx = await reservationSwap.createSwapOffer(
        tokenId,
        targetPropertyId,
        targetYear,
        targetWeek,
        ethPriceWei,
        nftContract || ethers.ZeroAddress,
        nftId || 0,
        { value: ethPriceWei }
      );
      console.log("Step 4: Transaction sent:", tx.hash);
      await tx.wait();
      console.log("Step 4: Transaction confirmed");
  
      // Step 5: Refresh swap offers
      await fetchSwapOffers();
    } catch (err) {
      console.error("Error creating swap:", err);
      if (err.code === 4001) {
        setErrorMessage("Transaction rejected by user");
      } else {
        setErrorMessage("Failed to create swap: " + (err.reason || err.message));
      }
    }
    setLoading(false);
  };

  const handleAcceptSwap = async (offerId, counterTokenId) => {
    if (!reservationSwap) return;
    setLoading(true);
    setErrorMessage("");
  
    try {
      // Step 1: Approve counterTokenId for ReservationSwap contract
      const smartStay = new ethers.Contract(SMART_STAY_ADDRESS, SmartStayToken.abi, signer);
      const approvedAddress = await smartStay.getApproved(counterTokenId);
      const swapContractAddress = RESERVATION_SWAP_ADDRESS;
  
      if (approvedAddress.toLowerCase() !== swapContractAddress.toLowerCase()) {
        console.log("Step 1: Approving SmartStayToken NFT", counterTokenId, "for swap contract");
        const approveTx = await smartStay.approve(swapContractAddress, counterTokenId);
        console.log("Step 1: Approval TX sent:", approveTx.hash);
        await approveTx.wait();
        console.log("Step 1: SmartStayToken NFT approved");
      }
  
      // Step 2: Accept the swap offer
      const tx = await reservationSwap.acceptSwapOffer(offerId, counterTokenId);
      await tx.wait();
      await fetchSwapOffers();
      await fetchReservations();
    } catch (err) {
      console.error("Error accepting swap:", err);
      if (err.code === 4001) {
        setErrorMessage("Transaction rejected by user");
      } else {
        setErrorMessage("Failed to accept swap: " + err.message);
      }
    }
    setLoading(false);
  };

  const handleCancelSwap = async (offerId) => {
    if (!reservationSwap) return;
    setLoading(true);
    setErrorMessage("");
    try {
      const tx = await reservationSwap.cancelSwapOffer(offerId);
      await tx.wait();
      await fetchSwapOffers();
    } catch (err) {
      console.error("Error canceling swap:", err);
      if (err.code === 4001) {
        setErrorMessage("Transaction rejected by user");
      } else {
        setErrorMessage("Failed to cancel swap: " + err.message);
      }
    }
    setLoading(false);
  };
  
  const handleRejectSwap = async (offerId) => {
    if (!reservationSwap) return;
    setLoading(true);
    setErrorMessage("");
    try {
      const tx = await reservationSwap.rejectSwapOffer(offerId);
      await tx.wait();
      await fetchSwapOffers();
    } catch (err) {
      console.error("Error rejecting swap:", err);
      if (err.code === 4001) {
        setErrorMessage("Transaction rejected by user");
      } else {
        setErrorMessage("Failed to reject swap: " + err.message);
      }
    }
    setLoading(false);
  };

  const handleVerifyProperty = async (propertyId) => {
    if (!smartStayToken) return;
    setLoading(true);
    setErrorMessage("");
    try {
      const tx = await smartStayToken.verifyProperty(propertyId);
      console.log("Transaction sent:", tx.hash);
      await tx.wait();
      console.log("Transaction confirmed");
      await fetchProperties();
    } catch (err) {
      console.error("Error verifying property:", err);
      if (err.code === 4001) {
        setErrorMessage("Transaction rejected by user");
      } else if (err.message.includes("AccessControl")) {
        setErrorMessage("Only admins can verify properties");
      } else {
        setErrorMessage("Failed to verify property: " + err.message);
      }
    }
    setLoading(false);
  };

  const disconnect = () => {
    setAccount(null);
    setSmartStayToken(null);
    setReservationSwap(null);
    setProperties([]);
    setReservations([]);
    setSwapOffers([]);
    setAllReservations([]);
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
              onClick={() => {
                window.ethereum.request({ method: "wallet_requestPermissions", params: [{ eth_accounts: {} }] })
                  .catch((err) => {
                    if (err.code === 4001) {
                      setErrorMessage("User rejected account switch");
                    } else {
                      setErrorMessage("Error switching account: " + err.message);
                    }
                  });
              }}
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
          <button
            className={`px-4 py-2 ${activeTab === "properties" ? "bg-blue-500 text-white" : "bg-gray-200"}`}
            onClick={() => setActiveTab("properties")}
          >
            Properties
          </button>
          <button
            className={`px-4 py-2 ${activeTab === "reservations" ? "bg-blue-500 text-white" : "bg-gray-200"}`}
            onClick={() => setActiveTab("reservations")}
          >
            My Reservations
          </button>
          <button
            className={`px-4 py-2 ${activeTab === "swap" ? "bg-blue-500 text-white" : "bg-gray-200"}`}
            onClick={() => setActiveTab("swap")}
          >
            Swap Market
          </button>
          <button
            className={`px-4 py-2 ${activeTab === "admin" ? "bg-blue-500 text-white" : "bg-gray-200"}`}
            onClick={() => setActiveTab("admin")}
          >
            Admin
          </button>
        </div>

        {loading && <p className="text-center">Loading...</p>}

        {activeTab === "properties" && (
          <div>
            <h2 className="text-2xl font-semibold mb-4">Properties</h2>
            <div className="mb-4">
              <input
                type="text"
                value={newPropertyName}
                onChange={(e) => setNewPropertyName(e.target.value)}
                placeholder="New Property Name"
                className="border p-2 mr-2"
              />
              <button
                onClick={handleCreateProperty}
                disabled={loading}
                className="bg-green-500 text-white px-4 py-2 rounded"
              >
                Create Property
              </button>
            </div>
            {properties.map((prop) => {
              const mintYear = mintInputs[prop.id]?.year || "";
              const mintWeek = mintInputs[prop.id]?.week || "";
              
              return (
                <div key={prop.id} className="border p-4 mb-2 flex items-start">
                  {/* Add image display */}
                  <img
                    src={prop.imageUrl}
                    alt={prop.name}
                    className="w-24 h-24 object-cover mr-4 rounded"
                    onError={(e) => {
                      e.target.src = "/images/default-property.jpg"; // Fallback image if the specific one doesn't exist
                    }}
                  />
                  <div className="flex-1">
                    <p className="font-semibold">{prop.name} (ID: {prop.id})</p>
                    <p>Verified: {prop.verified.toString()}</p>
                    <div className="mt-2 flex gap-2">
                      <input
                        type="number"
                        value={mintYear}
                        onChange={(e) =>
                          setMintInputs((prev) => ({
                            ...prev,
                            [prop.id]: { ...prev[prop.id], year: e.target.value },
                          }))
                        }
                        placeholder="Year (e.g., 2025)"
                        className="border p-2 w-32"
                        min="2025"
                      />
                      <input
                        type="number"
                        value={mintWeek}
                        onChange={(e) =>
                          setMintInputs((prev) => ({
                            ...prev,
                            [prop.id]: { ...prev[prop.id], week: e.target.value },
                          }))
                        }
                        placeholder="Week (1-52)"
                        className="border p-2 w-24"
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
                </div>
              );
            })}
          </div>
        )}

{activeTab === "reservations" && (
          <div>
            <h2 className="text-2xl font-semibold mb-4">My Reservations</h2>
            {reservations.length === 0 ? (
              <p>You have no reservations.</p>
            ) : (
              reservations.map((res) => (
                <div key={res.tokenId} className="border p-4 mb-2 flex items-start">
                  {/* Add image display */}
                  <img
                    src={res.imageUrl}
                    alt={`Reservation ${res.tokenId}`}
                    className="w-24 h-24 object-cover mr-4 rounded"
                    onError={(e) => {
                      e.target.src = "/images/default-property.jpg"; // Fallback image
                    }}
                  />
                  <div className="flex-1">
                    <p><strong>Token ID:</strong> {res.tokenId}</p>
                    <p><strong>Property ID:</strong> {res.propertyId}</p>
                    <p><strong>Year:</strong> {res.year}</p>
                    <p><strong>Week:</strong> {res.week}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

{activeTab === "swap" && (
  <div>
    <h2 className="text-2xl font-semibold mb-4">Swap Market</h2>

    {/* All Available NFTs */}
    <div className="mb-6">
      <h3 className="text-xl font-medium mb-2">All Available NFTs</h3>
      {allReservations.length === 0 ? (
        <p>No reservations available in the market.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {allReservations.map((nft) => (
            <div key={nft.tokenId} className="border p-4 rounded-lg">
              <div className="flex items-start mb-2">
                <img
                  src={nft.nftImageUrl}
                  alt={`NFT ${nft.tokenId}`}
                  className="w-16 преимущества h-16 object-cover mr-2 rounded"
                  onError={(e) => (e.target.src = "/images/default-nft.jpg")}
                />
                <img
                  src={nft.propertyImageUrl}
                  alt={`Property ${nft.propertyId}`}
                  className="w-16 h-16 object-cover mr-2 rounded"
                  onError={(e) => (e.target.src = "/images/default-property.jpg")}
                />
              </div>
              <p><strong>Token ID:</strong> {nft.tokenId}</p>
              <p><strong>Property ID:</strong> {nft.propertyId}</p>
              <p><strong>Year:</strong> {nft.year}</p>
              <p><strong>Week:</strong> {nft.week}</p>
              <p><strong>Owner:</strong> {nft.owner.slice(0, 6)}...{nft.owner.slice(-4)}</p>
              {nft.owner.toLowerCase() === account.toLowerCase() ? (
                <p className="text-gray-500 mt-2">You own this NFT</p>
              ) : (
                <div className="mt-2 flex flex-col gap-2">
                  <input
                    type="number"
                    placeholder="ETH Price (optional)"
                    step="0.01"
                    className="border p-2 w-full"
                    min="0"
                    data-token-id={nft.tokenId}
                  />
                  <input
                    type="text"
                    placeholder="NFT Contract (optional)"
                    className="border p-2 w-full"
                    data-token-id={nft.tokenId}
                  />
                  <input
                    type="number"
                    placeholder="NFT ID (optional)"
                    className="border p-2 w-full"
                    min="0"
                    data-token-id={nft.tokenId}
                  />
                  <button
                    onClick={(e) => {
                      const ethPriceInput = e.target.previousSibling.previousSibling.previousSibling.value || "0";
                      const nftContractInput = e.target.previousSibling.previousSibling.value || ethers.ZeroAddress;
                      const nftIdInput = e.target.previousSibling.value || "0";
                      const ownedNft = reservations[0];
                      if (!ownedNft) {
                        setErrorMessage("You need to own an NFT to create a swap offer");
                        return;
                      }
                      handleCreateSwap(
                        ownedNft.tokenId,
                        nft.propertyId,
                        nft.year,
                        nft.week,
                        ethPriceInput,
                        nftContractInput,
                        nftIdInput
                      );
                    }}
                    disabled={loading || reservations.length === 0}
                    className="bg-purple-500 text-white px-4 py-2 rounded disabled:bg-gray-400"
                  >
                    Create Swap Offer
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>

    {/* Existing Swap Offers */}
    <div>
      <h3 className="text-xl font-medium mb-2">Active Swap Offers</h3>
      {swapOffers.length === 0 ? (
        <p>No active swap offers available.</p>
      ) : (
        swapOffers.map((offer) => {
          // Check if the user has a matching reservation for Accept/Reject
          const matchingReservation = reservations.find(
            (res) =>
              (offer.targetPropertyId === "0" || res.propertyId === offer.targetPropertyId) &&
              (offer.targetYear === "0" || res.year === offer.targetYear) &&
              (offer.targetWeekNumber === "0" || res.week === offer.targetWeekNumber)
          );

          return (
            <div key={offer.offerId} className="border p-4 mb-2">
              <div className="flex items-start mb-2">
                <img
                  src={offer.nftImageUrl}
                  alt={`NFT ${offer.tokenId}`}
                  className="w-16 h-16 object-cover mr-2 rounded"
                  onError={(e) => (e.target.src = "/images/default-nft.jpg")}
                />
                <img
                  src={offer.targetPropertyImageUrl}
                  alt={`Target Property ${offer.targetPropertyId}`}
                  className="w-16 h-16 object-cover mr-2 rounded"
                  onError={(e) => (e.target.src = "/images/default-property.jpg")}
                />
              </div>
              <p><strong>Offer ID:</strong> {offer.offerId}</p>
              <p><strong>Token ID:</strong> {offer.tokenId}</p>
              <p><strong>Target Property ID:</strong> {offer.targetPropertyId || "Any"}</p>
              <p><strong>Target Year:</strong> {offer.targetYear || "Any"}</p>
              <p><strong>Target Week:</strong> {offer.targetWeekNumber || "Any"}</p>
              <p><strong>ETH Price:</strong> {offer.ethPrice} ETH</p>
              <p><strong>Offerer:</strong> {offer.offerer.slice(0, 6)}...{offer.offerer.slice(-4)}</p>

              {/* Conditional Button Rendering */}
              {offer.offerer.toLowerCase() === account.toLowerCase() ? (
                <button
                  onClick={() => handleCancelSwap(offer.offerId)}
                  disabled={loading}
                  className="bg-red-500 text-white px-4 py-2 mt-2 rounded disabled:bg-gray-400"
                >
                  Cancel Offer
                </button>
              ) : (
                matchingReservation && (
                  <div className="mt-2 flex gap-2">
                    <button
                      onClick={() => handleAcceptSwap(offer.offerId, matchingReservation.tokenId)}
                      disabled={loading}
                      className="bg-green-500 text-white px-4 py-2 rounded disabled:bg-gray-400"
                    >
                      Accept Swap
                    </button>
                    <button
                      onClick={() => handleRejectSwap(offer.offerId)}
                      disabled={loading}
                      className="bg-orange-500 text-white px-4 py-2 rounded disabled:bg-gray-400"
                    >
                      Reject Offer
                    </button>
                  </div>
                )
              )}
            </div>
          );
        })
      )}
    </div>
  </div>
)}

        {activeTab === "admin" && (
          <div>
            <h2 className="text-2xl font-semibold mb-4">Admin Panel</h2>
            <p className="mb-4">Manage property verification (Admin only)</p>
            {properties.length === 0 ? (
              <p>No properties available to verify.</p>
            ) : (
              properties.map((prop) => (
                <div key={prop.id} className="border p-4 mb-2 flex justify-between items-center">
                  <div>
                    <p>{prop.name} (ID: {prop.id})</p>
                    <p>Verified: {prop.verified.toString()}</p>
                    <p>Active: {prop.active.toString()}</p>
                  </div>
                  {!prop.verified && (
                    <button
                      onClick={() => handleVerifyProperty(prop.id)}
                      disabled={loading}
                      className="bg-yellow-500 text-white px-4 py-2 rounded disabled:bg-gray-400"
                    >
                      Verify Property
                    </button>
                  )}
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </main>
  );
}