//SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import "./SpaceCoin.sol";

contract ICO {
    enum Stage {
        seed,
        general,
        open
    }

    event IsActive(bool active);
    event BuyToken(address indexed buyer, uint256 value);
    event ClaimToken(address indexed claimer, uint256 value);
    event CurrentStage(uint8 stage);

    SpaceCoin public spaceCoin;

    uint256 private constant MAX_FUNDING = 30000 ether;
    uint256 private constant RATE = 5;

    address public owner;
    uint256 public totalRaised;
    uint256 public availableFundsToWithdraw;
    bool public isICOActive = true;
    mapping(address => bool) public whitelist;
    mapping(address => uint256) public contributions;
    mapping(address => uint256) public spaceTokenClaim;

    Stage public stage;

    constructor(
        address _owner,
        address _token,
        address[] memory _whitelist
    ) {
        owner = _owner;
        spaceCoin = SpaceCoin(_token);
        addToWhitelist(_whitelist);
    }

    modifier onlyOwner() {
        require(msg.sender == owner, "Ownable: caller is not the owner");
        _;
    }

    function withdrawFunds() public onlyOwner {
        uint256 amountToWithdraw = availableFundsToWithdraw;
        require(amountToWithdraw > 0, "No funds to withdraw");
        availableFundsToWithdraw = 0;
        (bool success, ) = msg.sender.call{value: amountToWithdraw}("");
        require(success, "withdrawal failed");
    }

    function investorLimit() private view returns (uint256) {
        if (stage == Stage.seed) return 1500 ether;
        else if (stage == Stage.general) return 1000 ether;
        else return 30000 ether;
    }

    function icoStageLimit() private view returns (uint256) {
        if (stage == Stage.seed) return 15000 ether;
        else return 30000 ether;
    }

    function buyTokens() external payable {
        require(isICOActive, "ICO is not active");
        require(isWhitelisted(msg.sender) || stage != Stage.seed, "not whitelisted");
        require(investorLimit() >= contributions[msg.sender] + msg.value, "over contribution limit");
        require(icoStageLimit() >= totalRaised + msg.value, "over funding limit");
        contributions[msg.sender] += msg.value;
        spaceTokenClaim[msg.sender] += msg.value * RATE;
        totalRaised += msg.value;
        availableFundsToWithdraw += msg.value;
        emit BuyToken(msg.sender, msg.value);
    }

    function claimToken() external {
        require(stage == Stage.open, "claimable only on open stage");
        uint256 amount = spaceTokenClaim[msg.sender];
        require(amount > 0, "no tokens to claim");
        spaceTokenClaim[msg.sender] = 0;
        spaceCoin.transfer(msg.sender, amount);
        emit ClaimToken(msg.sender, amount);
    }

    function toggleFundingState() external onlyOwner {
        isICOActive = !isICOActive;
        emit IsActive(isICOActive);
    }

    function addToWhitelist(address[] memory _addr) public onlyOwner {
        for (uint256 i = 0; i < _addr.length; i++) {
            whitelist[_addr[i]] = true;
        }
    }

    function isWhitelisted(address _addr) public view returns (bool) {
        return whitelist[_addr];
    }

    function advanceStage(uint8 _stage) external onlyOwner {
        require(stage != Stage.open, "Last stage reached");
        stage = Stage(_stage);
        emit CurrentStage(_stage);
    }
}
