// SPDX-License-Identifier: MIT
pragma solidity >=0.4.22 <0.9.0;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "./ContentMixin.sol";
import "./IMintableERC721.sol";
import "./CrossChain.sol";
import "./FxBaseRootTunnel.sol";

contract ParentCreatureERC721 is
  ERC721URIStorage,
  IMintableERC721,
  ContextMixin,
  AccessControl,
  FxBaseRootTunnel
{
  using Counters for Counters.Counter;

  Counters.Counter private m_tokenIds;
  uint256 private m_tokenCount;
  bytes private m_baseURI;
  address private m_preApprovedProxyAddress;

  bytes32 public constant ROLE_PREDICATE = keccak256("ROLE_PREDICATE");
  bytes32 public constant ROLE_REVEALER = keccak256("ROLE_REVEALER");

  mapping(uint256 => bool) public m_withdrawnTokens;
  // limit batching of tokens due to gas limit restrictions
  uint256 public constant BATCH_LIMIT = 20;

  event WithdrawnBatch(address indexed user, uint256[] tokenIds);

  constructor(address mintablePredicate, address checkpointManager)
    ERC721("Creature", "CRNFT")
  {
    _grantRole(DEFAULT_ADMIN_ROLE, _msgSender());
    _grantRole(ROLE_ADMIN, _msgSender());
    _grantRole(ROLE_PREDICATE, mintablePredicate);
    setCheckpointManager(checkpointManager);
  }

  function supportsInterface(bytes4 interfaceId)
    public
    view
    virtual
    override(ERC721, AccessControl)
    returns (bool)
  {
    return super.supportsInterface(interfaceId);
  }

  function _mintAndSetUri(address user, uint256 tokenId) internal {
    _mint(user, tokenId);
    _setTokenURI(tokenId, Strings.toString(tokenId));
  }

  /**
   * @dev See {IMintableERC721-mint}.
   */
  function mint(address user, uint256 tokenId)
    external
    override
    onlyRole(ROLE_PREDICATE)
  {
    _mintAndSetUri(user, tokenId);
    if (tokenId > m_tokenCount) {
      m_tokenCount = tokenId;
    }
  }

  /**
   * @notice called by predicate contract to mint tokens while withdrawing with metadata from L2
   * @dev Should be callable only by MintableERC721Predicate
   * Make sure minting is only done either by this function/ 👆
   * @param user user address for whom token is being minted
   * @param tokenId tokenId being minted
   * @param incomingMetadata Associated token metadata, to be decoded & set using `setTokenMetadata`
   *
   * Note : If you're interested in taking token metadata from L2 to L1 during exit, you must
   * implement this method
   */
  function mint(
    address user,
    uint256 tokenId,
    bytes calldata incomingMetadata
  ) public override onlyRole(ROLE_PREDICATE) {
    _mintAndSetUri(user, tokenId);
    (uint256 tokenCountUnpacked, bytes memory baseURIUnpacked) = CrossChain
      .unpack(incomingMetadata);
    _setTokenCount(tokenCountUnpacked);
    m_baseURI = baseURIUnpacked;
  }

  /**
   * @dev See {IMintableERC721-exists}.
   */
  function exists(uint256 tokenId) external view override returns (bool) {
    return _exists(tokenId);
  }

  function _setTokenCount(uint256 _tokenCount) internal {
    m_tokenCount = _tokenCount;
  }

  function tokenCount() public view returns (uint256) {
    return m_tokenCount;
  }

  function _baseURI() internal view override returns (string memory) {
    return
      string(abi.encodePacked("ipfs://", CrossChain.toBase58(m_baseURI), "/"));
  }

  function setBaseURI(bytes memory _baseUri) public onlyRole(ROLE_REVEALER) {
    m_baseURI = _baseUri;
  }

  function setPreApprovedProxy(address _preApprovedProxyAddress)
    public
    onlyRole(ROLE_ADMIN)
  {
    m_preApprovedProxyAddress = _preApprovedProxyAddress;
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

  /**
   * @notice Process message received from Child Tunnel
   * @dev function needs to be implemented to handle message as per requirement
   * This is called by onStateReceive function.
   * Since it is called via a system call, any event will not be emitted during its execution.
   * @param message bytes message that was sent from Child Tunnel
   */
  function _processMessageFromChild(bytes memory message) internal override {
    (uint256 tokenCountUnpacked, bytes memory baseURIUnpacked) = CrossChain
      .unpackMemory(message);
    _setTokenCount(tokenCountUnpacked);
    m_baseURI = baseURIUnpacked;
  }
}
