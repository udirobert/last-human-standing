// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {CommitRevealVoteRegistry} from "../CommitRevealVoteRegistry.sol";

interface Vm {
    function warp(uint256 newTimestamp) external;
    function prank(address sender) external;
}

/// @dev Minimal Foundry tests without a forge-std dependency.
contract CommitRevealVoteRegistryTest {
    Vm private constant vm = Vm(address(uint160(uint256(keccak256("hevm cheat code")))));
    address private constant VOTER = address(0xB0B);
    CommitRevealVoteRegistry private registry;

    function setUp() public {
        registry = new CommitRevealVoteRegistry();
    }

    function testCommitThenRevealCountsOneHumanVote() public {
        uint64 commitDeadline = uint64(block.timestamp + 100);
        registry.createRound(1, commitDeadline, uint64(block.timestamp + 200));

        bytes32 salt = keccak256("local-randomness");
        bytes32 commitment = registry.commitmentFor(1, 7, VOTER, true, salt);
        vm.prank(VOTER);
        registry.commitVote(1, 7, commitment);

        vm.warp(commitDeadline);
        vm.prank(VOTER);
        registry.revealVote(1, 7, true, salt);

        (uint256 human, uint256 sus) = registry.getTally(1, 7);
        require(human == 1, "human vote was not counted");
        require(sus == 0, "unexpected SUS vote");
    }

    function testRejectsARevealThatDoesNotMatchTheCommitment() public {
        uint64 commitDeadline = uint64(block.timestamp + 100);
        registry.createRound(1, commitDeadline, uint64(block.timestamp + 200));

        bytes32 salt = keccak256("correct-local-randomness");
        vm.prank(VOTER);
        registry.commitVote(1, 7, registry.commitmentFor(1, 7, VOTER, true, salt));

        vm.warp(commitDeadline);
        vm.prank(VOTER);
        (bool succeeded,) = address(registry).call(
            abi.encodeCall(registry.revealVote, (1, 7, false, salt))
        );
        require(!succeeded, "mismatched reveal was accepted");
    }
}
