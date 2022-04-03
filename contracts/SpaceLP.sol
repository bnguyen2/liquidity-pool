//SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "./SpaceLib.sol";

contract SpaceLP is ERC20 {
    uint256 private constant MINIMUM_LIQUIDITY = 1000;
    address public immutable spaceToken;
    uint256 private spceReserve;
    uint256 private ethReserve;

    event AddedLiquidity(address indexed sender, uint256 ethAmount, uint256 spceAmount);
    event RemovedLiquidity(address indexed sender, uint256 ethAmount, uint256 spceAmount, address indexed to);
    event SwapEthForSpace(address indexed sender, uint256 ethAmountIn, uint256 spceAmountOut, address indexed to);
    event SwapSpaceForEth(address indexed sender, uint256 spceAmountIn, uint256 ethAmountOut, address indexed to);

    constructor(address _spaceToken) ERC20("Space LP", "SLP") {
        spaceToken = _spaceToken;
    }

    uint8 private constant NOT_ENTERED = 1;
    uint8 private constant ENTERED = 2;
    uint8 private enteredState = 1;
    modifier nonReentrant() {
        require(enteredState == NOT_ENTERED, "no reentrant");
        enteredState = ENTERED;
        _;
        enteredState = NOT_ENTERED;
    }

    function swapEthForSpce(address _to) external payable nonReentrant returns (uint256 spceAmountOut) {
        (uint256 _ethReserve, uint256 _spceReserve) = getReserves();
        require(_ethReserve > 0 && _spceReserve > 0, "insufficient liquidity");

        uint256 amountEthIn = address(this).balance - _ethReserve;
        require(amountEthIn > 0, "insufficient input amount");

        spceAmountOut = getAmountOut(amountEthIn, ethReserve, spceReserve); // eth in, spce out

        IERC20(spaceToken).transfer(_to, spceAmountOut);

        // sync reserves
        sync();
        emit SwapEthForSpace(msg.sender, amountEthIn, spceAmountOut, _to);
    }

    function swapSpceForEth(address _to) external nonReentrant returns (uint256 ethAmountOut) {
        (uint256 _ethReserve, uint256 _spceReserve) = getReserves();
        require(_ethReserve > 0 && _spceReserve > 0, "insufficient liquidity");

        uint256 amountSpceIn = IERC20(spaceToken).balanceOf(address(this)) - _spceReserve;
        require(amountSpceIn > 0, "insufficient input amount");

        ethAmountOut = getAmountOut(amountSpceIn, spceReserve, ethReserve); // spce in, eth out

        (bool success, ) = payable(_to).call{value: ethAmountOut}("");
        require(success, "failed to transfer eth");

        // sync reserves
        sync();
        emit SwapSpaceForEth(msg.sender, amountSpceIn, ethAmountOut, _to);
    }

    function addLiquidity(address _to) external nonReentrant returns (uint256 lpTokenToMint) {
        (uint256 _ethReserve, uint256 _spceReserve) = getReserves();
        uint256 currentEthBal = address(this).balance;
        uint256 currentSpceBal = IERC20(spaceToken).balanceOf(address(this));
        uint256 ethNew = currentEthBal - _ethReserve;
        uint256 spceNew = currentSpceBal - _spceReserve;

        if (totalSupply() == 0) {
            lpTokenToMint = SpaceLib.sqrt(ethNew * spceNew) - MINIMUM_LIQUIDITY;
            _mint(address(69_420), MINIMUM_LIQUIDITY);
        } else {
            lpTokenToMint = SpaceLib.min(
                (ethNew * totalSupply()) / _ethReserve,
                (spceNew * totalSupply()) / _spceReserve
            );
        }
        require(lpTokenToMint > 0, "lp tokens cannot be less then 0");
        _mint(_to, lpTokenToMint);
        // sync reserves
        sync();
        emit AddedLiquidity(msg.sender, ethNew, spceNew);
    }

    function removeLiquidity(address _to) external nonReentrant returns (uint256 ethRefund, uint256 spceRefund) {
        uint256 currentEthBal = address(this).balance;
        uint256 currentSpceBal = IERC20(spaceToken).balanceOf(address(this));
        uint256 lpTokensToBurn = balanceOf(address(this));

        ethRefund = (lpTokensToBurn * currentEthBal) / totalSupply();
        spceRefund = (lpTokensToBurn * currentSpceBal) / totalSupply();

        require(ethRefund > 0 && spceRefund > 0, "insufficient lp tokens");
        // burn lp tokens
        _burn(address(this), lpTokensToBurn);

        // send back eth and spce
        IERC20(spaceToken).transfer(_to, spceRefund);
        (bool success, ) = payable(_to).call{value: ethRefund}("");
        require(success, "failed to send eth");

        // sync reserves
        sync();
        emit RemovedLiquidity(msg.sender, ethRefund, spceRefund, _to);
    }

    function getAmountOut(
        uint256 _tokenIn,
        uint256 _reserveIn,
        uint256 _reserveOut
    ) public pure returns (uint256 tokenAmountOut) {
        require(_tokenIn > 0, "invalid token amount in");
        require(_reserveIn > 0 && _reserveOut > 0, "insufficient liquidity");
        // x * y = k
        // y = k / (x + x_in - (x_in * fee%))

        uint256 tokenFees = ((_tokenIn * 1) / 100);
        uint256 numerator = _reserveIn * _reserveOut;
        uint256 denominator = (_reserveIn + _tokenIn) - tokenFees;
        tokenAmountOut = _reserveOut - (numerator / denominator);
    }

    function getReserves() public view returns (uint256, uint256) {
        return (ethReserve, spceReserve);
    }

    function sync() public {
        ethReserve = address(this).balance;
        spceReserve = IERC20(spaceToken).balanceOf(address(this));
    }

    receive() external payable {}
}
