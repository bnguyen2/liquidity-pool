import { expect } from "chai";
import { ethers } from "hardhat";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import {
  SpaceLP,
  SpaceLP__factory,
  SpaceCoin,
  SpaceCoin__factory,
  SpaceRouter,
  SpaceRouter__factory,
} from "../typechain";

const MaxUint256 = ethers.constants.MaxUint256;
const { parseEther, formatEther } = ethers.utils;

describe("Liquidity Pool and Router Tests", () => {
  let spaceLP: SpaceLP;
  let spaceCoin: SpaceCoin;
  let spaceRouter: SpaceRouter;
  let owner: SignerWithAddress;
  let treasury: SignerWithAddress;
  let lp1: SignerWithAddress;
  let lp2: SignerWithAddress;
  let addr1: SignerWithAddress;
  let addrs: SignerWithAddress[];

  beforeEach(async () => {
    [owner, treasury, lp1, lp2, addr1, ...addrs] = await ethers.getSigners();
    const spaceCoinContract = (await ethers.getContractFactory("SpaceCoin")) as SpaceCoin__factory;
    const spaceLPContract = (await ethers.getContractFactory("SpaceLP")) as SpaceLP__factory;
    const spaceRouterContract = (await ethers.getContractFactory("SpaceRouter")) as SpaceRouter__factory;
    spaceCoin = await spaceCoinContract.deploy(treasury.address, owner.address);
    spaceLP = await spaceLPContract.deploy(spaceCoin.address);
    spaceRouter = await spaceRouterContract.deploy(spaceCoin.address, spaceLP.address);
    await spaceCoin.deployed();
    spaceCoin.transfer(lp1.address, parseEther("10000"));
    spaceCoin.transfer(lp2.address, parseEther("10000"));
    spaceCoin.connect(lp1).approve(spaceRouter.address, MaxUint256); // approve max uint similar to how uniswap does for gas savings
    spaceCoin.connect(lp2).approve(spaceRouter.address, MaxUint256);
    spaceCoin.connect(addr1).approve(spaceRouter.address, MaxUint256);
    spaceLP.connect(lp1).approve(spaceRouter.address, MaxUint256); // approve dex to transfer Space LP
    spaceLP.connect(lp2).approve(spaceRouter.address, MaxUint256);
    spaceLP.connect(addr1).approve(spaceRouter.address, MaxUint256);
    await spaceLP.deployed();
    await spaceRouter.deployed();
  });

  describe("Deployment", () => {
    it("should deploy Space LP with zero starting liquidity", async () => {
      const [ethRes, spceRes] = await spaceLP.getReserves();
      expect(ethRes.isZero()).to.equal(true);
      expect(spceRes.isZero()).to.equal(true);
      expect(await spaceLP.totalSupply()).to.equal(0);
    });
  });

  describe("Adding Liquidity", () => {
    it("should calculate and add initial liquidity to LP pool and mint LP token to liquidity provider", async () => {
      await spaceRouter.connect(lp1).addLiquidity(
        lp1.address,
        parseEther("5"), // spce
        0,
        0,
        { value: parseEther("1") } // eth
      );

      const [ethRes, spceRes] = await spaceLP.getReserves();
      expect(ethRes.toString()).to.equal(parseEther("1"));
      expect(spceRes.toString()).to.equal(parseEther("5"));
      // first mint of 1 eth and 5 spce give LP token of ~2.236
      expect(await spaceLP.connect(lp1).balanceOf(lp1.address)).to.equal("2236067977499788696");
    });

    it("should allow multiple LP adds and mint correct LP tokens", async () => {
      await spaceRouter.connect(lp1).addLiquidity(
        lp1.address,
        parseEther("5"), // spce
        0,
        0,
        { value: parseEther("1") } // eth
      );

      await spaceRouter.connect(lp2).addLiquidity(
        lp2.address,
        parseEther("20"), // spce
        0,
        0,
        { value: parseEther("4") } // eth
      );

      const [ethRes, spceRes] = await spaceLP.getReserves();
      expect(ethRes.toString()).to.be.closeTo(parseEther("4.98"), parseEther("5"));
      expect(spceRes.toString()).to.be.closeTo(parseEther("24.98"), parseEther("25"));
      expect(await spaceLP.connect(lp1).balanceOf(lp1.address)).to.be.closeTo(parseEther("2.236"), parseEther("2.240"));
      // 2nd mint min of
      // eth = 4 * 2.236 / 1 = 8.944
      // spce = 20 * 2.236 / 5 = 8.944
      expect(await spaceLP.connect(lp2).balanceOf(lp2.address)).to.be.closeTo(parseEther("8.944"), parseEther("8.950"));
    });
  });

  describe("Redeeming Liquidity", () => {
    it("should allow LPs to redeem their liquidity tokens", async () => {
      let spceTokenOwned = await spaceCoin.connect(lp1).balanceOf(lp1.address);
      expect(spceTokenOwned).to.equal(parseEther("10000"));

      await spaceRouter.connect(lp1).addLiquidity(
        lp1.address,
        parseEther("5"), // spce
        0,
        0,
        { value: parseEther("1") } // eth
      );

      spceTokenOwned = await spaceCoin.connect(lp1).balanceOf(lp1.address);
      expect(spceTokenOwned).to.equal(parseEther("9995"));

      await spaceRouter.connect(lp2).addLiquidity(
        lp2.address,
        parseEther("20"), // spce
        0,
        0,
        { value: parseEther("4") } // eth
      );

      let lp1Tokens = await spaceLP.connect(lp1).balanceOf(lp1.address);
      await spaceRouter.connect(lp1).removeLiquidity(lp1.address, lp1Tokens, 0, 0);
      const [ethRes, spceRes] = await spaceLP.getReserves();
      expect(ethRes.toString()).to.be.closeTo(parseEther("4"), parseEther("4.05"));
      expect(spceRes.toString()).to.be.closeTo(parseEther("20"), parseEther("20.05"));
      // total liquidity = 2.23606797 + 8.94427191 = 11.18033988 from previous 2 liquidity adds
      // lp1 redeem liquidity = 11.18033988 - 2.23606797 = 8.94427191
      expect(await spaceLP.totalSupply()).to.be.closeTo(parseEther("8.944"), parseEther("8.960"));
      spceTokenOwned = await spaceCoin.connect(lp1).balanceOf(lp1.address);
      expect(spceTokenOwned).to.be.closeTo(parseEther("10000"), parseEther("10001"));
    });
  });

  describe("Swapping Tokens", () => {
    it("should allow traders to swap SPCE tokens for ETH", async () => {
      await spaceRouter.connect(lp1).addLiquidity(
        lp1.address,
        parseEther("25"), // spce
        0,
        0,
        { value: parseEther("5") } // eth
      );

      const lp2StartEthBalance = await ethers.provider.getBalance(lp2.address);
      expect(await spaceRouter.connect(lp2).swapSpceForEth(lp2.address, parseEther("5"), 0)).to.emit(
        spaceRouter,
        "Swap"
      );
      const lp2SpceToken = await spaceCoin.connect(lp2).balanceOf(lp2.address);
      const lp2EndEthBalance = await ethers.provider.getBalance(lp2.address);
      const difference = Number(formatEther(lp2EndEthBalance.sub(lp2StartEthBalance)));
      expect(formatEther(lp2SpceToken)).to.equal("9995.0");
      expect(difference).to.be.closeTo(1, 0.82637729549248748);
      const [ethRes, spceRes] = await spaceLP.getReserves();
      const amountOut = "826377295492487480";
      expect(ethRes.toString()).to.equal(parseEther("5").sub(amountOut));
      expect(spceRes.toString()).to.equal(parseEther("30"));
    });

    it("should fail the trade if there is no liquidity", async () => {
      await expect(spaceRouter.connect(lp1).swapSpceForEth(lp1.address, parseEther("5"), 0)).to.revertedWith(
        "insufficient liquidity"
      );
    });

    it("should revert swapSpceForEth is slippage is higher then minimum ETH amount", async () => {
      await spaceRouter.connect(lp1).addLiquidity(
        lp1.address,
        parseEther("25"), // spce
        0,
        0,
        { value: parseEther("5") } // eth
      );

      await expect(
        spaceRouter.connect(lp2).swapSpceForEth(lp2.address, parseEther("5"), parseEther("1"))
      ).to.be.revertedWith("failed due to slippage");
    });

    it("should allow traders to swap ETH tokens for SPCE", async () => {
      await spaceRouter.connect(lp1).addLiquidity(
        lp1.address,
        parseEther("25"), // spce
        0,
        0,
        { value: parseEther("5") } // eth
      );

      const lp2StartEthBalance = await ethers.provider.getBalance(lp2.address);
      expect(await spaceRouter.connect(lp2).swapEthForSpce(lp2.address, 0, { value: parseEther("1") })).to.emit(
        spaceRouter,
        "Swap"
      );
      const lp2SpceToken = await spaceCoin.connect(lp2).balanceOf(lp2.address);
      const lp2EndEthBalance = await ethers.provider.getBalance(lp2.address);
      const difference = Number(formatEther(lp2StartEthBalance.sub(lp2EndEthBalance)));
      expect(formatEther(lp2SpceToken)).to.equal("10004.131886477462437396");
      expect(difference).to.be.closeTo(1, 2);
      const [ethRes, spceRes] = await spaceLP.getReserves();
      const amountOut = "4131886477462437396";
      expect(ethRes.toString()).to.equal(parseEther("6"));
      expect(spceRes.toString()).to.equal(parseEther("25").sub(amountOut));
    });

    it("should revert swapEthForSpce is slippage is higher then minimum SPCE amount", async () => {
      await spaceRouter.connect(lp1).addLiquidity(
        lp1.address,
        parseEther("25"), // spce
        0,
        0,
        { value: parseEther("5") } // eth
      );

      await expect(
        spaceRouter.connect(lp2).swapEthForSpce(lp2.address, parseEther("5"), {
          value: parseEther("1"),
        })
      ).to.be.revertedWith("failed due to slippage");
    });
  });

  describe("Fees on transfer tokens", () => {
    it("should allow LPs to remove liquidity from fees on transfer tokens", async () => {
      await spaceCoin.toggleTakeFee(); // fee on
      await spaceCoin.connect(lp1).transfer(addr1.address, parseEther("10"));

      await spaceRouter.connect(addr1).addLiquidity(
        addr1.address,
        parseEther("5"), // spce
        0,
        0,
        { value: parseEther("1") } // eth
      );
      let addr1LpTokens = await spaceLP.connect(addr1).balanceOf(addr1.address);
      await spaceRouter.connect(addr1).removeLiquidity(lp1.address, addr1LpTokens, 0, 0);
      expect(await spaceLP.totalSupply()).to.equal(1000); // 1000 from minimum liquidity
    });

    it("should allow traders to swap ETH for SPCE with fees on transfer on for SPCE", async () => {
      await spaceCoin.toggleTakeFee(); // fee on
      await spaceCoin.connect(lp1).transfer(addr1.address, parseEther("100"));

      await spaceRouter.connect(addr1).addLiquidity(
        addr1.address,
        parseEther("25"), // spce
        0,
        0,
        { value: parseEther("5") } // eth
      );

      expect(await spaceRouter.connect(addr1).swapEthForSpce(lp2.address, 0, { value: parseEther("1") })).to.emit(
        spaceRouter,
        "Swap"
      );
    });

    it("should allow traders to swap SPCE for ETH with fees on transfer on for SPCE", async () => {
      await spaceCoin.toggleTakeFee(); // fee on
      await spaceCoin.connect(lp1).transfer(addr1.address, parseEther("100"));

      await spaceRouter.connect(addr1).addLiquidity(
        addr1.address,
        parseEther("25"), // spce
        0,
        0,
        { value: parseEther("5") } // eth
      );

      expect(await spaceRouter.connect(lp2).swapSpceForEth(lp2.address, parseEther("5"), 0)).to.emit(
        spaceRouter,
        "Swap"
      );
    });
  });
});
