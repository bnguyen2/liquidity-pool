//SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

// Math taken from Uniswap

library SpaceLib {
    // babylonian method (https://en.wikipedia.org/wiki/Methods_of_computing_square_roots#Babylonian_method)
    function sqrt(uint256 y) internal pure returns (uint256 z) {
        if (y > 3) {
            z = y;
            uint256 x = y / 2 + 1;
            while (x < z) {
                z = x;
                x = (y / x + x) / 2;
            }
        } else if (y != 0) {
            z = 1;
        }
    }

    function min(uint256 x, uint256 y) internal pure returns (uint256 z) {
        z = x < y ? x : y;
    }

    function quote(
        uint256 amountA,
        uint256 reserveA,
        uint256 reserveB
    ) internal pure returns (uint256 amountB) {
        require(amountA > 0, "SPACE_LIB:insufficient amount");
        require(reserveA > 0 && reserveB > 0, "SPACE_LIB:insufficient liquidity");
        amountB = (amountA * reserveB) / reserveA;
    }
}
