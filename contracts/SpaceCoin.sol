//SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract SpaceCoin is ERC20 {
    address public owner;
    address payable public treasury;
    uint256 private constant TOTAL_SUPPLY = 500000 ether; // 500,000 total supply
    uint256 private constant TAX_FEE = 2; // 2% fee

    bool private takeFee;

    event TakeFee(bool _takeFee);

    constructor(address payable _treasury, address _owner) ERC20("SpaceCoin", "SPCE") {
        _mint(msg.sender, TOTAL_SUPPLY);
        treasury = _treasury;
        owner = _owner;
    }

    modifier onlyOwner() {
        require(msg.sender == owner, "Ownable: caller is not the owner");
        _;
    }

    /**
     * @dev See {IERC20-transfer}.
     *
     * Requirements:
     *
     * - `to` cannot be the zero address.
     * - the caller must have a balance of at least `amount`.
     * - a 2% tax fee is taken on transfers if `takeFee` is set to true.
     */
    function _transfer(
        address from,
        address to,
        uint256 amount
    ) internal virtual override {
        if (takeFee && to != treasury) {
            uint256 feeAmount = (amount * TAX_FEE) / 100;
            super._transfer(from, treasury, feeAmount);
            amount -= feeAmount;
        }
        super._transfer(from, to, amount);
    }

    function toggleTakeFee() external onlyOwner {
        takeFee = !takeFee;
        emit TakeFee(takeFee);
    }
}
