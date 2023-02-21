// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";

contract CinderToken is ERC20, Ownable {
    using SafeMath for uint256;

    uint256 public circulatingSupply = 0;
    uint256 public constant MAX_SUPPLY = 1000000000000000000000000;

    // USDC (Optimism mainnet)
    address public mintTokenAddress = 0x7F5c764cBc14f9669B88837ca1490cCa17c31607;
    // 1 USDC = 1 CNDR
    uint256 public mintTokenMinAmount = 1000000;
    // minimum amount of 1 USDC
    uint256 public mintTokenConversion = 1;
    // mint token contract
    IERC20 public mintToken = IERC20(mintTokenAddress);
    uint256 public mintTokenBalance = 0;

    // 1 ETH = 1000 CNDR
    uint256 public baseTokenConversion = 1000;
    // minimum amount of 0.001 ETH
    uint256 public baseTokenMinAmount = 1000000000000000;
    uint256 public baseTokenBalance = 0;

    bool public mintTokenEnabled = true;
    bool public baseTokenEnabled = true;

    constructor() ERC20("Cinder", "CNDR") Ownable() {}

    function _supply(address _to, uint256 _amount) internal {
        require(circulatingSupply + _amount <= MAX_SUPPLY, "Cannot mint more than max supply");
        require(_amount > mintTokenMinAmount, "Mint amount too low");
        _mint(_to, _amount);
        circulatingSupply = circulatingSupply + _amount;
    }

    function mint(address _to, uint256 _amount) public {
        require(msg.sender == owner(), "Only owner can mint");
        _supply(_to, _amount);
    }

    function mint(uint256 _amount) public {
        require(mintTokenEnabled, "Minting is disabled");
        mintToken.transferFrom(msg.sender, address(this), _amount);
        _supply(msg.sender, _amount * mintTokenConversion);
    }

    function mint() public payable {
        require(baseTokenEnabled, "Minting is disabled");
        uint256 amount = msg.value * baseTokenConversion;
        _supply(msg.sender, amount);
    }

    function burn(uint256 _amount) public {
        _burn(msg.sender, _amount);
        circulatingSupply = circulatingSupply - _amount;
    }

    function updateMintToken(address _address, uint256 _min, uint256 _conversion) public {
        require(msg.sender == owner(), "Only owner can update the mint token");
        require(mintTokenBalance == 0, "Cannot update mint token while there is a balance");
        mintTokenAddress = _address;
        mintTokenMinAmount = _min;
        mintTokenConversion = _conversion;
        mintToken = IERC20(mintTokenAddress);
    }

    function updateMintToken(uint256 _min, uint256 _conversion) public {
        require(msg.sender == owner(), "Only owner can update the mint token");
        mintTokenMinAmount = _min;
        mintTokenConversion = _conversion;
    }
}
