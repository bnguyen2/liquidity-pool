import {
  ICO,
  SpaceCoin,
  SpaceCoin__factory,
  SpaceLP,
  SpaceLP__factory,
  SpaceRouter,
  SpaceRouter__factory,
} from "../typechain";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { ethers } from "hardhat";
import hre from "hardhat";

async function main() {
  const networkName = hre.network.name;
  let spaceCoin: SpaceCoin;
  let ico: ICO;
  let spaceLP: SpaceLP;
  let spaceRouter: SpaceRouter;
  let deployer: SignerWithAddress;

  if (networkName === "localhost") {
    [deployer] = await ethers.getSigners();
    console.log("Deploying contracts with the account:", deployer.address);
    const spaceCoinContract = (await ethers.getContractFactory("SpaceCoin")) as SpaceCoin__factory;
    const spaceLPContract = (await ethers.getContractFactory("SpaceLP")) as SpaceLP__factory;
    const spaceRouterContract = (await ethers.getContractFactory("SpaceRouter")) as SpaceRouter__factory;
    const icoContract = await ethers.getContractFactory("ICO");
    spaceCoin = await spaceCoinContract.deploy(deployer.address, deployer.address);
    spaceLP = await spaceLPContract.deploy(spaceCoin.address);
    spaceRouter = await spaceRouterContract.deploy(spaceCoin.address, spaceLP.address);
    ico = await icoContract.deploy(deployer.address, spaceCoin.address, [deployer.address]);
    await spaceCoin.transfer(ico.address, ethers.utils.parseEther("150000")); // transfer 150000 supply to ico contract
    await spaceCoin.transfer(deployer.address, ethers.utils.parseEther("350000"));
    ico.addToWhitelist([deployer.address]);
    console.log("Spacecoin deployed to: ", spaceCoin.address);
    console.log("ICO deployed to: ", ico.address);
    console.log("spaceLP deployed to: ", spaceLP.address);
    console.log("spaceRouter deployed to: ", spaceRouter.address);
  }

  if (networkName === "rinkeby") {
    [deployer] = await ethers.getSigners();
    console.log("Deploying contracts with the account:", deployer.address);
    const spaceCoinContract = (await ethers.getContractFactory("SpaceCoin")) as SpaceCoin__factory;
    const spaceLPContract = (await ethers.getContractFactory("SpaceLP")) as SpaceLP__factory;
    const spaceRouterContract = (await ethers.getContractFactory("SpaceRouter")) as SpaceRouter__factory;
    const icoContract = await ethers.getContractFactory("ICO");
    spaceCoin = await spaceCoinContract.deploy(deployer.address, deployer.address);
    spaceLP = await spaceLPContract.deploy(spaceCoin.address);
    spaceRouter = await spaceRouterContract.deploy(spaceCoin.address, spaceLP.address);
    ico = await icoContract.deploy(deployer.address, spaceCoin.address, [deployer.address]);
    await spaceCoin.transfer(ico.address, ethers.utils.parseEther("150000")); // transfer 150000 supply to ico contract
    await spaceCoin.transfer(deployer.address, ethers.utils.parseEther("350000")); // transfer remaining to treasury/deployer
    ico.addToWhitelist([deployer.address]);
    console.log("Spacecoin deployed to: ", spaceCoin.address);
    console.log("ICO deployed to: ", ico.address);
    console.log("spaceLP deployed to: ", spaceLP.address);
    console.log("spaceRouter deployed to: ", spaceRouter.address);
  }
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
