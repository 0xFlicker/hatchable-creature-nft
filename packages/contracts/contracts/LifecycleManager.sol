// SPDX-License-Identifier: MIT
pragma solidity >=0.4.22 <0.9.0;
import "@openzeppelin/contracts/access/Ownable.sol";
import "./CreatureERC721.sol";

contract LifecycleManager is Ownable {
  CreatureERC721 private m_managedContract;
  uint256 private m_lastTokenIdUpdated;

  constructor(address _managedContract) {
    m_managedContract = CreatureERC721(_managedContract);
    m_lastTokenIdUpdated = 0;
  }

  function managedContract() public view returns (CreatureERC721) {
    return m_managedContract;
  }

  function setManagedContract(address _managedContract) public onlyOwner {
    m_managedContract = CreatureERC721(_managedContract);
  }

  function lastTokenIdUpdated() public view returns (uint256) {
    return m_lastTokenIdUpdated;
  }

  function updateMetadata(string calldata _baseUri, uint256 _includesTokenId)
    public
    onlyOwner
  {
    m_managedContract.setBaseURI(_baseUri);
    m_lastTokenIdUpdated = _includesTokenId;
  }
}
