// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import "forge-std/Test.sol";
import "./PermissionRegistry.sol";

contract PermissionRegistryTest is Test {
    PermissionRegistry public permissions;

    function setUp() public {
        permissions = new PermissionRegistry(address(this));
    }

    function testRegister() public {
        uint256 id = permissions.registerPermission("test", "test");
        assertEq(id, 1);
    }

    function testRegisterParent() public {
        uint256 id = permissions.registerPermission("test1", "test1", 1);
        assertEq(id, 1);
    }

    function testRegisterOwner() public {
        uint256 id = permissions.registerPermission("test2", "test2", 1, address(1));
        require(id == 1, "Id should be 1");

        address owner = permissions.getPermissionOwner(id);
        require(owner == address(1), "Owner should be address(1)");
    }

    function testHasPermission() public {
        uint256 id = permissions.registerPermission("test3", "test3");
        require(id == 1, "Id should be 1");

        bool hasPermission = permissions.exists("test3");
        require(hasPermission, "Permission should exist");
    }

    function testGetPermissionId() public {
        uint256 id = permissions.registerPermission("test4", "test4");
        require(id == 1, "Id should be 1");

        uint256 permissionId = permissions.getPermissionId("test4");
        require(permissionId == 1, "Permission id should be 1");
    }

    function testGetPermission() public {
        uint256 id = permissions.registerPermission("test5", "test5");
        require(id == 1, "Id should be 1");

        PermissionRegistry.Permission memory permission = permissions.getPermission(id);
        require(permission.id == 1, "Id should be 1");

        PermissionRegistry.Permission memory named = permissions.getPermission("test5");
        require(named.id == 1, "Id should be 1");

        require(
            keccak256(abi.encodePacked(permission.name)) == keccak256(abi.encodePacked("test5")), "Name should be test5"
        );
        require(
            keccak256(abi.encodePacked(permission.cid)) == keccak256(abi.encodePacked("test5")), "Cid should be test5"
        );
        require(permission.parent == 0, "Parent should be 0");
        require(permission.owner == address(this), "Owner should be sender");
    }

    function testGetPermissionCid() public {
        uint256 id = permissions.registerPermission("test6", "test6");
        require(id == 1, "Id should be 1");

        string memory cid = permissions.getPermissionCid(id);
        require(keccak256(abi.encodePacked(cid)) == keccak256(abi.encodePacked("test6")), "Cid should be test6");

        string memory namedCid = permissions.getPermissionCid("test6");
        require(keccak256(abi.encodePacked(namedCid)) == keccak256(abi.encodePacked("test6")), "Cid should be test6");
    }

    function testGetPermissionName() public {
        uint256 id = permissions.registerPermission("test7", "test7");
        require(id == 1, "Id should be 1");

        string memory name = permissions.getPermissionName(id);
        require(keccak256(abi.encodePacked(name)) == keccak256(abi.encodePacked("test7")), "Name should be test7");
    }

    function testGetPermissionParent() public {
        uint256 id = permissions.registerPermission("test8", "test8", 1);
        require(id == 1, "Id should be 1");

        uint256 parent = permissions.getPermissionParent(id);
        require(parent == 1, "Parent should be 1");
    }

    function testGetPermissionOwner() public {
        uint256 id = permissions.registerPermission("test9", "test9", 1, address(1));
        require(id == 1, "Id should be 1");

        address owner = permissions.getPermissionOwner(id);
        require(owner == address(1), "Owner should be address(1)");
    }

    function testUpdatePermissionName() public {
        uint256 id = permissions.registerPermission("test10", "test10");
        require(id == 1, "Id should be 1");

        permissions.updatePermissionName(id, "test10-updated");
        string memory name = permissions.getPermissionName(id);
        require(
            keccak256(abi.encodePacked(name)) == keccak256(abi.encodePacked("test10-updated")),
            "Name should be test10-updated"
        );
    }

    function testUpdatePermissionCid() public {
        uint256 id = permissions.registerPermission("test11", "test11");
        require(id == 1, "Id should be 1");

        permissions.updatePermissionCid(id, "test11-updated");
        string memory cid = permissions.getPermissionCid(id);
        require(
            keccak256(abi.encodePacked(cid)) == keccak256(abi.encodePacked("test11-updated")),
            "Cid should be test11-updated"
        );
    }

    function testUpdatePermissionParent() public {
        uint256 id = permissions.registerPermission("test12", "test12");
        require(id == 1, "Id should be 1");

        permissions.updatePermissionParent(id, 1);
        uint256 parent = permissions.getPermissionParent(id);
        require(parent == 1, "Parent should be 1");
    }

    function testUpdatePermissionOwner() public {
        uint256 id = permissions.registerPermission("test13", "test13");
        require(id == 1, "Id should be 1");

        permissions.updatePermissionOwner(id, address(1));
        address owner = permissions.getPermissionOwner(id);
        require(owner == address(1), "Owner should be address(1)");
    }

    function testUpdatePermission() public {
        uint256 id = permissions.registerPermission("test14", "test14");

        permissions.updatePermission(id, "test14-updated", "test14-updated", 1, address(1));
        string memory name = permissions.getPermissionName(id);
        require(
            keccak256(abi.encodePacked(name)) == keccak256(abi.encodePacked("test14-updated")),
            "Name should be test14-updated"
        );

        string memory cid = permissions.getPermissionCid(id);
        require(
            keccak256(abi.encodePacked(cid)) == keccak256(abi.encodePacked("test14-updated")),
            "Cid should be test14-updated"
        );

        uint256 parent = permissions.getPermissionParent(id);
        require(parent == 1, "Parent should be 1");

        address owner = permissions.getPermissionOwner(id);
        require(owner == address(1), "Owner should be address(1)");
    }
}
