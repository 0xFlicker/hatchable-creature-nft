// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/AccessControl.sol";

// IFxMessageProcessor represents interface to process message
interface IFxMessageProcessor {
  function processMessageFromRoot(
    uint256 stateId,
    address rootMessageSender,
    bytes calldata data
  ) external;
}

/**
 * @notice Mock child tunnel contract to receive and send message from L2
 */
abstract contract FxBaseChildTunnel is IFxMessageProcessor, AccessControl {
  bytes32 public constant ROLE_ROOT_TUNNEL = keccak256("ROLE_ROOT_TUNNEL");
  bytes32 public constant ROLE_ADMIN = keccak256("ROLE_ADMIN");

  // MessageTunnel on L1 will get data from this event
  event MessageSent(bytes message);

  // fx child
  address public m_fxChild;

  // fx root tunnel
  address public m_fxRootTunnel;

  constructor() {
    _grantRole(ROLE_ADMIN, _msgSender());
    _setRoleAdmin(ROLE_ROOT_TUNNEL, ROLE_ADMIN);
  }

  // set fxRootTunnel if not set already
  function setFxRootTunnel(address _fxRootTunnel)
    external
    virtual
    onlyRole(ROLE_ADMIN)
  {
    m_fxRootTunnel = _fxRootTunnel;
  }

  function processMessageFromRoot(
    uint256 stateId,
    address rootMessageSender,
    bytes calldata data
  ) external override onlyRole(ROLE_ROOT_TUNNEL) {
    _processMessageFromRoot(stateId, rootMessageSender, data);
  }

  /**
   * @notice Emit message that can be received on Root Tunnel
   * @dev Call the internal function when need to emit message
   * @param message bytes message that will be sent to Root Tunnel
   * some message examples -
   *   abi.encode(tokenId);
   *   abi.encode(tokenId, tokenMetadata);
   *   abi.encode(messageType, messageData);
   */
  function _sendMessageToRoot(bytes memory message) internal {
    emit MessageSent(message);
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
  ) internal virtual;
}
