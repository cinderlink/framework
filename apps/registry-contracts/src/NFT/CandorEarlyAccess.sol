// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Burnable.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import "@openzeppelin/contracts/utils/Counters.sol";

/// @custom:security-contact security@cinderlink.com
contract CandorEarlyAccess is ERC721, Pausable, Ownable, ERC721Burnable, ERC721Enumerable {
    using Counters for Counters.Counter;
    uint256 public constant maxSupply = 1000;
    mapping(address => uint256) tokens;

    Counters.Counter private _tokenIdCounter;

    constructor() ERC721("CandorEarlyAccess", "CEA") {}

    function _baseURI() internal pure override returns (string memory) {
        return "https://nft.candor.social/early-access/1";
    }

    function pause() public onlyOwner {
        _pause();
    }

    function unpause() public onlyOwner {
        _unpause();
    }

    function addressHasToken(address target) public view returns (bool) {
        return (tokens[target] != 0);
    }

    function mint(address to) public payable returns (uint256) {
        require(msg.value >= 0.01 ether, "insufficient payment");
        require (totalSupply() < maxSupply);
        require(tokens[to] == 0, "address already has token");
        uint256 tokenId = _tokenIdCounter.current();
        _tokenIdCounter.increment();
        _safeMint(to, tokenId);
        return tokenId;
    }

    function safeMint(address to) public onlyOwner returns (uint256) {
        require (totalSupply() < maxSupply);
        require(tokens[to] == 0, "address already has token");
        uint256 tokenId = _tokenIdCounter.current();
        _tokenIdCounter.increment();
        _safeMint(to, tokenId);
        return tokenId;
    }

    function treasuryBalance() public view returns (uint256) {
        return address(this).balance;
    }

    function withdraw(address payable _recipient) public onlyOwner returns (uint256) {
        uint balance = address(this).balance;
        _recipient.transfer(balance - .005 ether);
        return balance;
    }

    function _beforeTokenTransfer(address from, address to, uint256 tokenId, uint256 batchSize)
        internal
        whenNotPaused
        override(ERC721, ERC721Enumerable)
    {
        super._beforeTokenTransfer(from, to, tokenId, batchSize);
    }

    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC721, ERC721Enumerable)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }
}