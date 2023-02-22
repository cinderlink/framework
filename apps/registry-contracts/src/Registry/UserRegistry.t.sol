// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import "forge-std/Test.sol";
import "./UserRegistry.sol";

contract UserRegistryTest is Test {
    UserRegistry public users;

    function setUp() public {
        users = new UserRegistry();
    }

    function testRegister() public {
        uint256 id = users.register("test", "test");
        assertEq(id, 1);
    }
}
