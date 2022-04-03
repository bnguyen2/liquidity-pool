## Specs

### Liquidity Pool Contract: Implement a liquidity pool for ETH-SPC:

- Mints LP tokens for liquidity deposits (ETH + SPC tokens)
- Burns LP tokens to return liquidity to holder
- Accepts trades with a 1% fee

### Space Router

- Trader grants allowance to contract X for Y tokens
- Trader invokes contract X to make the transfer
- Write a router contract to handles these transactions. Be sure it can:
- Add / remove liquidity
- Swap tokens, rejecting if the slippage is above a given amount

### Quickstart

```
`npm install` in root directory to add hardhat dependencies
cd into `frontend-2` and run `npm install` to add frontend dependencies
`npm start` to start frontend webapp
```

### Rinkeby Deployed Contracts

```
SpaceCoin deployed to: 0xA621b9C210bd786825B6aD415A30Fc5884e85035
ICO deployed to: 0x01551CfF2a14c0eF9A3D00f270A930B357A6957d
SpaceLP deployed to: 0xb19B7e9e5166Ff29354EB1A7417D1f2B7d25F39a
SpaceRouter deployed to: 0x30587711e4f5f2Ad5C73BD795Fe92d35b1008419
```

### Testing

```
npx hardhat test
npx hardhat coverage
REPORT_GAS=true npx hardhat test
```

## Design Exercise

How would you extend your LP contract to award additional rewards – say, a separate ERC-20 token – to further incentivize liquidity providers to deposit into your pool?

## Answer

There are many ways to incentivize liquidity providers:

1. Liquidity mining - You can offer tokens as a reward for staking the LP tokens. A lot of new defi protocols do this when they start out to build up liquidity in their protocol. Usually there a set emission schedule that rewards LPs that stake their tokens in addition to other participants.
2. You can add a governance mechanism into your LP protocol. Curve, a stableswap does this for example. They have the $crv token and veCrv (vote-escrowed crv) where you get when you lock your $crv token for up to a maximum of 4 years in which then the balance decays linearly. The veCrv token is non-transferrable/tradable and will be used in voting/setting policies for setting the "gauges" to dictate where crv emissions goes and into which pools to boost its rewards (up to a maximum 2.5x). A lot of DAOs have been accumulating and fighting over this, which is known as the "curve war". This also helps their tokenomics as locking the curve token is one way transaction (you're stuck until it unlocks based on how long you chose) which can lead to less sell pressure for crv.
3. Launch pad incentives / IDOs / seed - Can incentivize LPs by allowing them to participate in new token launch. Trader Joe on Avalanche does this, when you own $joe, you can stake your $joe tokens into the LP to gain rjoe which is also a non-transferrable/tradable token. Accumulating rjoe is like gaining a ticket and percentage allocation into new project launches at a ratio of 100 rjoe : 1 avax
4. Airdrops - By providing liquidity in a LP, protocols can promise airdrops of tokens / nfts for the LPs at the time the snapshot was taken.
5. NFTs giveaways - Similar to airdrops, saw an example of this for a new protocol launch giving away blue-chip NFTs like coolcats.
