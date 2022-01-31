// SPDX-License-Identifier: MIT
pragma solidity >=0.4.22 <0.9.0;

import "@openzeppelin/contracts/utils/Counters.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/utils/Strings.sol";
import "./ContentMixin.sol";
import "./CrossChain.sol";
import "./IBaseURIUpdateable.sol";
import "./FxBaseChildTunnel.sol";

contract ChildCreatureERC721 is
  ERC721URIStorage,
  ContextMixin,
  AccessControl,
  IBaseURIUpdateable,
  FxBaseChildTunnel
{
  using Counters for Counters.Counter;
  Counters.Counter private m_tokenIds;

  mapping(uint256 => bool) public m_withdrawnTokens;
  // limit batching of tokens due to gas limit restrictions
  uint256 public constant BATCH_LIMIT = 20;

  bytes private m_baseURI;
  address private m_preApprovedProxyAddress;
  uint256 private m_mintCost;
  uint256 private m_maxTokens;

  bool private m_isWhitelisteSaleOpen;
  bool private m_isPublicSaleOpen;

  bytes32 public constant ROLE_DEPOSITOR = keccak256("ROLE_DEPOSITOR");
  bytes32 public constant ROLE_WHITELIST = keccak256("ROLE_WHITELIST");
  bytes32 public constant ROLE_REVEALER = keccak256("ROLE_REVEALER");

  event WithdrawnBatch(address indexed user, uint256[] tokenIds);
  event TransferWithMetadata(
    address indexed from,
    address indexed to,
    uint256 indexed tokenId,
    bytes metaData
  );

  constructor() ERC721("Creature", "CRNFT") {
    m_isWhitelisteSaleOpen = false;
    m_isPublicSaleOpen = false;
    _grantRole(DEFAULT_ADMIN_ROLE, _msgSender());
    _setRoleAdmin(ROLE_WHITELIST, ROLE_ADMIN);
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

  function setIsWhitelisteSaleOpen(bool _isWhitelisteSaleOpen)
    public
    onlyRole(ROLE_ADMIN)
  {
    m_isWhitelisteSaleOpen = _isWhitelisteSaleOpen;
  }

  function setIsPublicSaleOpen(bool _isPublicSaleOpen)
    public
    onlyRole(ROLE_ADMIN)
  {
    m_isPublicSaleOpen = _isPublicSaleOpen;
  }

  function addWhitelister(address[] memory _whitelisters)
    public
    onlyRole(ROLE_ADMIN)
  {
    for (uint256 i = 0; i < _whitelisters.length; i++) {
      _grantRole(ROLE_WHITELIST, _whitelisters[i]);
    }
  }

  function mintCost() public view returns (uint256) {
    return m_mintCost;
  }

  function setMintCost(uint256 cost) public onlyRole(ROLE_ADMIN) {
    m_mintCost = cost;
  }

  function maxTokens() public view returns (uint256) {
    return m_maxTokens;
  }

  function setMaxTokens(uint256 _maxTokens) public onlyRole(ROLE_ADMIN) {
    m_maxTokens = _maxTokens;
  }

  function _baseURI() internal view override returns (string memory) {
    return
      string(abi.encodePacked("ipfs://", CrossChain.toBase58(m_baseURI), "/"));
  }

  function setBaseURI(bytes memory _baseURIBytes)
    public
    override
    onlyRole(ROLE_REVEALER)
  {
    m_baseURI = _baseURIBytes;
    emit BaseURIUpdated(_baseURIBytes);
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

  function mint(address to) public payable returns (uint256) {
    m_tokenIds.increment();
    uint256 newItemId = m_tokenIds.current();
    require(
      !m_withdrawnTokens[newItemId],
      "ChildCreatureERC721: TOKEN_EXISTS_ON_ROOT_CHAIN"
    );
    //require payment greater than mint cost
    require(msg.value >= mintCost(), "Insufficient payment");
    _mint(to, newItemId);
    _setTokenURI(newItemId, Strings.toString(newItemId));
    return newItemId;
  }

  /**
   * @notice called when token is deposited on root chain
   * @dev Should be callable only by ChildChainManager
   * Should handle deposit by minting the required tokenId(s) for user
   * Should set `withdrawnTokens` mapping to `false` for the tokenId being deposited
   * Minting can also be done by other functions
   * @param user user address for whom deposit is being done
   * @param depositData abi encoded tokenIds. Batch deposit also supported.
   */
  function deposit(address user, bytes calldata depositData)
    external
    onlyRole(ROLE_DEPOSITOR)
  {
    // deposit single
    if (depositData.length == 32) {
      uint256 tokenId = abi.decode(depositData, (uint256));
      m_withdrawnTokens[tokenId] = false;
      _mint(user, tokenId);

      // deposit batch
    } else {
      uint256[] memory tokenIds = abi.decode(depositData, (uint256[]));
      uint256 length = tokenIds.length;
      for (uint256 i; i < length; i++) {
        m_withdrawnTokens[tokenIds[i]] = false;
        _mint(user, tokenIds[i]);
      }
    }
  }

  /**
   * @notice called when user wants to withdraw token back to root chain
   * @dev Should handle withraw by burning user's token.
   * Should set `withdrawnTokens` mapping to `true` for the tokenId being withdrawn
   * This transaction will be verified when exiting on root chain
   * @param tokenId tokenId to withdraw
   */
  function withdraw(uint256 tokenId) external {
    require(
      _msgSender() == ownerOf(tokenId),
      "ChildMintableERC721: INVALID_TOKEN_OWNER"
    );
    m_withdrawnTokens[tokenId] = true;
    _burn(tokenId);
  }

  /**
   * @notice called when user wants to withdraw multiple tokens back to root chain
   * @dev Should burn user's tokens. This transaction will be verified when exiting on root chain
   * @param tokenIds tokenId list to withdraw
   */
  function withdrawBatch(uint256[] calldata tokenIds) external {
    uint256 length = tokenIds.length;
    require(length <= BATCH_LIMIT, "CreatureERC721: EXCEEDS_BATCH_LIMIT");

    // Iteratively burn ERC721 tokens, for performing
    // batch withdraw
    for (uint256 i; i < length; i++) {
      uint256 tokenId = tokenIds[i];

      require(
        _msgSender() == ownerOf(tokenId),
        string(
          abi.encodePacked("ChildMintableERC721: INVALID_TOKEN_OWNER ", tokenId)
        )
      );
      m_withdrawnTokens[tokenId] = true;
      _burn(tokenId);
    }

    // At last emit this event, which will be used
    // in MintableERC721 predicate contract on L1
    // while verifying burn proof
    emit WithdrawnBatch(_msgSender(), tokenIds);
  }

  /**
   * @notice called when user wants to withdraw token back to root chain with token URI
   * @dev Should handle withraw by burning user's token.
   * Should set `withdrawnTokens` mapping to `true` for the tokenId being withdrawn
   * This transaction will be verified when exiting on root chain
   *
   * @param tokenId tokenId to withdraw
   */
  function withdrawWithMetadata(uint256 tokenId) external {
    require(
      _msgSender() == ownerOf(tokenId),
      "ChildMintableERC721: INVALID_TOKEN_OWNER"
    );
    m_withdrawnTokens[tokenId] = true;

    // Encoding metadata associated with tokenId & emitting event
    emit TransferWithMetadata(
      ownerOf(tokenId),
      address(0),
      tokenId,
      this.encodeTokenMetadata(tokenId)
    );

    _burn(tokenId);
  }

  /**
   * @notice This method is supposed to be called by client when withdrawing token with metadata
   * and pass return value of this function as second paramter of `withdrawWithMetadata` method
   *
   * It can be overridden by clients to encode data in a different form, which needs to
   * be decoded back by them correctly during exiting
   *
   * @param tokenId Token for which URI to be fetched
   */
  function encodeTokenMetadata(uint256 tokenId)
    external
    view
    virtual
    returns (bytes memory)
  {
    // You're always free to change this default implementation
    // and pack more data in byte array which can be decoded back
    // in L1
    return abi.encode(tokenURI(tokenId));
  }

  function tokenCount() public view returns (uint256) {
    return m_tokenIds.current();
  }

  /**
   * @notice Process message received from Root Tunnel
   * @dev function needs to be implemented to handle message as per requirement
   * This is called by onStateReceive function.
   * Since it is called via a system call, any event will not be emitted during its execution.
   * @param stateId unique state id
   * @param sender root message sender
   * @param message bytes message that was sent from Root Tunnel
   */
  function _processMessageFromRoot(
    uint256 stateId,
    address sender,
    bytes memory message
  ) internal override {
    // No need to process message from root
  }
}
