// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;
import "@openzeppelin/contracts/access/AccessControl.sol";
import "./TimeshareToken.sol";
/**
 * @title TimeshareGovernance
 * @dev Handles voting and proposals for property improvements
 */
contract TimeshareGovernance is AccessControl {
    TimeshareToken public timeshareToken;
    
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    bytes32 public constant PROPERTY_MANAGER_ROLE = keccak256("PROPERTY_MANAGER_ROLE");
    
    // Proposal counter (replacing Counters.sol)
    uint256 private _proposalIdCounter;
    
    // Proposal struct
    struct Proposal {
        uint256 propertyId;
        string description;
        uint256 costEstimate;
        uint256 votingEndTime;
        uint256 votesFor;
        uint256 votesAgainst;
        bool executed;
        bool passed;
    }
    
    // Mapping from proposalId to Proposal
    mapping(uint256 => Proposal) public proposals;
    
    // Mapping from proposalId to voter address to whether they have voted
    mapping(uint256 => mapping(address => bool)) public hasVoted;
    
    // Minimum voting period in seconds (default 1 week)
    uint256 public minimumVotingPeriod = 1 weeks;
    
    event ProposalCreated(uint256 indexed proposalId, uint256 indexed propertyId, string description, uint256 costEstimate);
    event VoteCast(uint256 indexed proposalId, address indexed voter, bool support, uint256 votes);
    event ProposalExecuted(uint256 indexed proposalId, bool passed);
    
    constructor(TimeshareToken _timeshareToken) {
        timeshareToken = _timeshareToken;
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(ADMIN_ROLE, msg.sender);
    }
    
    /**
     * @dev Get current proposal ID counter
     */
    function getProposalIdCounter() public view returns (uint256) {
        return _proposalIdCounter;
    }
    
    /**
     * @dev Increment and return the next proposal ID
     */
    function _getNextProposalId() private returns (uint256) {
        _proposalIdCounter += 1;
        return _proposalIdCounter;
    }
    
    /**
     * @dev Create a new proposal
     */
    function createProposal(
        uint256 propertyId,
        string memory description,
        uint256 costEstimate,
        uint256 votingPeriod
    ) external returns (uint256) {
        require(
            hasRole(PROPERTY_MANAGER_ROLE, msg.sender) || timeshareToken.balanceOf(msg.sender, propertyId) > 0,
            "Must be manager or owner"
        );
        require(votingPeriod >= minimumVotingPeriod, "Voting period too short");
        
        uint256 proposalId = _getNextProposalId();
        
        proposals[proposalId] = Proposal({
            propertyId: propertyId,
            description: description,
            costEstimate: costEstimate,
            votingEndTime: block.timestamp + votingPeriod,
            votesFor: 0,
            votesAgainst: 0,
            executed: false,
            passed: false
        });
        
        emit ProposalCreated(proposalId, propertyId, description, costEstimate);
        return proposalId;
    }
    
    /**
     * @dev Cast a vote on a proposal
     */
    function castVote(uint256 proposalId, bool support) external {
        Proposal storage proposal = proposals[proposalId];
        require(block.timestamp < proposal.votingEndTime, "Voting period ended");
        require(!proposal.executed, "Proposal already executed");
        require(!hasVoted[proposalId][msg.sender], "Already voted");
        
        uint256 votes = timeshareToken.balanceOf(msg.sender, proposal.propertyId);
        require(votes > 0, "No voting power");
        
        if (support) {
            proposal.votesFor += votes;
        } else {
            proposal.votesAgainst += votes;
        }
        
        hasVoted[proposalId][msg.sender] = true;
        
        emit VoteCast(proposalId, msg.sender, support, votes);
    }
    
    /**
     * @dev Execute a proposal after voting ends
     */
    function executeProposal(uint256 proposalId) external {
        Proposal storage proposal = proposals[proposalId];
        require(block.timestamp >= proposal.votingEndTime, "Voting period not ended");
        require(!proposal.executed, "Proposal already executed");
        
        proposal.executed = true;
        
        // Determine if proposal passed
        uint256 totalVotes = proposal.votesFor + proposal.votesAgainst;
        //uint256 totalPossibleVotes = timeshareToken.properties(proposal.propertyId).totalUnits;
        (,,,,uint256 totalUnits,,) = timeshareToken.properties(proposal.propertyId);
        uint256 totalPossibleVotes = totalUnits;
        
        // Require at least 25% participation
        bool quorumReached = totalVotes >= (totalPossibleVotes / 4);
        
        // Require simple majority
        bool majoritySupport = proposal.votesFor > proposal.votesAgainst;
        
        proposal.passed = quorumReached && majoritySupport;
        
        emit ProposalExecuted(proposalId, proposal.passed);
    }
    
    /**
     * @dev Get proposal details
     */
    function getProposal(uint256 proposalId) external view returns (
        uint256 propertyId,
        string memory description,
        uint256 costEstimate,
        uint256 votingEndTime,
        uint256 votesFor,
        uint256 votesAgainst,
        bool executed,
        bool passed
    ) {
        Proposal storage proposal = proposals[proposalId];
        return (
            proposal.propertyId,
            proposal.description,
            proposal.costEstimate,
            proposal.votingEndTime,
            proposal.votesFor,
            proposal.votesAgainst,
            proposal.executed,
            proposal.passed
        );
    }
}