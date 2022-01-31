// SPDX-License-Identifier: MIT
pragma solidity >=0.4.22 <0.9.0;

abstract contract IBaseURIUpdateable {
  event BaseURIUpdated(bytes tokenURIBytes);

  function setBaseURI(bytes memory baseURIBytes) external virtual;
}
