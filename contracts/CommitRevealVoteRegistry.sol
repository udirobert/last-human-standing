// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

/// @title CommitRevealVoteRegistry
/// @notice A two-phase ballot registry for Last Human Standing audit rounds.
/// @dev Commitments hide a ballot until the reveal window opens. Revealed
///      ballots are public by design; use this to prevent live-vote anchoring,
///      not as a permanently secret-ballot system.
contract CommitRevealVoteRegistry {
    struct Round {
        uint64 commitDeadline;
        uint64 revealDeadline;
        bool exists;
    }

    struct Tally {
        uint256 human;
        uint256 sus;
    }

    error OnlyOwner();
    error InvalidRoundWindow();
    error RoundAlreadyExists();
    error UnknownRound();
    error CommitPhaseClosed();
    error RevealPhaseNotOpen();
    error RevealPhaseClosed();
    error EmptyCommitment();
    error AlreadyCommitted();
    error NoCommitment();
    error AlreadyRevealed();
    error InvalidReveal();

    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);
    event RoundCreated(uint256 indexed roundId, uint64 commitDeadline, uint64 revealDeadline);
    event VoteCommitted(uint256 indexed roundId, uint256 indexed submissionId, address indexed voter, bytes32 commitment);
    event VoteRevealed(uint256 indexed roundId, uint256 indexed submissionId, address indexed voter, bool isHuman);

    address public owner;
    mapping(uint256 => Round) public rounds;
    mapping(uint256 => mapping(uint256 => mapping(address => bytes32))) private commitments;
    mapping(uint256 => mapping(uint256 => mapping(address => bool))) public revealed;
    mapping(uint256 => mapping(uint256 => Tally)) private tallies;

    constructor() {
        owner = msg.sender;
        emit OwnershipTransferred(address(0), msg.sender);
    }

    function transferOwnership(address newOwner) external {
        if (msg.sender != owner) revert OnlyOwner();
        if (newOwner == address(0)) revert OnlyOwner();
        emit OwnershipTransferred(owner, newOwner);
        owner = newOwner;
    }

    /// @notice Creates an audit round. Times are Unix seconds.
    function createRound(uint256 roundId, uint64 commitDeadline, uint64 revealDeadline) external {
        if (msg.sender != owner) revert OnlyOwner();
        if (rounds[roundId].exists) revert RoundAlreadyExists();
        if (commitDeadline <= block.timestamp || revealDeadline <= commitDeadline) revert InvalidRoundWindow();

        rounds[roundId] = Round({
            commitDeadline: commitDeadline,
            revealDeadline: revealDeadline,
            exists: true
        });
        emit RoundCreated(roundId, commitDeadline, revealDeadline);
    }

    /// @notice Stores a commitment without exposing the HUMAN/SUS decision.
    /// @dev Compute with commitmentFor(...) off-chain, then submit the result.
    function commitVote(uint256 roundId, uint256 submissionId, bytes32 commitment) external {
        _commit(roundId, submissionId, msg.sender, commitment);
    }

    /// @notice Owner/relayer commit on behalf of a voter (server signing key path).
    function commitRelayerVote(
        uint256 roundId,
        uint256 submissionId,
        address voter,
        bytes32 commitment
    ) external {
        if (msg.sender != owner) revert OnlyOwner();
        _commit(roundId, submissionId, voter, commitment);
    }

    /// @notice Reveals a committed ballot after the commit deadline.
    /// @dev A voter that never reveals is intentionally excluded from the tally.
    function revealVote(uint256 roundId, uint256 submissionId, bool isHuman, bytes32 salt) external {
        _reveal(roundId, submissionId, msg.sender, isHuman, salt);
    }

    /// @notice Owner/relayer reveal on behalf of a voter (server signing key path).
    function revealRelayerVote(
        uint256 roundId,
        uint256 submissionId,
        address voter,
        bool isHuman,
        bytes32 salt
    ) external {
        if (msg.sender != owner) revert OnlyOwner();
        _reveal(roundId, submissionId, voter, isHuman, salt);
    }

    function _commit(uint256 roundId, uint256 submissionId, address voter, bytes32 commitment) internal {
        Round memory round = rounds[roundId];
        if (!round.exists) revert UnknownRound();
        if (block.timestamp >= round.commitDeadline) revert CommitPhaseClosed();
        if (commitment == bytes32(0)) revert EmptyCommitment();
        if (voter == address(0)) revert OnlyOwner();
        if (commitments[roundId][submissionId][voter] != bytes32(0)) revert AlreadyCommitted();

        commitments[roundId][submissionId][voter] = commitment;
        emit VoteCommitted(roundId, submissionId, voter, commitment);
    }

    function _reveal(
        uint256 roundId,
        uint256 submissionId,
        address voter,
        bool isHuman,
        bytes32 salt
    ) internal {
        Round memory round = rounds[roundId];
        if (!round.exists) revert UnknownRound();
        if (block.timestamp < round.commitDeadline) revert RevealPhaseNotOpen();
        if (block.timestamp >= round.revealDeadline) revert RevealPhaseClosed();
        if (revealed[roundId][submissionId][voter]) revert AlreadyRevealed();

        bytes32 commitment = commitments[roundId][submissionId][voter];
        if (commitment == bytes32(0)) revert NoCommitment();
        if (commitment != commitmentFor(roundId, submissionId, voter, isHuman, salt)) revert InvalidReveal();

        revealed[roundId][submissionId][voter] = true;
        Tally storage tally = tallies[roundId][submissionId];
        if (isHuman) {
            tally.human += 1;
        } else {
            tally.sus += 1;
        }
        emit VoteRevealed(roundId, submissionId, voter, isHuman);
    }

    /// @notice Returns the canonical commitment preimage for an audit ballot.
    /// @dev Binding to chain and contract prevents commitment reuse elsewhere.
    function commitmentFor(
        uint256 roundId,
        uint256 submissionId,
        address voter,
        bool isHuman,
        bytes32 salt
    ) public view returns (bytes32) {
        return keccak256(abi.encode(address(this), block.chainid, roundId, submissionId, voter, isHuman, salt));
    }

    function getCommitment(uint256 roundId, uint256 submissionId, address voter) external view returns (bytes32) {
        return commitments[roundId][submissionId][voter];
    }

    function getTally(uint256 roundId, uint256 submissionId) external view returns (uint256 human, uint256 sus) {
        Tally memory tally = tallies[roundId][submissionId];
        return (tally.human, tally.sus);
    }
}
