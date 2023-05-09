// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

import "hardhat/console.sol";

contract TicketNFT is ERC721 {
    address public owner;
    IERC20 public cJPYToken;
    uint256 public ticketPrice;
    uint256 public startTime;
    uint256 public ticketCounter;  // default value is zero

    constructor(
        string memory _name,
        string memory _symbol,
        address _cJPYTokenAddress,
        uint256 _ticketPrice,
        uint256 _startTime
    ) ERC721(_name, _symbol) {
        owner = msg.sender;
        cJPYToken = IERC20(_cJPYTokenAddress);
        ticketPrice = _ticketPrice;
        startTime = _startTime;
        // ticketCounter = 0;
    }

    modifier onlyOwner() {
        require(msg.sender == owner, "Caller is not the owner.");
        _;
    }

    function mintTicket() external {
        require(block.timestamp <= startTime, "Event already started. Ticket sales are finished!");
        require(cJPYToken.balanceOf(msg.sender) >= ticketPrice, "Insufficient cJPY balance.");

        cJPYToken.transferFrom(msg.sender, address(this), ticketPrice);
        ticketCounter++;
        _mint(msg.sender, ticketCounter);
    }

    function updateTicketPrice(uint256 newPrice) external onlyOwner {
        ticketPrice = newPrice;
    }

    function withdraw(uint256 amount) external onlyOwner {
        require(cJPYToken.balanceOf(address(this)) >= amount, "Insufficient contract balance.");
        cJPYToken.transfer(owner, amount);
    }
}

// TODO: Think this through.
    //       Should burning happen here, or in the POAP contract?
    //       Who will need to call the function?
    // function burnTicket(uint256 tokenId) external {
    //     require(msg.sender == ownerOf(tokenId), "Caller is not the owner of the ticket.");
    //     require(block.timestamp >= startblock), "Event has not started yet.");
    //     _burn(tokenId);
    // }