"use client";
import { useState } from 'react';
import { Contract, parseEther } from 'ethers';
import useMetaMask from '../hooks/useMetaMask'; // Adjusted import path

const contractAddress = "0x70e0bA845a1A0F2DA3359C97E0285013525FFC49";

const contractABI = [
  {
    "inputs": [],
    "stateMutability": "nonpayable",
    "type": "constructor"
  },
  {
    "inputs": [],
    "name": "AccessControlBadConfirmation",
    "type": "error"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "account",
        "type": "address"
      },
      {
        "internalType": "bytes32",
        "name": "neededRole",
        "type": "bytes32"
      }
    ],
    "name": "AccessControlUnauthorizedAccount",
    "type": "error"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "sender",
        "type": "address"
      },
      {
        "internalType": "uint256",
        "name": "balance",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "needed",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "tokenId",
        "type": "uint256"
      }
    ],
    "name": "ERC1155InsufficientBalance",
    "type": "error"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "approver",
        "type": "address"
      }
    ],
    "name": "ERC1155InvalidApprover",
    "type": "error"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "idsLength",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "valuesLength",
        "type": "uint256"
      }
    ],
    "name": "ERC1155InvalidArrayLength",
    "type": "error"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "operator",
        "type": "address"
      }
    ],
    "name": "ERC1155InvalidOperator",
    "type": "error"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "receiver",
        "type": "address"
      }
    ],
    "name": "ERC1155InvalidReceiver",
    "type": "error"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "sender",
        "type": "address"
      }
    ],
    "name": "ERC1155InvalidSender",
    "type": "error"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "operator",
        "type": "address"
      },
      {
        "internalType": "address",
        "name": "owner",
        "type": "address"
      }
    ],
    "name": "ERC1155MissingApprovalForAll",
    "type": "error"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "address",
        "name": "account",
        "type": "address"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "operator",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "bool",
        "name": "approved",
        "type": "bool"
      }
    ],
    "name": "ApprovalForAll",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "uint256",
        "name": "propertyId",
        "type": "uint256"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "from",
        "type": "address"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "to",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "amount",
        "type": "uint256"
      }
    ],
    "name": "OwnershipTransferred",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "uint256",
        "name": "propertyId",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "string",
        "name": "name",
        "type": "string"
      },
      {
        "indexed": false,
        "internalType": "string",
        "name": "location",
        "type": "string"
      }
    ],
    "name": "PropertyCreated",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "uint256",
        "name": "propertyId",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "string",
        "name": "name",
        "type": "string"
      },
      {
        "indexed": false,
        "internalType": "string",
        "name": "location",
        "type": "string"
      }
    ],
    "name": "PropertyUpdated",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "bytes32",
        "name": "role",
        "type": "bytes32"
      },
      {
        "indexed": true,
        "internalType": "bytes32",
        "name": "previousAdminRole",
        "type": "bytes32"
      },
      {
        "indexed": true,
        "internalType": "bytes32",
        "name": "newAdminRole",
        "type": "bytes32"
      }
    ],
    "name": "RoleAdminChanged",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "bytes32",
        "name": "role",
        "type": "bytes32"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "account",
        "type": "address"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "sender",
        "type": "address"
      }
    ],
    "name": "RoleGranted",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "bytes32",
        "name": "role",
        "type": "bytes32"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "account",
        "type": "address"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "sender",
        "type": "address"
      }
    ],
    "name": "RoleRevoked",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "address",
        "name": "operator",
        "type": "address"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "from",
        "type": "address"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "to",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "uint256[]",
        "name": "ids",
        "type": "uint256[]"
      },
      {
        "indexed": false,
        "internalType": "uint256[]",
        "name": "values",
        "type": "uint256[]"
      }
    ],
    "name": "TransferBatch",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "address",
        "name": "operator",
        "type": "address"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "from",
        "type": "address"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "to",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "id",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "value",
        "type": "uint256"
      }
    ],
    "name": "TransferSingle",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": false,
        "internalType": "string",
        "name": "value",
        "type": "string"
      },
      {
        "indexed": true,
        "internalType": "uint256",
        "name": "id",
        "type": "uint256"
      }
    ],
    "name": "URI",
    "type": "event"
  },
  {
    "inputs": [],
    "name": "ADMIN_ROLE",
    "outputs": [
      {
        "internalType": "bytes32",
        "name": "",
        "type": "bytes32"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "DEFAULT_ADMIN_ROLE",
    "outputs": [
      {
        "internalType": "bytes32",
        "name": "",
        "type": "bytes32"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "PROPERTY_MANAGER_ROLE",
    "outputs": [
      {
        "internalType": "bytes32",
        "name": "",
        "type": "bytes32"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "account",
        "type": "address"
      },
      {
        "internalType": "uint256",
        "name": "id",
        "type": "uint256"
      }
    ],
    "name": "balanceOf",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address[]",
        "name": "accounts",
        "type": "address[]"
      },
      {
        "internalType": "uint256[]",
        "name": "ids",
        "type": "uint256[]"
      }
    ],
    "name": "balanceOfBatch",
    "outputs": [
      {
        "internalType": "uint256[]",
        "name": "",
        "type": "uint256[]"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "string",
        "name": "name",
        "type": "string"
      },
      {
        "internalType": "string",
        "name": "location",
        "type": "string"
      },
      {
        "internalType": "string",
        "name": "description",
        "type": "string"
      },
      {
        "internalType": "string",
        "name": "amenities",
        "type": "string"
      },
      {
        "internalType": "uint256",
        "name": "totalUnits",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "maintenanceFee",
        "type": "uint256"
      }
    ],
    "name": "createProperty",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "propertyId",
        "type": "uint256"
      }
    ],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "bytes32",
        "name": "role",
        "type": "bytes32"
      }
    ],
    "name": "getRoleAdmin",
    "outputs": [
      {
        "internalType": "bytes32",
        "name": "",
        "type": "bytes32"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "bytes32",
        "name": "role",
        "type": "bytes32"
      },
      {
        "internalType": "address",
        "name": "account",
        "type": "address"
      }
    ],
    "name": "grantRole",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "bytes32",
        "name": "role",
        "type": "bytes32"
      },
      {
        "internalType": "address",
        "name": "account",
        "type": "address"
      }
    ],
    "name": "hasRole",
    "outputs": [
      {
        "internalType": "bool",
        "name": "",
        "type": "bool"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "account",
        "type": "address"
      },
      {
        "internalType": "address",
        "name": "operator",
        "type": "address"
      }
    ],
    "name": "isApprovedForAll",
    "outputs": [
      {
        "internalType": "bool",
        "name": "",
        "type": "bool"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "propertyId",
        "type": "uint256"
      },
      {
        "internalType": "address[]",
        "name": "owners",
        "type": "address[]"
      },
      {
        "internalType": "uint256[]",
        "name": "amounts",
        "type": "uint256[]"
      }
    ],
    "name": "mintInitialOwnership",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "name": "properties",
    "outputs": [
      {
        "internalType": "string",
        "name": "name",
        "type": "string"
      },
      {
        "internalType": "string",
        "name": "location",
        "type": "string"
      },
      {
        "internalType": "string",
        "name": "description",
        "type": "string"
      },
      {
        "internalType": "string",
        "name": "amenities",
        "type": "string"
      },
      {
        "internalType": "uint256",
        "name": "totalUnits",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "annualMaintenanceFeePerUnit",
        "type": "uint256"
      },
      {
        "internalType": "bool",
        "name": "active",
        "type": "bool"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "bytes32",
        "name": "role",
        "type": "bytes32"
      },
      {
        "internalType": "address",
        "name": "callerConfirmation",
        "type": "address"
      }
    ],
    "name": "renounceRole",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "bytes32",
        "name": "role",
        "type": "bytes32"
      },
      {
        "internalType": "address",
        "name": "account",
        "type": "address"
      }
    ],
    "name": "revokeRole",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "from",
        "type": "address"
      },
      {
        "internalType": "address",
        "name": "to",
        "type": "address"
      },
      {
        "internalType": "uint256[]",
        "name": "ids",
        "type": "uint256[]"
      },
      {
        "internalType": "uint256[]",
        "name": "values",
        "type": "uint256[]"
      },
      {
        "internalType": "bytes",
        "name": "data",
        "type": "bytes"
      }
    ],
    "name": "safeBatchTransferFrom",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "from",
        "type": "address"
      },
      {
        "internalType": "address",
        "name": "to",
        "type": "address"
      },
      {
        "internalType": "uint256",
        "name": "id",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "amount",
        "type": "uint256"
      },
      {
        "internalType": "bytes",
        "name": "data",
        "type": "bytes"
      }
    ],
    "name": "safeTransferFrom",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "operator",
        "type": "address"
      },
      {
        "internalType": "bool",
        "name": "approved",
        "type": "bool"
      }
    ],
    "name": "setApprovalForAll",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "bytes4",
        "name": "interfaceId",
        "type": "bytes4"
      }
    ],
    "name": "supportsInterface",
    "outputs": [
      {
        "internalType": "bool",
        "name": "",
        "type": "bool"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "owner",
        "type": "address"
      },
      {
        "internalType": "uint256",
        "name": "propertyId",
        "type": "uint256"
      }
    ],
    "name": "unitsOwned",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "propertyId",
        "type": "uint256"
      },
      {
        "internalType": "string",
        "name": "name",
        "type": "string"
      },
      {
        "internalType": "string",
        "name": "location",
        "type": "string"
      },
      {
        "internalType": "string",
        "name": "description",
        "type": "string"
      },
      {
        "internalType": "string",
        "name": "amenities",
        "type": "string"
      },
      {
        "internalType": "uint256",
        "name": "maintenanceFee",
        "type": "uint256"
      }
    ],
    "name": "updateProperty",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "name": "uri",
    "outputs": [
      {
        "internalType": "string",
        "name": "",
        "type": "string"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  }
];

const TimeshareTokenContract = () => {
  const { provider, signer, account, connect, error, isConnecting } = useMetaMask();
  
  // Property Management States
  const [propertyId, setPropertyId] = useState("");
  const [propertyName, setPropertyName] = useState("");
  const [propertyLocation, setPropertyLocation] = useState("");
  const [propertyDescription, setPropertyDescription] = useState("");
  const [propertyAmenities, setPropertyAmenities] = useState("");
  const [totalUnits, setTotalUnits] = useState("");
  const [maintenanceFee, setMaintenanceFee] = useState("");
  
  // Minting States
  const [mintPropertyId, setMintPropertyId] = useState("");
  const [owners, setOwners] = useState([{ address: "", amount: "" }]);
  
  // Ownership Check States
  const [checkPropertyId, setCheckPropertyId] = useState("");
  const [ownerAddress, setOwnerAddress] = useState("");
  const [unitsResult, setUnitsResult] = useState("");
  
  // General States
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);


  // Add missing helper functions
  const validateNumbers = (...values) => {
    for (const value of values) {
      if (isNaN(value) || value.trim() === "") {
        setMessage("Please enter valid numbers");
        return false;
      }
    }
    return true;
  };

  const clearForm = () => {
    setPropertyName("");
    setPropertyLocation("");
    setPropertyDescription("");
    setPropertyAmenities("");
    setTotalUnits("");
    setMaintenanceFee("");
  };

  const addOwnerField = () => {
    setOwners([...owners, { address: "", amount: "" }]);
  };

  const updateOwnerField = (index, field, value) => {
    const newOwners = [...owners];
    newOwners[index][field] = value;
    setOwners(newOwners);
  };

  // Create Property function
  const createProperty = async () => {
    if (!validateNumbers(totalUnits, maintenanceFee)) return;
    
    setLoading(true);
    const contract = new Contract(contractAddress, contractABI, signer);
    try {
        const tx = await contract.createProperty(
            propertyName,
            propertyLocation,
            propertyDescription,
            propertyAmenities,
            parseEther(totalUnits),
            parseEther(maintenanceFee)
        );
        await tx.wait();
        setMessage("Property created successfully!");
        clearForm();
    } catch (error) {
        setMessage(`Error: ${error.message}`);
    }
    setLoading(false);
  };

// Update Property
const updateProperty = async () => {
    if (!validateNumbers(maintenanceFee)) return;
    
    setLoading(true);
    const contract = new Contract(contractAddress, contractABI, signer);
    try {
        const tx = await contract.updateProperty(
            propertyId,
            propertyName,
            propertyLocation,
            propertyDescription,
            propertyAmenities,
            parseEther(maintenanceFee)
        );
        await tx.wait();
        setMessage("Property updated successfully!");
    } catch (error) {
        setMessage(`Error: ${error.message}`);
    }
    setLoading(false);
    };

    // Get Property Details
    const getPropertyDetails = async () => {
    if (!propertyId) {
        setMessage("Please enter a Property ID");
        return;
    }
    
    setLoading(true);
    const contract = new Contract(contractAddress, contractABI, signer);
    try {
        const property = await contract.properties(propertyId);
        setPropertyName(property.name);
        setPropertyLocation(property.location);
        setPropertyDescription(property.description);
        setPropertyAmenities(property.amenities);
        setTotalUnits(ethers.utils.formatUnits(property.totalUnits, 0));
        setMaintenanceFee(ethers.utils.formatUnits(property.annualMaintenanceFeePerUnit, 0));
        setMessage("Property details loaded!");
    } catch (error) {
        setMessage(`Error: ${error.message}`);
    }
    setLoading(false);
    };

  // Fix in mintInitialOwnership function
  const mintInitialOwnership = async () => {
    const validOwners = owners.filter(o => o.address && o.amount);
    const addresses = validOwners.map(o => o.address);
    const amounts = validOwners.map(o => o.amount); // Use raw amount instead of parseEther

    
      
    if (validOwners.length === 0) {
      setMessage("Add at least one owner");
      return;
    }
    
    setLoading(true);
    const contract = new Contract(contractAddress, contractABI, signer);
    try {
        const addresses = validOwners.map(o => o.address);
        const amounts = validOwners.map(o => parseEther(o.amount));

        const tx = await contract.mintInitialOwnership(
          mintPropertyId,
          addresses,
          amounts
        );
        await tx.wait();
        setMessage("Ownership minted!");
        setOwners([{ address: "", amount: "" }]);
    } catch (error) {
        setMessage(`Error: ${error.message}`);
    }
    setLoading(false);
    };

  // Update the checkUnitsOwned function with these changes
  const checkUnitsOwned = async () => {
    if (!checkPropertyId || !ownerAddress) {
      setMessage("Fill all fields");
      return;
    }

    setLoading(true);
    try {
      const contract = new Contract(
        contractAddress,
        contractABI,
        signer
      );

      // Convert propertyId to number
      const propertyIdNumber = parseInt(checkPropertyId, 10);
      
      // Call the unitsOwned function
      const units = await contract.unitsOwned(
        ownerAddress,
        propertyIdNumber
      );

      // Convert BigNumber to string
      setUnitsResult(units.toString());
      setMessage("");
    } catch (error) {
      console.error("Error checking units:", error);
      setMessage(`Error: ${error.reason || error.message}`);
      setUnitsResult("");
    }
    setLoading(false);
  };

  return (
    <div className="container">
      <h1>Timeshare Token Management</h1>

       {/* Account Management Section */}
       <div className="account-section">
       {account ? (
          <div className="connected-account">
            <div className="account-info">
              <span className="account-address">
                {shortenAddress(account)}
              </span>
              <button 
                onClick={connect} 
                className="switch-button"
                disabled={isConnecting}
              >
                {isConnecting ? 'Switching...' : 'Switch Account'}
              </button>
            </div>
          </div>
        ) : (
          <div className="connect-section">
            <button 
              onClick={connect} 
              disabled={isConnecting}
              className="connect-button"
            >
              {isConnecting ? "Connecting..." : "Connect MetaMask"}
            </button>
            {error && (
              <div className="error">
                {error.includes("install MetaMask") ? (
                  <a href="https://metamask.io/" target="_blank" rel="noopener">
                    Install MetaMask
                  </a>
                ) : error}
              </div>
            )}
          </div>
        )}
      </div>


      {/* Contract Interface */}
      {signer && (
        <>
          {/* Create Property Section */}
          <div className="section">
          <h2>Create New Property</h2>
            <input type="text" placeholder="Property Name" value={propertyName} onChange={(e) => setPropertyName(e.target.value)} />
            <input type="text" placeholder="Location" value={propertyLocation} onChange={(e) => setPropertyLocation(e.target.value)} />
            <input type="text" placeholder="Description" value={propertyDescription} onChange={(e) => setPropertyDescription(e.target.value)} />
            <input type="text" placeholder="Amenities" value={propertyAmenities} onChange={(e) => setPropertyAmenities(e.target.value)} />
            <input type="number" placeholder="Total Units" value={totalUnits} onChange={(e) => setTotalUnits(e.target.value)} />
            <input type="number" placeholder="Maintenance Fee (wei)" value={maintenanceFee} onChange={(e) => setMaintenanceFee(e.target.value)} />
            <button onClick={createProperty} disabled={loading}>
              {loading ? "Processing..." : "Create Property"}
            </button>
          </div>
          {/* Update Property Section */}
          <div className="section">
            <h2>Update Property</h2>
            <div className="input-group">
              <input type="text" placeholder="Property ID" 
                value={propertyId} 
                onChange={(e) => setPropertyId(e.target.value)} />
              <button onClick={getPropertyDetails} disabled={loading}>
                {loading ? "Loading..." : "Load Details"}
              </button>
            </div>
            <input type="text" placeholder="Property Name" 
              value={propertyName} 
              onChange={(e) => setPropertyName(e.target.value)} />
            <input type="text" placeholder="Location" 
              value={propertyLocation} 
              onChange={(e) => setPropertyLocation(e.target.value)} />
            <button onClick={updateProperty} disabled={loading}>
              {loading ? "Updating..." : "Update Property"}
            </button>
          </div>

          {/* Mint Ownership Section */}
          <div className="section">
            <h2>Mint Ownership</h2>
            <input type="text" placeholder="Property ID" 
              value={mintPropertyId} 
              onChange={(e) => setMintPropertyId(e.target.value)} />
            {owners.map((owner, index) => (
              <div key={index} className="input-group">
                <input type="text" placeholder="Owner Address" 
                  value={owner.address} 
                  onChange={(e) => updateOwnerField(index, 'address', e.target.value)} />
                <input type="number" placeholder="Units" 
                  value={owner.amount} 
                  onChange={(e) => updateOwnerField(index, 'amount', e.target.value)} />
              </div>
            ))}
            <button onClick={addOwnerField}>+ Add Owner</button>
            <button onClick={mintInitialOwnership} disabled={loading}>
              {loading ? "Minting..." : "Mint Ownership"}
            </button>
          </div>

          {/* Check Ownership Section */}
          <div className="section">
            <h2>Check Ownership</h2>
            <input 
              type="number"  // Changed to number input
              placeholder="Property ID" 
              value={checkPropertyId} 
              onChange={(e) => setCheckPropertyId(e.target.value)}
            />
            <input
              type="text"
              placeholder="Owner Address"
              value={ownerAddress}
              onChange={(e) => setOwnerAddress(e.target.value)}
            />
            <button onClick={checkUnitsOwned} disabled={loading}>
              {loading ? "Checking..." : "Check Units"}
            </button>
            {unitsResult && (
              <div className="result">
                <p>Units Owned: {unitsResult}</p>
                <p>Property ID: {checkPropertyId}</p>
                <p>Owner Address: {shortenAddress(ownerAddress)}</p>
              </div>
            )}
          </div>
        </>
      )}

      {/* Status Messages */}
      {message && <div className="message">{message}</div>}

      <style jsx>{`
        .container {
            max-width: 800px;
            margin: 0 auto;
            padding: 20px;
        }
        .section {
            margin: 30px 0;
            padding: 20px;
            border: 1px solid #ddd;
            border-radius: 8px;
        }
        input {
            display: block;
            width: 100%;
            margin: 10px 0;
            padding: 8px;
        }
        button {
            background: #0070f3;
            color: white;
            border: none;
            padding: 10px 20px;
            border-radius: 4px;
            cursor: pointer;
            margin: 5px;
        }
        .error {
            color: red;
            margin-top: 10px;
        }
      `}</style>
    </div>
  );
};
// Helper function to shorten addresses
const shortenAddress = (address) => {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
};

export default TimeshareTokenContract;