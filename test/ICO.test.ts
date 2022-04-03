import { expect } from "chai";
import { ethers } from "hardhat";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { ICO, SpaceCoin, SpaceCoin__factory } from "../typechain";

describe("ICO Contract", () => {
  let ico: ICO;
  let spaceCoin: SpaceCoin;
  let owner: SignerWithAddress;
  let addr1: SignerWithAddress;
  let addr2: SignerWithAddress;
  let addr3: SignerWithAddress;
  let treasury: SignerWithAddress;
  let addrs: SignerWithAddress[];

  beforeEach(async () => {
    [owner, addr1, addr2, addr3, treasury, ...addrs] = await ethers.getSigners();
    const icoContract = await ethers.getContractFactory("ICO");
    const spaceCoinContract = (await ethers.getContractFactory("SpaceCoin")) as SpaceCoin__factory;
    spaceCoin = await spaceCoinContract.deploy(treasury.address, owner.address);
    ico = await icoContract.deploy(owner.address, spaceCoin.address, [owner.address]);
    await spaceCoin.deployed();
    spaceCoin.transfer(ico.address, ethers.utils.parseEther("150000")); // transfer total supply to crowdsale contract
    spaceCoin.transfer(treasury.address, ethers.utils.parseEther("350000")); // remaining to treasury
    await ico.deployed();
  });

  describe("Deployment", () => {
    it("deploys the ICO contract at the seed stage and actively fundraising", async () => {
      expect(await ico.isICOActive()).to.equal(true);
      expect(await ico.stage()).to.equal(0);
    });
  });

  describe("Purchasing Tokens", () => {
    it("does not allow user who are not whitelisted to purchase token in seed stage", async () => {
      await expect(ico.connect(addr1).buyTokens({ value: ethers.utils.parseEther("1") })).to.be.revertedWith(
        "not whitelisted"
      );
    });

    it("allows only owner to set whitelist and only allows users who are whitelisted to purchase during seed", async () => {
      await expect(ico.connect(addr1).addToWhitelist([addr1.address])).to.be.revertedWith(
        "Ownable: caller is not the owner"
      );
      await ico.addToWhitelist([addr1.address]);
      expect(await ico.isWhitelisted(addr1.address)).to.be.true;
      await ico.connect(addr1).buyTokens({ value: ethers.utils.parseEther("1") });
      expect(await ico.contributions(addr1.address)).to.equal(ethers.utils.parseEther("1"));
    });

    it("allows only owner to advance stage", async () => {
      await expect(ico.connect(addr1).advanceStage(1)).to.be.revertedWith("Ownable: caller is not the owner");
      await ico.connect(owner).advanceStage(1);
      expect(await ico.stage()).to.equal(1);
    });

    it("allows max individual contribution of 1500 ETH during seed stage", async () => {
      await ico.addToWhitelist([addr1.address]);
      await ico.connect(addr1).buyTokens({ value: ethers.utils.parseEther("1500") });
      expect(await ico.contributions(addr1.address)).to.equal(ethers.utils.parseEther("1500"));
      await expect(ico.connect(addr1).buyTokens({ value: ethers.utils.parseEther("1") })).to.be.revertedWith(
        "over contribution limit"
      );
    });

    it("allows max ICO contribution of 15000 during seed stage", async () => {
      let accounts = 10;
      for (let i = 0; i < accounts; i++) {
        await ico.addToWhitelist([addrs[i].address]);
        await ico.connect(addrs[i]).buyTokens({ value: ethers.utils.parseEther("1500") });
      }
      await ico.addToWhitelist([addrs[10].address]);
      await expect(ico.connect(addrs[10]).buyTokens({ value: ethers.utils.parseEther("1") })).to.be.revertedWith(
        "over funding limit"
      );
    });

    it("allows max individual contribution of 1000 ETH during general stage", async () => {
      await ico.connect(owner).advanceStage(1);
      expect(await ico.stage()).to.equal(1);
      await ico.connect(addr2).buyTokens({ value: ethers.utils.parseEther("1000") });
      expect(await ico.contributions(addr2.address)).to.equal(ethers.utils.parseEther("1000"));
      await expect(ico.connect(addr2).buyTokens({ value: ethers.utils.parseEther("1") })).to.be.revertedWith(
        "over contribution limit"
      );
    });

    it("allows max ICO contribution of 30000 during general stage", async () => {
      await ico.connect(owner).advanceStage(1);
      let accounts = 30;
      for (let i = 0; i < accounts; i++) {
        await ico.addToWhitelist([addrs[i].address]);
        await ico.connect(addrs[i]).buyTokens({ value: ethers.utils.parseEther("1000") });
      }
      await ico.addToWhitelist([addrs[30].address]);
      await expect(ico.connect(addrs[30]).buyTokens({ value: ethers.utils.parseEther("1") })).to.be.revertedWith(
        "over funding limit"
      );
    });
  });

  describe("Funding State", () => {
    it("only owner can toggle ico funding state and only allows funding during active fundraising", async () => {
      await expect(ico.connect(addr1).toggleFundingState()).to.be.revertedWith("Ownable: caller is not the owner");
      await ico.connect(owner).toggleFundingState();
      expect(await ico.isICOActive()).to.equal(false);
      await ico.addToWhitelist([addr1.address]);
      await expect(ico.connect(addr1).buyTokens({ value: ethers.utils.parseEther("1") })).to.be.revertedWith(
        "ICO is not active"
      );
    });
  });

  describe("Claim Token", () => {
    it("only allows users to claim space token during open stage", async () => {
      await ico.addToWhitelist([addr1.address]);
      await ico.connect(addr1).buyTokens({ value: ethers.utils.parseEther("1") });
      await expect(ico.connect(addr1).claimToken()).to.be.revertedWith("claimable only on open stage");
    });

    it("allows purchasers to claim their space tokens after making a purchase", async () => {
      await ico.addToWhitelist([addr3.address]);
      await ico.advanceStage(2);
      await expect(ico.connect(addr3).claimToken()).to.be.revertedWith("no tokens to claim");
      await ico.connect(addr3).buyTokens({ value: ethers.utils.parseEther("1") });
      await ico.connect(addr3).claimToken();
      expect(await spaceCoin.balanceOf(addr3.address)).to.equal(ethers.utils.parseEther("5"));
    });
  });

  describe("Withdrawals", () => {
    it("only allows owner to withdraw funds", async () => {
      await ico.buyTokens({ value: ethers.utils.parseEther("1") });
      await expect(ico.connect(addr1).withdrawFunds()).to.be.revertedWith("Ownable: caller is not the owner");
      await ico.withdrawFunds();
      expect(await ico.availableFundsToWithdraw()).to.equal(0);
    });
  });
});
