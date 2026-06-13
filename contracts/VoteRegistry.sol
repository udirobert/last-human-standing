// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

contract VoteRegistry {
    event VoteCast(uint256 indexed submissionId, address indexed voter, bool isReal, uint256 timestamp);
    event VoteBatch(uint256 count, address indexed relayer);

    error Expired();
    error InvalidNonce();
    error InvalidSignature();
    error DeadlineNotReached();

    mapping(address => uint256) public nonces;
    address public owner;
    uint256 public minBatchSize;
    uint256 public cooldown;
    uint256 public lastBatchAt;

    bytes32 constant VOTE_TYPEHASH = keccak256(
        "Vote(address voter,uint256 submissionId,bool isReal,uint256 nonce,uint256 deadline)"
    );
    bytes32 DOMAIN_SEPARATOR;

    constructor() {
        owner = msg.sender;
        minBatchSize = 1;
        cooldown = 30 seconds;
        DOMAIN_SEPARATOR = keccak256(abi.encode(
            keccak256("EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)"),
            keccak256(bytes("LastHumanStanding")),
            keccak256(bytes("1")),
            block.chainid,
            address(this)
        ));
    }

    function setConfig(uint256 _minBatchSize, uint256 _cooldown) external {
        require(msg.sender == owner, "only owner");
        minBatchSize = _minBatchSize;
        cooldown = _cooldown;
    }

    function transferOwnership(address newOwner) external {
        require(msg.sender == owner, "only owner");
        owner = newOwner;
    }

    struct Vote {
        address voter;
        uint256 submissionId;
        bool isReal;
        uint256 nonce;
        uint256 deadline;
    }

    function castVote(Vote calldata vote, bytes calldata signature) external {
        _verifyAndEmit(vote, signature);
    }

    function batchVote(Vote[] calldata votes, bytes[] calldata signatures) external {
        require(votes.length == signatures.length, "length mismatch");
        require(votes.length >= minBatchSize, "below min batch size");
        require(block.timestamp >= lastBatchAt + cooldown, "cooldown active");

        for (uint256 i = 0; i < votes.length; i++) {
            _verifyAndEmit(votes[i], signatures[i]);
        }

        lastBatchAt = block.timestamp;
        emit VoteBatch(votes.length, msg.sender);
    }

    // Trusted relayer function: no signature verification.
    // Only the contract owner (ARIA agent) can call this.
    // Generates one onchain tx per vote for hackathon volume.
    function castRelayerVote(uint256 submissionId, address voter, bool isReal) external {
        require(msg.sender == owner, "only owner");
        emit VoteCast(submissionId, voter, isReal, block.timestamp);
    }

    function batchRelayerVotes(uint256[] calldata submissionIds, address[] calldata voters, bool[] calldata isReal) external {
        require(msg.sender == owner, "only owner");
        require(submissionIds.length == voters.length && voters.length == isReal.length, "length mismatch");
        for (uint256 i = 0; i < submissionIds.length; i++) {
            emit VoteCast(submissionIds[i], voters[i], isReal[i], block.timestamp);
        }
        emit VoteBatch(submissionIds.length, msg.sender);
    }

    function _splitSignature(bytes calldata sig) internal pure returns (bytes32 r, bytes32 s, uint8 v) {
        require(sig.length == 65, "invalid sig length");
        assembly {
            r := calldataload(sig.offset)
            s := calldataload(add(sig.offset, 0x20))
            v := byte(0, calldataload(add(sig.offset, 0x40)))
        }
        if (v < 27) v += 27;
    }

    function _verifyAndEmit(Vote calldata vote, bytes calldata signature) internal {
        if (block.timestamp > vote.deadline) revert Expired();
        if (nonces[vote.voter] + 1 != vote.nonce) revert InvalidNonce();

        nonces[vote.voter] = vote.nonce;

        bytes32 structHash = keccak256(abi.encode(
            VOTE_TYPEHASH,
            vote.voter,
            vote.submissionId,
            vote.isReal,
            vote.nonce,
            vote.deadline
        ));
        bytes32 digest = keccak256(abi.encodePacked("\x19\x01", DOMAIN_SEPARATOR, structHash));

        (bytes32 r, bytes32 s, uint8 v) = _splitSignature(signature);
        address recovered = ecrecover(digest, v, r, s);
        if (recovered == address(0) || recovered != vote.voter) revert InvalidSignature();

        emit VoteCast(vote.submissionId, vote.voter, vote.isReal, block.timestamp);
    }

    function getNonce(address voter) external view returns (uint256) {
        return nonces[voter] + 1;
    }
}
