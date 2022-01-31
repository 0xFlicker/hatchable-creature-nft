// SPDX-License-Identifier: MIT
pragma solidity >=0.4.22 <0.9.0;

import "solidity-bytes-utils/contracts/BytesLib.sol";

library CrossChain {
  using BytesLib for bytes;

  bytes constant ALPHABET =
    "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";

  function unpack(bytes calldata _metadata)
    internal
    pure
    returns (uint256, bytes memory)
  {
    uint256 tokenCount = abi.decode(_metadata[:32], (uint256));
    bytes memory baseUriBytes = _metadata[32:];
    return (tokenCount, baseUriBytes);
  }

  function unpackMemory(bytes memory _metadata)
    internal
    pure
    returns (uint256, bytes memory)
  {
    uint256 tokenCount = abi.decode(_metadata.slice(0, 32), (uint256));
    bytes memory baseUriBytes = _metadata.slice(32, 66);
    return (tokenCount, baseUriBytes);
  }

  function packer(uint256 _tokenCount, bytes memory _ipfsHash)
    internal
    pure
    returns (bytes memory)
  {
    bytes memory metadata = abi.encodePacked(_tokenCount, _ipfsHash);
    return metadata;
  }

  function toBase58(bytes memory source) internal pure returns (bytes memory) {
    if (source.length == 0) return new bytes(0);
    uint8[] memory digits = new uint8[](46); //TODO: figure out exactly how much is needed
    digits[0] = 0;
    uint8 digitlength = 1;
    for (uint256 i = 0; i < source.length; ++i) {
      uint256 carry = uint8(source[i]);
      for (uint256 j = 0; j < digitlength; ++j) {
        carry += uint256(digits[j]) * 256;
        digits[j] = uint8(carry % 58);
        carry = carry / 58;
      }

      while (carry > 0) {
        digits[digitlength] = uint8(carry % 58);
        digitlength++;
        carry = carry / 58;
      }
    }
    //return digits;
    return toAlphabet(reverse(truncate(digits, digitlength)));
  }

  function truncate(uint8[] memory array, uint8 length)
    internal
    pure
    returns (uint8[] memory)
  {
    uint8[] memory output = new uint8[](length);
    for (uint256 i = 0; i < length; i++) {
      output[i] = array[i];
    }
    return output;
  }

  function reverse(uint8[] memory input)
    internal
    pure
    returns (uint8[] memory)
  {
    uint8[] memory output = new uint8[](input.length);
    for (uint256 i = 0; i < input.length; i++) {
      output[i] = input[input.length - 1 - i];
    }
    return output;
  }

  function toAlphabet(uint8[] memory indices)
    internal
    pure
    returns (bytes memory)
  {
    bytes memory output = new bytes(indices.length);
    for (uint256 i = 0; i < indices.length; i++) {
      output[i] = ALPHABET[indices[i]];
    }
    return output;
  }
}
