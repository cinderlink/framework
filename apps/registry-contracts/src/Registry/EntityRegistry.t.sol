// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.17;

import "forge-std/Test.sol";
import "./EntityRegistry.sol";
import "./EntityTypeRegistry.sol";
import "./UserRegistry.sol";
import "./PermissionRegistry.sol";

contract EntityRegistryTest is Test {
    UserRegistry public users;
    PermissionRegistry public permissions;
    EntityTypeRegistry public types;
    EntityRegistry public entities;
    address public deployer;

    function setUp() public {
        deployer = vm.addr(1);
        vm.startPrank(deployer);
        users = new UserRegistry();
        permissions = new PermissionRegistry(address(users));
        types = new EntityTypeRegistry("test.types", address(permissions));
        entities = new EntityRegistry("test.entities", address(permissions), address(types));
    }

    function testRegister() public {
        uint256 userId = users.register("test", "test");
        assertEq(userId, 1);

        uint256 typeId = types.register("test");
        assertEq(typeId, 1);

        uint256 entityId = entities.register("test", typeId);
        assertEq(entityId, 1);
    }
}
