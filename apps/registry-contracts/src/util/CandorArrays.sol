// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

library CandorArrays {
    function indexOf(uint256[] memory self, uint256 value) internal pure returns (uint256) {
        for (uint256 i = 0; i < self.length; i++) {
            if (self[i] == value) {
                return i;
            }
        }
        return type(uint256).max;
    }

    function indexOf(string[] memory self, string memory value) internal pure returns (uint256) {
        for (uint256 i = 0; i < self.length; i++) {
            if (keccak256(bytes(self[i])) == keccak256(bytes(value))) {
                return i;
            }
        }
        return type(uint256).max;
    }

    function indexOf(address[] memory self, address value) internal pure returns (uint256) {
        for (uint256 i = 0; i < self.length; i++) {
            if (self[i] == value) {
                return i;
            }
        }
        return type(uint256).max;
    }

    function remove(uint256[] memory self, uint256 value) internal pure returns (uint256[] memory) {
        uint256 index = indexOf(self, value);
        if (index == type(uint256).max) {
            return self;
        }
        uint256[] memory result = new uint256[](self.length - 1);
        for (uint256 i = 0; i < index; i++) {
            result[i] = self[i];
        }
        for (uint256 i = index; i < result.length; i++) {
            result[i] = self[i + 1];
        }
        return result;
    }

    function remove(string[] memory self, string memory value) internal pure returns (string[] memory) {
        uint256 index = indexOf(self, value);
        if (index == type(uint256).max) {
            return self;
        }
        string[] memory result = new string[](self.length - 1);
        for (uint256 i = 0; i < index; i++) {
            result[i] = self[i];
        }
        for (uint256 i = index; i < result.length; i++) {
            result[i] = self[i + 1];
        }
        return result;
    }

    function contains(uint256[] memory self, uint256 value) internal pure returns (bool) {
        return indexOf(self, value) != type(uint256).max;
    }

    function contains(string[] memory self, string memory value) internal pure returns (bool) {
        return indexOf(self, value) != type(uint256).max;
    }

    function slice(uint256[] memory self, uint256 start, uint256 end) internal pure returns (uint256[] memory) {
        uint256[] memory result = new uint256[](end - start);
        for (uint256 i = start; i < end; i++) {
            result[i - start] = self[i];
        }
        return result;
    }
}
