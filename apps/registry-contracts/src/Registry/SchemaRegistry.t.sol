// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import "forge-std/Test.sol";
import "./SchemaRegistry.sol";
import "./UserRegistry.sol";
import "./PermissionRegistry.sol";

contract EntityRegistryTest is Test {
    UserRegistry public users;
    PermissionRegistry public permissions;
    SchemaRegistry public schemas;
    address public deployer;

    function setUp() public {
        deployer = vm.addr(1);
        vm.startPrank(deployer);
        users = new UserRegistry();
        permissions = new PermissionRegistry(address(users));
        schemas = new SchemaRegistry("test.schemas", address(permissions));
        users.register("test", "test");
    }

    function testRegister() public {
        uint256 schemaId = schemas.register("test1", "test1Cid");
        assertEq(schemaId, 1);
    }

    function testGetters() public {
        uint256 schemaId = schemas.register("test2", "test2Cid");
        require(schemas.exists(schemaId), "schema not found [exists(uint256)]");

        string memory name = schemas.getName(schemaId);
        require(CandorStrings.isEqual(name, "test2"), "name mismatch [getName(uint256)]");

        string memory cid = schemas.getCid(schemaId);
        require(CandorStrings.isEqual(cid, "test2Cid"), "cid mismatch [getCid(uint256)]");

        string memory cid2 = schemas.getCid("test2");
        require(CandorStrings.isEqual(cid2, "test2Cid"), "cid mismatch [getCid(string)]");

        uint256 contributorId = schemas.getContributorId(schemaId);
        require(contributorId == 1, "contributorId mismatch [getContributorId(uint256)]");

        address contributor = schemas.getContributorAddress(schemaId);
        require(contributor == vm.addr(1), "contributor mismatch [getContributorAddress(uint256)]");
    }

    function testUpdate() public {
        uint256 schemaId = schemas.register("test3", "test3Cid");
        schemas.update(schemaId, "test3Updated", "test3CidUpdated");

        string memory name = schemas.getName(schemaId);
        require(CandorStrings.isEqual(name, "test3Updated"), "name mismatch [getName(uint256)]");

        string memory cid = schemas.getCid(schemaId);
        require(CandorStrings.isEqual(cid, "test3CidUpdated"), "cid mismatch [getCid(uint256)]");
    }

    function testRemove() public {
        uint256 schemaId = schemas.register("test4", "test4Cid");
        schemas.remove(schemaId);

        require(!schemas.exists(schemaId), "schema not removed [exists(uint256)]");
    }
}
