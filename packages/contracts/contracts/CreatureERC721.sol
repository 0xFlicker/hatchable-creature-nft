// SPDX-License-Identifier: MIT
pragma solidity >=0.4.22 <0.9.0;
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
import "@openzeppelin/contracts/utils/Strings.sol";
import "./Managed.sol";

/**
 * https://github.com/maticnetwork/pos-portal/blob/master/contracts/common/ContextMixin.sol
 */
abstract contract ContextMixin {
  function msgSender() internal view returns (address payable sender) {
    if (msg.sender == address(this)) {
      bytes memory array = msg.data;
      uint256 index = msg.data.length;
      assembly {
        // Load the 32 bytes word from memory with the address on the lower 20 bytes, and mask those.
        sender := and(
          mload(add(array, index)),
          0xffffffffffffffffffffffffffffffffffffffff
        )
      }
    } else {
      sender = payable(msg.sender);
    }
    return sender;
  }
}

contract CreatureERC721 is ERC721URIStorage, ContextMixin, Ownable, Managed {
  using Counters for Counters.Counter;
  Counters.Counter private _tokenIds;
  string private m_baseURI;
  address private m_preApprovedProxyAddress;
  uint256 private m_mintCost;
  uint256 private m_maxTokens;

  constructor(
    string memory _baseUri,
    address _preApprovedProxyAddress,
    address _lifecycleManagerAddress,
    uint256 _mintCost,
    uint256 _maxTokens
  ) ERC721("Creature", "CRNFT") Managed(_lifecycleManagerAddress) {
    m_baseURI = _baseUri;
    m_preApprovedProxyAddress = _preApprovedProxyAddress;
    m_mintCost = _mintCost;
    m_maxTokens = _maxTokens;
  }

  function _baseURI() internal view virtual override returns (string memory) {
    return m_baseURI;
  }

  function mintCost() public view returns (uint256) {
    return m_mintCost;
  }

  function setMintCost(uint256 cost) public onlyOwner {
    m_mintCost = cost;
  }

  function tokenCount() public view returns (uint256) {
    return _tokenIds.current();
  }

  function maxTokens() public view returns (uint256) {
    return m_maxTokens;
  }

  function setMaxTokens(uint256 _maxTokens) public onlyOwner {
    m_maxTokens = _maxTokens;
  }

  function mint(address to) public payable returns (uint256) {
    //require payment greater than mint cost
    require(msg.value >= mintCost(), "Insufficient payment");
    // send value to owner, anything over mintCost is a donation
    (bool success, ) = owner().call{ value: msg.value }("");
    require(success);

    _tokenIds.increment();
    uint256 newItemId = _tokenIds.current();
    _mint(to, newItemId);
    _setTokenURI(newItemId, Strings.toString(newItemId));
    return newItemId;
  }

  function hatch(uint256 tokenId, string memory _tokenURI) public onlyManager {
    require(tokenId != 0, "Token ID must be non-zero");
    _setTokenURI(tokenId, _tokenURI);
  }

  function batchHatch(uint256[] memory tokenIds, string[] memory tokenUris)
    public
    onlyManager
  {
    require(
      tokenIds.length == tokenUris.length,
      "Token ID and URI arrays must be the same length"
    );
    for (uint256 i = 0; i < tokenIds.length; i++) {
      _setTokenURI(tokenIds[i], tokenUris[i]);
    }
  }

  /**
   * Override isApprovedForAll to auto-approve OS's proxy contract
   */
  function isApprovedForAll(address _owner, address _operator)
    public
    view
    override
    returns (bool isOperator)
  {
    // if OpenSea's ERC721 Proxy Address is detected, auto-return true
    // polygon mainnet: address(0x58807baD0B376efc12F5AD86aAc70E78ed67deaE)
    if (_operator == m_preApprovedProxyAddress) {
      return true;
    }

    // otherwise, use the default ERC721.isApprovedForAll()
    return ERC721.isApprovedForAll(_owner, _operator);
  }

  // This is used instead of msg.sender as transactions won't be sent by the original token owner, but by OpenSea
  function _msgSender() internal view override returns (address sender) {
    return ContextMixin.msgSender();
  }
}
