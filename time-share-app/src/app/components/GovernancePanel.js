// components/GovernancePanel.js
"use client";
import { useState, useEffect } from 'react';
import { Contract, ethers } from 'ethers';
import useMetaMask from '../hooks/useMetaMask';
import { formatDistanceToNow } from 'date-fns';

const governanceAddress = "0x99bbA657f2BbC93c02D617f8bA121cB8Fc104Acf"; 
const governanceABI = [
    {
      "inputs": [
        {
          "internalType": "contract TimeshareToken",
          "name": "_timeshareToken",
          "type": "address"
        }
      ],
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
      "anonymous": false,
      "inputs": [
        {
          "indexed": true,
          "internalType": "uint256",
          "name": "proposalId",
          "type": "uint256"
        },
        {
          "indexed": true,
          "internalType": "uint256",
          "name": "propertyId",
          "type": "uint256"
        },
        {
          "indexed": false,
          "internalType": "string",
          "name": "description",
          "type": "string"
        },
        {
          "indexed": false,
          "internalType": "uint256",
          "name": "costEstimate",
          "type": "uint256"
        }
      ],
      "name": "ProposalCreated",
      "type": "event"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": true,
          "internalType": "uint256",
          "name": "proposalId",
          "type": "uint256"
        },
        {
          "indexed": false,
          "internalType": "bool",
          "name": "passed",
          "type": "bool"
        }
      ],
      "name": "ProposalExecuted",
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
          "internalType": "uint256",
          "name": "proposalId",
          "type": "uint256"
        },
        {
          "indexed": true,
          "internalType": "address",
          "name": "voter",
          "type": "address"
        },
        {
          "indexed": false,
          "internalType": "bool",
          "name": "support",
          "type": "bool"
        },
        {
          "indexed": false,
          "internalType": "uint256",
          "name": "votes",
          "type": "uint256"
        }
      ],
      "name": "VoteCast",
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
          "internalType": "uint256",
          "name": "proposalId",
          "type": "uint256"
        },
        {
          "internalType": "bool",
          "name": "support",
          "type": "bool"
        }
      ],
      "name": "castVote",
      "outputs": [],
      "stateMutability": "nonpayable",
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
          "name": "description",
          "type": "string"
        },
        {
          "internalType": "uint256",
          "name": "costEstimate",
          "type": "uint256"
        },
        {
          "internalType": "uint256",
          "name": "votingPeriod",
          "type": "uint256"
        }
      ],
      "name": "createProposal",
      "outputs": [
        {
          "internalType": "uint256",
          "name": "",
          "type": "uint256"
        }
      ],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "uint256",
          "name": "proposalId",
          "type": "uint256"
        }
      ],
      "name": "executeProposal",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "uint256",
          "name": "proposalId",
          "type": "uint256"
        }
      ],
      "name": "getProposal",
      "outputs": [
        {
          "internalType": "uint256",
          "name": "propertyId",
          "type": "uint256"
        },
        {
          "internalType": "string",
          "name": "description",
          "type": "string"
        },
        {
          "internalType": "uint256",
          "name": "costEstimate",
          "type": "uint256"
        },
        {
          "internalType": "uint256",
          "name": "votingEndTime",
          "type": "uint256"
        },
        {
          "internalType": "uint256",
          "name": "votesFor",
          "type": "uint256"
        },
        {
          "internalType": "uint256",
          "name": "votesAgainst",
          "type": "uint256"
        },
        {
          "internalType": "bool",
          "name": "executed",
          "type": "bool"
        },
        {
          "internalType": "bool",
          "name": "passed",
          "type": "bool"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "getProposalIdCounter",
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
          "internalType": "uint256",
          "name": "",
          "type": "uint256"
        },
        {
          "internalType": "address",
          "name": "",
          "type": "address"
        }
      ],
      "name": "hasVoted",
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
      "inputs": [],
      "name": "minimumVotingPeriod",
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
          "name": "",
          "type": "uint256"
        }
      ],
      "name": "proposals",
      "outputs": [
        {
          "internalType": "uint256",
          "name": "propertyId",
          "type": "uint256"
        },
        {
          "internalType": "string",
          "name": "description",
          "type": "string"
        },
        {
          "internalType": "uint256",
          "name": "costEstimate",
          "type": "uint256"
        },
        {
          "internalType": "uint256",
          "name": "votingEndTime",
          "type": "uint256"
        },
        {
          "internalType": "uint256",
          "name": "votesFor",
          "type": "uint256"
        },
        {
          "internalType": "uint256",
          "name": "votesAgainst",
          "type": "uint256"
        },
        {
          "internalType": "bool",
          "name": "executed",
          "type": "bool"
        },
        {
          "internalType": "bool",
          "name": "passed",
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
      "inputs": [],
      "name": "timeshareToken",
      "outputs": [
        {
          "internalType": "contract TimeshareToken",
          "name": "",
          "type": "address"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    }
  ];


const GovernancePanel = () => {

    const { signer, account } = useMetaMask();
    const [proposals, setProposals] = useState([]);
    const [newProposal, setNewProposal] = useState({
        propertyId: '',
        description: '',
        costEstimate: '',
        votingPeriod: '604800'
    });
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');
    // // Add this helper function inside the component
    // const checkPermissions = async (propertyId) => {
    //   try {
    //     const contract = new Contract(governanceAddress, governanceABI, signer);
    //     const isManager = await contract.hasRole("PROPERTY_MANAGER_ROLE", account);
    //     const balance = await timeshareToken.balanceOf(account, propertyId);
    //     return isManager || balance > 0;
    //   } catch (error) {
    //     console.error("Permission check failed:", error);
    //     return false;
    //   }
    // };
        // Add the missing createProposal function
    const createProposal = async (e) => {
        e.preventDefault();
        setLoading(true);
        setMessage('');
        
        try {
            if (!newProposal.propertyId || newProposal.propertyId.trim() === '') {
              setMessage("Please enter a valid property ID");
              return;
            }
            //       // Add permission check
            // const hasPermission = await checkPermissions(newProposal.propertyId);
            // if (!hasPermission) {
            // setMessage("Error: You need to be a manager or property owner");
            // return;
            // }
            
            const contract = new Contract(governanceAddress, governanceABI, signer);
            const votingPeriodDays = 1000;//newProposal.votingPeriod; 
            const votingPeriodSeconds = votingPeriodDays;
            const tx = await contract.createProposal(
            newProposal.propertyId,
            newProposal.description,
            ethers.parseEther(newProposal.costEstimate),
            parseInt(votingPeriodSeconds)
        );
        
        await tx.wait();
        setMessage('Proposal created successfully!');
        setNewProposal({ propertyId: '', description: '', costEstimate: '', votingPeriod: '604800' });
        console.log(tx);
        
        // Refresh proposals list
        loadProposals();
        } catch (error) {
        console.error("Proposal creation error:", error);
        setMessage(`Error: ${error.reason || error.message}`);
        }
        setLoading(false);
    };

    // Add other required functions
    const loadProposals = async () => {
      if (!signer || !account) return;
      
      try {
        const contract = new Contract(governanceAddress, governanceABI, signer);
        const count = await contract.getProposalIdCounter().catch(() => 0);
    
        const loadedProposals = [];
        for (let i = 1; i <= count; i++) {
          const proposal = await contract.getProposal(i);
          const hasVoted = await contract.hasVoted(i, account);
          
          loadedProposals.push({
            id: i,
            propertyId: proposal[0].toString(),
            description: proposal[1],
            costEstimate: ethers.formatEther(proposal[2]), // ETH value
            votingEndTime: new Date(Number(proposal[3].toString()) * 1000),
            votesFor: proposal[4].toString(), // Units as string
            votesAgainst: proposal[5].toString(), // Units as string
            executed: proposal[6],
            passed: proposal[7],
            hasVoted // Add voting status
          });
        }
        setProposals(loadedProposals);
      } catch (error) {
        console.error("Error loading proposals:", error);
        setMessage("Error loading proposals");
      }
    };

    const castVote = async (proposalId, support) => {
        setLoading(true);
        setMessage('');
        try {
        const contract = new Contract(governanceAddress, governanceABI, signer);
        const tx = await contract.castVote(proposalId, support);
        await tx.wait();
        setMessage('Vote cast successfully!');
        loadProposals();
        } catch (error) {
        setMessage(`Error: ${error.reason || error.message}`);
        }
        setLoading(false);
    };

    const executeProposal = async (proposalId) => {
        setLoading(true);
        setMessage('');
        try {
        const contract = new Contract(governanceAddress, governanceABI, signer);
        const tx = await contract.executeProposal(proposalId);
        await tx.wait();
        setMessage('Proposal executed!');
        loadProposals();
        } catch (error) {
        setMessage(`Error: ${error.reason || error.message}`);
        }
        setLoading(false);
    };

    useEffect(() => {
        loadProposals();
    }, [signer]);

  return (
    <div className="governance-container">
      <h2 className="gov-title">Community Governance</h2>

      {/* Create Proposal Card */}
      <div className="create-proposal-card">
        <h3 className="section-title">Create New Proposal</h3>
        <form onSubmit={createProposal} className="proposal-form">
          <div className="form-group">
            <label>Property ID</label>
            <input
              type="number"
              value={newProposal.propertyId}
              onChange={(e) => setNewProposal({...newProposal, propertyId: e.target.value})}
              required
            />
          </div>
          
          <div className="form-group">
            <label>Description</label>
            <textarea
              value={newProposal.description}
              onChange={(e) => setNewProposal({...newProposal, description: e.target.value})}
              rows="3"
              required
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Cost Estimate (ETH)</label>
              <input
                type="number"
                step="0.01"
                value={newProposal.costEstimate}
                onChange={(e) => setNewProposal({...newProposal, costEstimate: e.target.value})}
                required
              />
            </div>
            
            <div className="form-group">
              <label>Voting Period</label>
              <select
                value={newProposal.votingPeriod}
                onChange={(e) => setNewProposal({...newProposal, votingPeriod: e.target.value})}
              >
                <option value="604800">1 Week</option>
                <option value="1209600">2 Weeks</option>
                <option value="2592000">1 Month</option>
              </select>
            </div>
          </div>

          <button type="submit" className="submit-btn" disabled={loading}>
            {loading ? <div className="spinner"></div> : 'Create Proposal'}
          </button>
        </form>
      </div>

      {/* Proposals List */}
      <div className="proposals-list">
        <h3 className="section-title">Active Proposals</h3>
        
        {proposals.length === 0 && !loading && (
          <div className="empty-state">
            <p>No active proposals yet</p>
          </div>
        )}

        {proposals.map((proposal) => (
          <div key={proposal.id} className={`proposal-card ${proposal.executed ? 'executed' : ''}`}>
            <div className="proposal-header">
              <span className="proposal-id">Proposal #{proposal.id}</span>
              <span className={`status-badge ${proposal.executed ? 
                (proposal.passed ? 'passed' : 'rejected') : 'active'}`}>
                {proposal.executed ? 
                  (proposal.passed ? 'Approved' : 'Rejected') : 
                  'Voting Active'}
              </span>
            </div>
            
            <p className="proposal-description">{proposal.description}</p>
            
            <div className="proposal-details">
              <div className="detail-item">
                <span className="detail-label">Property ID:</span>
                <span className="detail-value">{proposal.propertyId}</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">Cost Estimate:</span>
                <span className="detail-value">{proposal.costEstimate} ETH</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">Voting Ends:</span>
                <span className="detail-value">
                    {formatDistanceToNow(proposal.votingEndTime, { 
                    addSuffix: true 
                    })}
                </span>
                </div>
            </div>

            <div className="vote-progress">
              <div className="progress-bar">
                <div 
                  className="progress-fill for" 
                  style={{ width: `${(proposal.votesFor / (proposal.votesFor + proposal.votesAgainst)) * 100}%` }}
                ></div>
              </div>
              <div className="vote-stats">
                <span className="for-stat">{proposal.votesFor} For</span>
                <span className="against-stat">{proposal.votesAgainst} Against</span>
              </div>
            </div>

            {!proposal.executed && (
              <div className="action-buttons">
                {proposal.votingEndTime > new Date() ? (
                  proposal.hasVoted ? (
                    <div className="voted-message">
                      ✓ You've already voted on this proposal
                    </div>
                  ) : (
                    <>
                      <button 
                        className="vote-btn for"
                        onClick={() => castVote(proposal.id, true)}
                        disabled={loading}
                      >
                        Vote For
                      </button>
                      <button 
                        className="vote-btn against"
                        onClick={() => castVote(proposal.id, false)}
                        disabled={loading}
                      >
                        Vote Against
                      </button>
                    </>
                  )
                ) : (
                  <button 
                    className="execute-btn"
                    onClick={() => executeProposal(proposal.id)}
                    disabled={loading}
                  >
                    Execute Proposal
                  </button>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Status Message */}
      {message && (
        <div className={`status-message ${message.includes('Error') ? 'error' : 'success'}`}>
          {message}
        </div>
      )}

      <style jsx>{`
        .governance-container {
          max-width: 800px;
          margin: 0 auto;
          padding: 20px;
        }

        .gov-title {
          text-align: center;
          color: #2d3748;
          margin-bottom: 2rem;
          font-size: 2rem;
        }

        .create-proposal-card {
          background: #fff;
          border-radius: 12px;
          padding: 2rem;
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
          margin-bottom: 2rem;
        }

        .section-title {
          color: #4a5568;
          margin-bottom: 1.5rem;
          font-size: 1.25rem;
          font-weight: 600;
        }

        .proposal-form {
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
        }

        .form-group {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .form-group label {
          font-weight: 500;
          color: #4a5568;
        }

        input, textarea, select {
          padding: 0.75rem;
          border: 1px solid #e2e8f0;
          border-radius: 6px;
          font-size: 1rem;
          transition: border-color 0.2s;
        }

        input:focus, textarea:focus, select:focus {
          outline: none;
          border-color: #4299e1;
          box-shadow: 0 0 0 1px #4299e1;
        }

        .form-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 1.5rem;
        }

        .submit-btn {
          background: #4299e1;
          color: white;
          padding: 0.75rem 1.5rem;
          border: none;
          border-radius: 6px;
          font-weight: 500;
          cursor: pointer;
          transition: background 0.2s;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
        }

        .submit-btn:hover {
          background: #3182ce;
        }

        .submit-btn:disabled {
          background: #cbd5e0;
          cursor: not-allowed;
        }

        .proposals-list {
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
        }

        .proposal-card {
          background: #fff;
          border-radius: 12px;
          padding: 1.5rem;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
          border-left: 4px solid #4299e1;
        }

        .proposal-card.executed {
          opacity: 0.7;
          border-left-color: #a0aec0;
        }

        .proposal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1rem;
        }

        .proposal-id {
          font-weight: 500;
          color: #2d3748;
        }

        .status-badge {
          padding: 0.25rem 0.75rem;
          border-radius: 20px;
          font-size: 0.875rem;
          font-weight: 500;
        }

        .status-badge.active {
          background: #bee3f8;
          color: #2b6cb0;
        }

        .status-badge.passed {
          background: #c6f6d5;
          color: #276749;
        }

        .status-badge.rejected {
          background: #fed7d7;
          color: #c53030;
        }

        .proposal-description {
          color: #4a5568;
          margin-bottom: 1rem;
          line-height: 1.5;
        }

        .proposal-details {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
          gap: 1rem;
          margin-bottom: 1.5rem;
        }

        .detail-item {
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
        }

        .detail-label {
          font-size: 0.875rem;
          color: #718096;
        }

        .detail-value {
          font-weight: 500;
          color: #2d3748;
        }

        .vote-progress {
          margin: 1.5rem 0;
        }

        .progress-bar {
          height: 8px;
          background: #e2e8f0;
          border-radius: 4px;
          overflow: hidden;
        }

        .progress-fill {
          height: 100%;
          transition: width 0.3s ease;
        }

        .progress-fill.for {
          background: #48bb78;
        }

        .vote-stats {
          display: flex;
          justify-content: space-between;
          margin-top: 0.5rem;
          font-size: 0.875rem;
        }

        .for-stat {
          color: #48bb78;
        }

        .against-stat {
          color: #f56565;
        }

        .action-buttons {
          display: flex;
          gap: 1rem;
          margin-top: 1rem;
        }

        .vote-btn {
          flex: 1;
          padding: 0.75rem 1rem;
          border: none;
          border-radius: 6px;
          font-weight: 500;
          cursor: pointer;
          transition: filter 0.2s;
        }

        .vote-btn.for {
          background: #48bb78;
          color: white;
        }

        .vote-btn.against {
          background: #f56565;
          color: white;
        }

        .vote-btn:disabled {
          opacity: 0.7;
          cursor: not-allowed;
        }

        .execute-btn {
          flex: 1;
          background: #4299e1;
          color: white;
          padding: 0.75rem 1rem;
          border: none;
          border-radius: 6px;
          font-weight: 500;
          cursor: pointer;
        }

        .status-message {
          padding: 1rem;
          border-radius: 6px;
          margin-top: 1rem;
          text-align: center;
        }

        .status-message.success {
          background: #c6f6d5;
          color: #276749;
        }

        .status-message.error {
          background: #fed7d7;
          color: #c53030;
        }

        .empty-state {
          text-align: center;
          padding: 2rem;
          color: #a0aec0;
        }

        .voted-message {
          color: #48bb78;
          font-weight: 500;
          padding: 0.75rem;
          text-align: center;
          width: 100%;
        }

        .spinner {
          width: 20px;
          height: 20px;
          border: 2px solid #fff;
          border-top-color: transparent;
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default GovernancePanel;