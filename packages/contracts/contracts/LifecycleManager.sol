// SPDX-License-Identifier: MIT
pragma solidity >=0.4.22 <0.9.0;
import "@openzeppelin/contracts/access/Ownable.sol";
import "./CreatureERC721.sol";

contract LifecycleManager is Ownable {
  CreatureERC721 private m_managedContract;

  constructor(address _managedContract) {
    m_managedContract = CreatureERC721(_managedContract);
  }

  function managedContract() public view returns (CreatureERC721) {
    return m_managedContract;
  }

  function setManagedContract(address _managedContract) public onlyOwner {
    m_managedContract = CreatureERC721(_managedContract);
  }

  function hatch(uint256 tokenId, string calldata tokenUri) public onlyOwner {
    m_managedContract.hatch(tokenId, tokenUri);
  }

  function batchHatch(uint256[] calldata tokenIds, string[] calldata tokenUris)
    public
    onlyOwner
  {
    m_managedContract.batchHatch(tokenIds, tokenUris);
  }
}
