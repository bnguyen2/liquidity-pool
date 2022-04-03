//SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "./SpaceLib.sol";
import "./interfaces/ISpaceLP.sol";

contract SpaceRouter {
    address public immutable spaceToken;
    address public immutable spaceLP;

    constructor(address _spaceToken, address _spaceLP) {
        spaceToken = _spaceToken;
        spaceLP = _spaceLP;
    }

    /**
     * @dev Adds liquidity to LP pool
     * @param _to address that will receive SLP token
     * @param _amountSpce amount of space tokens to add to LP pool
     * Also requires users to input amount of eth
     */
    function addLiquidity(
        address _to,
        uint256 _amountSpce,
        uint256 _amountSpceMin,
        uint256 _amountEthMin
    )
        external
        payable
        returns (
            uint256 ethAdded,
            uint256 spceAdded,
            uint256 lpTokenToMint
        )
    {
        ethAdded = msg.value;
        (ethAdded, spceAdded) = _getLiquidity(ethAdded, _amountSpce, _amountEthMin, _amountSpceMin);

        require(_amountSpce > 0 && ethAdded > 0, "insufficient liquidity added");

        bool spaceTransfer = IERC20(spaceToken).transferFrom(msg.sender, spaceLP, _amountSpce);
        require(spaceTransfer, "failed to transfer spce");

        (bool success, ) = payable(spaceLP).call{value: ethAdded}("");
        require(success, "failed to transfer eth");

        lpTokenToMint = ISpaceLP(spaceLP).addLiquidity(_to);
        return (ethAdded, _amountSpce, lpTokenToMint);
    }

    /**
     * @dev Removes liquidity from LP
     * @param _to burning SLP from this user's address
     * @param _lpTokens amount of lp tokens to burn
     * @param _ethMin minimum eth amounts to be received, specify 0 if you don't care about slippage
     * @param _spceMin minimum spce amounts to be received, specify 0 if you don't care about slippage
     */
    function removeLiquidity(
        address _to,
        uint256 _lpTokens,
        uint256 _ethMin,
        uint256 _spceMin
    ) external returns (uint256, uint256) {
        bool success = ISpaceLP(spaceLP).transferFrom(msg.sender, spaceLP, _lpTokens);
        require(success, "failed to transfer lp tokens");
        (uint256 ethRefund, uint256 spceRefund) = ISpaceLP(spaceLP).removeLiquidity(_to);
        require(ethRefund >= _ethMin, "failed due to slippage: eth");
        require(spceRefund >= _spceMin, "failed due to slippage: spce");
        return (ethRefund, spceRefund);
    }

    /**
     * @dev allows trader to specify exact number of spce tokens and minimum number of eth token
     * they're willing to receive, if slippage is above amountOutMin will revert
     * @param _to address receiving eth
     * @param _spceIn amount of spce tokens trader willing to swap
     * @param _ethMin minimum eth amounts to be received, specify 0 if you don't care about slippage
     */
    function swapSpceForEth(
        address _to,
        uint256 _spceIn,
        uint256 _ethMin
    ) external returns (uint256 ethAmountOut) {
        require(_spceIn > 0, "invalid amount");

        // transfer SPCE amount to LP
        bool success = IERC20(spaceToken).transferFrom(msg.sender, spaceLP, _spceIn);
        require(success, "failed to transfer spce");

        ethAmountOut = ISpaceLP(spaceLP).swapSpceForEth(_to);
        require(ethAmountOut >= _ethMin, "failed due to slippage");
        return ethAmountOut;
    }

    /**
     * @dev allows trader to specify exact number of eth tokens and minimum number of spce token
     * they're willing to receive, if slippage is above amountOutMin will revert
     */
    function swapEthForSpce(address _to, uint256 _spceMin) external payable returns (uint256 spceAmountOut) {
        require(msg.value > 0, "invalid amount");

        // transfer eth amount to LP
        (bool success, ) = payable(spaceLP).call{value: msg.value}("");
        require(success, "failed to transfer eth");

        // execute swap function from LP
        spceAmountOut = ISpaceLP(spaceLP).swapEthForSpce(_to);
        require(spceAmountOut >= _spceMin, "failed due to slippage");

        return spceAmountOut;
    }

    function _getLiquidity(
        uint256 _amountEthDesired,
        uint256 _amountSpceDesired,
        uint256 _amountEthMin,
        uint256 _amountSpceMin
    ) internal view returns (uint256 _amountEth, uint256 _amountSpce) {
        (uint256 _ethReserve, uint256 _spceReserve) = ISpaceLP(spaceLP).getReserves();

        if (_ethReserve == 0 && _spceReserve == 0) {
            (_amountEth, _amountSpce) = (_amountEthDesired, _amountSpceDesired);
        } else {
            uint256 optimalSpceAmount = SpaceLib.quote(_amountEthDesired, _ethReserve, _spceReserve);
            if (optimalSpceAmount <= _amountSpceDesired) {
                require(optimalSpceAmount >= _amountSpceMin, "insufficient B amount");
                (_amountEth, _amountSpce) = (_amountEthDesired, optimalSpceAmount);
            } else {
                uint256 optimalEthAmount = SpaceLib.quote(_amountSpceDesired, _spceReserve, _ethReserve);
                assert(optimalEthAmount <= _amountEthDesired);
                require(optimalEthAmount >= _amountEthMin, "insufficient A amount");
                (_amountEth, _amountSpce) = (optimalEthAmount, _amountSpceDesired);
            }
        }
    }
}
