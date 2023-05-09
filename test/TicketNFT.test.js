const { expect } = require("chai");
const { ethers } = require("hardhat");

// 1686186000 (seconds) (Thu Jun 08 2023 01:00:00)
const EVENT_START_TIME_UTC = 1686186000; // unit is "seconds" not "milliseconds"
const TEN_TOKENS = ethers.utils.parseEther("10");
const TWENTY_TOKENS = ethers.utils.parseEther("20");
const ONE_HUNDRED_TOKENS = ethers.utils.parseEther("100");

async function getCurrentBlockTimestamp() {
  const blockNumber = await ethers.provider.getBlockNumber();
  const block = await ethers.provider.getBlock(blockNumber);
  const timestamp = block.timestamp;
  return timestamp;
}

async function setBlockTimestamp(timestamp) {
  await ethers.provider.send('evm_mine', [Math.floor(timestamp)]);
}

describe("TicketNFT", function () {
  let owner, alice, bob, carol, dave, Registry, registry, CJPY, cJPY, TicketNFT, ticketNFT, startTime;

  beforeEach(async function () {
    // Get signers (test user accounts)
    [owner, alice, bob, carol, dave] = await ethers.getSigners();
    // Deploy Registry contract
    Registry = await ethers.getContractFactory("Registry");
    registry = await Registry.deploy();
    await registry.deployed();

    // Deploy cJPY contract
    CJPY = await ethers.getContractFactory("CJPY");
    cJPY = await CJPY.deploy(registry.address);
    await cJPY.deployed();

    // Deploy TicketNFT contract
    TicketNFT = await ethers.getContractFactory("TicketNFT");
    // startTime = await ethers.provider.getBlockNumber() + 100;
    ticketNFT = await TicketNFT.deploy(
      "Chiba Hill Tickets",
      "CHT",
      cJPY.address,
      TEN_TOKENS,
      // startTime,
      EVENT_START_TIME_UTC,
    );
    await ticketNFT.deployed();

    // Add users to the whitelist
    await registry.connect(owner).bulkAddToWhitelist([
      ethers.constants.AddressZero,
      ticketNFT.address,
      owner.address,
      alice.address,
      bob.address,
      carol.address,
    ]);

    // Mint cJPY tokens to test users
    await cJPY.connect(owner).mint(alice.address, ONE_HUNDRED_TOKENS);
    await cJPY.connect(owner).mint(bob.address, ONE_HUNDRED_TOKENS);
    await cJPY.connect(owner).mint(carol.address, ONE_HUNDRED_TOKENS);

    // Approve the TicketNFT contract to spend cJPY tokens on behalf of test users
    await cJPY.connect(alice).approve(ticketNFT.address, ONE_HUNDRED_TOKENS);
    await cJPY.connect(bob).approve(ticketNFT.address, ONE_HUNDRED_TOKENS);
    await cJPY.connect(carol).approve(ticketNFT.address, ONE_HUNDRED_TOKENS);
  });

  describe("Initializing the TicketNFT contract", function () {
    it("Should correctly initialize TicketNFT contract", async function () {
      const currentBlock = await ethers.provider.getBlockNumber();
      expect(await ticketNFT.name()).to.equal("Chiba Hill Tickets");
      expect(await ticketNFT.symbol()).to.equal("CHT");
      expect(await ticketNFT.ticketPrice()).to.equal(TEN_TOKENS);
      expect(await ticketNFT.startTime()).to.equal(EVENT_START_TIME_UTC);
      expect(await ticketNFT.owner()).to.equal(owner.address);
    });
   });

  describe("Before the Event Starts", function () {
    it("Should allow ticket minting by whitelist members before the event starts", async function () {
      expect(await cJPY.balanceOf(ticketNFT.address)).to.equal(0);
      await ticketNFT.connect(alice).mintTicket();
      expect(await ticketNFT.ownerOf(1)).to.equal(alice.address);
      expect(await cJPY.balanceOf(ticketNFT.address)).to.equal(TEN_TOKENS);
    });

    it("Should prevent ticket minting by non-whitelist members", async function () {
      await expect(ticketNFT.connect(dave).mintTicket()).to.be.revertedWith("Insufficient cJPY balance.");
    });

    it("Should prevent ticket minting if the customer has an insufficient cJPY balance", async function () {
      await cJPY.connect(alice).transfer(carol.address, ONE_HUNDRED_TOKENS);
      await expect(ticketNFT.connect(alice).mintTicket()).to.be.revertedWith("Insufficient cJPY balance.");
    });

    it("Should allow the owner to update the ticket price", async function () {
      await ticketNFT.connect(owner).updateTicketPrice(TWENTY_TOKENS);
      expect(await ticketNFT.ticketPrice()).to.equal(TWENTY_TOKENS);
    });

    it("Should prevent non-owners from updating the ticket price", async function () {
      await expect(ticketNFT.connect(alice).updateTicketPrice(TWENTY_TOKENS)).to.be.revertedWith("Caller is not the owner.");
    });

    it("Should allow the owner to withdraw cJPY tokens when there is a positive balance", async function () {
      expect(await cJPY.balanceOf(owner.address)).to.equal(0);
      await ticketNFT.connect(alice).mintTicket();
      await ticketNFT.connect(owner).withdraw(TEN_TOKENS);
      expect(await cJPY.balanceOf(owner.address)).to.equal(TEN_TOKENS);
    });

    it("Should prevent the owner from withdrawing more cJPY tokens than are in the contract", async function () {
      expect(await cJPY.balanceOf(owner.address)).to.equal(0);
      await ticketNFT.connect(alice).mintTicket();
      await ticketNFT.connect(owner).withdraw(TEN_TOKENS);
      expect(await cJPY.balanceOf(owner.address)).to.equal(TEN_TOKENS);
    });

    it("Should prevent non-owner from withdrawing cJPY tokens", async function () {
      await expect(ticketNFT.connect(alice).withdraw(TEN_TOKENS)).to.be.revertedWith("Caller is not the owner.");
    });
  });

  describe("After the Event Starts", function () {
    it("Should prevent ticket minting once the event had already started", async function () {
      // Set block timestamp to Session 8 start time (UTC)
      // 1686186000 (seconds) (Thu Jun 08 2023 01:00:00)
      await setBlockTimestamp(EVENT_START_TIME_UTC);
      await expect(ticketNFT.connect(alice).mintTicket()).to.be.revertedWith("Event already started. Ticket sales are finished!");
    });
  });
});
