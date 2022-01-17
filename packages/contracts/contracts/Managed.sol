// SPDX-License-Identifier: MIT
pragma solidity >=0.4.22 <0.9.0;
import "@openzeppelin/contracts/access/Ownable.sol";

abstract contract Managed is Ownable {
  address private m_managerAddress;

  constructor(address _managerAddress) {
    m_managerAddress = _managerAddress;
  }

  function setManager(address _managerAddress) public onlyOwner {
    m_managerAddress = _managerAddress;
  }

  function manager() public view returns (address) {
    return m_managerAddress;
  }

  modifier onlyManager() {
    require(
      msg.sender == m_managerAddress,
      "Only manager can call this function"
    );
    _;
  }
}
