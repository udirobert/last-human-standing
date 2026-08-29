// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

/**
 * @title PioneerPass
 * @notice Commemorative on-chain collectible for Last Human Standing Alpha & SpeedRun playtesters.
 * Deployed on Celo Mainnet / World Chain.
 */
contract PioneerPass {
    string public name = "Last Human Standing: Pioneer Pass";
    string public symbol = "LHS-PIONEER";

    event PioneerMinted(address indexed recipient, uint256 indexed tokenId, string serial, uint256 timestamp);
    event Transfer(address indexed from, address indexed to, uint256 indexed tokenId);

    address public owner;
    address public relayer;
    uint256 public nextTokenId = 1;

    mapping(uint256 => address) public ownerOf;
    mapping(address => uint256) public balanceOf;
    mapping(address => bool) public hasMinted;
    mapping(uint256 => string) public tokenSerial;

    modifier onlyOwner() {
        require(msg.sender == owner, "only owner");
        _;
    }

    modifier onlyRelayer() {
        require(msg.sender == owner || msg.sender == relayer, "only relayer");
        _;
    }

    constructor() {
        owner = msg.sender;
        relayer = msg.sender;
    }

    function setRelayer(address _relayer) external onlyOwner {
        relayer = _relayer;
    }

    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "zero address");
        owner = newOwner;
    }

    /**
     * @notice Mint a gasless Pioneer Pass for a verified playtester.
     */
    function mintPioneer(address recipient, string calldata serial) external onlyRelayer returns (uint256) {
        require(recipient != address(0), "invalid recipient");
        require(!hasMinted[recipient], "already minted");

        uint256 tokenId = nextTokenId++;
        ownerOf[tokenId] = recipient;
        balanceOf[recipient] += 1;
        hasMinted[recipient] = true;
        tokenSerial[tokenId] = serial;

        emit Transfer(address(0), recipient, tokenId);
        emit PioneerMinted(recipient, tokenId, serial, block.timestamp);

        return tokenId;
    }

    /**
     * @notice Check if an address holds a Pioneer Pass for in-game perks.
     */
    function hasPioneerPass(address player) external view returns (bool) {
        return balanceOf[player] > 0 || hasMinted[player];
    }
}
