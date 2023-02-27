// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

library CandorStrings {
    function toLowerCase(string memory _name) public pure returns (string memory) {
        bytes memory b = bytes(_name);
        for (uint256 i = 0; i < b.length; i++) {
            if (b[i] >= 0x41 && b[i] <= 0x5A) {
                b[i] = bytes1(uint8(b[i]) + 32);
            }
        }
        return string(b);
    }

    function slugify(string memory _input) public pure returns (string memory) {
        // replace all punctuation & spacing with dashes
        bytes memory b = bytes(_input);
        string memory result = new string(b.length);
        bytes memory res = bytes(result);
        uint256 j = 0;
        for (uint256 i = 0; i < b.length; i++) {
            if (
                // if the character is a space
                b[i] == 0x20
                // or if the character is a punctuation
                || (b[i] < 0x30 && b[i] != 0x2D) || (b[i] > 0x39 && b[i] < 0x41) || (b[i] > 0x5A && b[i] < 0x61)
                    || b[i] > 0x7A
            ) {
                res[j++] = 0x2D;
            } else {
                res[j++] = b[i];
            }
        }

        // trim dashes
        uint256 start = 0;
        uint256 end = res.length - 1;
        for (uint256 i = 0; i < res.length; i++) {
            if (res[i] != 0x2D) {
                start = i;
                break;
            }
        }
        for (uint256 i = res.length - 1; i >= 0; i--) {
            if (res[i] != 0x2D) {
                end = i;
                break;
            }
        }
        if (start == end) {
            return "";
        }

        // new bytes
        string memory newResult = new string(end - start + 1);
        bytes memory newRes = bytes(newResult);
        for (uint256 i = start; i <= end; i++) {
            newRes[i - start] = res[i];
        }

        // copy to string
        newResult = string(newRes);
        return toLowerCase(string(newResult));
    }

    function removePunctuation(string memory _name) public pure returns (string memory) {
        bytes memory b = bytes(_name);
        string memory result = new string(b.length);
        bytes memory res = bytes(result);
        uint256 j = 0;
        for (uint256 i = 0; i < b.length; i++) {
            if (
                b[i] != 0x20
                    && (b[i] < 0x30 || (b[i] > 0x39 && b[i] < 0x41) || (b[i] > 0x5A && b[i] < 0x61) || b[i] > 0x7A)
            ) {
                continue;
            }
            res[j++] = b[i];
        }
        return string(res);
    }

    function isEmpty(string memory _name) public pure returns (bool) {
        bytes memory b = bytes(_name);
        if (b.length == 0) {
            return true;
        }
        for (uint256 i = 0; i < b.length; i++) {
            if (b[i] != 0x20) {
                return false;
            }
        }
        return true;
    }

    function isEqual(string memory _name1, string memory _name2) public pure returns (bool) {
        return keccak256(abi.encodePacked(_name1)) == keccak256(abi.encodePacked(_name2));
    }

    function uint2str(uint256 _i) internal pure returns (string memory str) {
        if (_i == 0) {
            return "0";
        }
        uint256 j = _i;
        uint256 length;
        while (j != 0) {
            length++;
            j /= 10;
        }
        bytes memory bstr = new bytes(length);
        uint256 k = length;
        j = _i;
        while (j != 0) {
            bstr[--k] = bytes1(uint8(48 + j % 10));
            j /= 10;
        }
        str = string(bstr);
    }

    function address2str(address _addr) public pure returns (string memory) {
        bytes32 value = bytes32(uint256(uint160(_addr)));
        bytes memory alphabet = "0123456789abcdef";

        bytes memory str = new bytes(42);
        str[0] = "0";
        str[1] = "x";
        for (uint256 i = 0; i < 20; i++) {
            str[2 + i * 2] = alphabet[uint8(value[i + 12] >> 4)];
            str[3 + i * 2] = alphabet[uint8(value[i + 12] & 0x0f)];
        }
        return string(str);
    }
}
