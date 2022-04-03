import { expect } from "chai";
import { ethers } from "hardhat";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { SpaceCoin, SpaceCoin__factory } from "../typechain";

describe("SpaceCoin Contract", () => {
  let spaceCoin: SpaceCoin;
  let owner: SignerWithAddress;
  let addr1: SignerWithAddress;
  let treasury: SignerWithAddress;
  let addrs: SignerWithAddress[];

  beforeEach(async () => {
    [owner, addr1, treasury, ...addrs] = await ethers.getSigners();
    const spaceCoinContract = (await ethers.getContractFactory("SpaceCoin")) as SpaceCoin__factory;
    spaceCoin = await spaceCoinContract.deploy(treasury.address, owner.address);
    await spaceCoin.deployed();
  });

  describe("Deployment", () => {
    it("should have a max supply for 500,000 tokens", async () => {
      const totalSupply = await spaceCoin.totalSupply();
      expect(totalSupply).to.equal("500000000000000000000000");
    });

    it("should assign the total supply of tokens to the owner", async () => {
      const ownerBalance = await spaceCoin.balanceOf(owner.address);
      expect(await spaceCoin.totalSupply()).to.equal(ownerBalance);
    });

    it("should assign the treasury wallet to the correct address", async () => {
      expect(await spaceCoin.treasury()).to.equal(treasury.address);
    });
  });

  describe("Transfer Tax", () => {
    it("should include 2% tax on every transfer that goes into the treasury wallet", async () => {
      await spaceCoin.connect(owner).toggleTakeFee();
      await spaceCoin.transfer(addr1.address, ethers.utils.parseEther("5"));
      expect(await spaceCoin.balanceOf(treasury.address)).to.equal(ethers.utils.parseEther("0.1"));
    });

    it("should not allow address with exception of the owner to disable 2% tax", async () => {
      await expect(spaceCoin.connect(addr1).toggleTakeFee()).to.be.revertedWith("Ownable: caller is not the owner");
      await spaceCoin.connect(owner).toggleTakeFee();
      await spaceCoin.transfer(addr1.address, ethers.utils.parseEther("5"));
      expect(await spaceCoin.balanceOf(treasury.address)).to.equal(ethers.utils.parseEther("0.1"));
    });
  });
});
