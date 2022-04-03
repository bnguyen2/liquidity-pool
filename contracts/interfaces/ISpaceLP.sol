//SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

interface ISpaceLP {
    function getReserves() external view returns (uint256, uint256);

    function swapEthForSpce(address _to) external returns (uint256);

    function swapSpceForEth(address _to) external returns (uint256);

    function addLiquidity(address _to) external returns (uint256 lpTokenToMint);

    function removeLiquidity(address _to) external returns (uint256 ethRefund, uint256 spceRefund);

    function transferFrom(
        address from,
        address to,
        uint256 value
    ) external returns (bool);
}
