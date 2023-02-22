// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.17;

import "forge-std/Script.sol";
import "../src/Token/CinderToken.sol";
import "../src/Registry/UserRegistry.sol";
import "../src/Registry/PermissionRegistry.sol";
import "../src/Registry/SchemaRegistry.sol";
import "../src/Registry/EntityTypeRegistry.sol";
import "../src/Registry/EntityRegistry.sol";
import "../src/Registry/DefinitionRegistry.sol";
import "../src/DAO/CinderStaking.sol";
import "../src/DAO/CinderDAO.sol";

contract DeployScript is Script {
    function setUp() public {}

    function run() public {
        uint256 deployerPrivateKey = vm.envUint("DEPLOYER_PRIVATE_KEY");
        vm.startBroadcast(deployerPrivateKey);
        CinderToken token = new CinderToken();
        CinderStaking staking = new CinderStaking(address(token));
        UserRegistry users = new UserRegistry();
        PermissionRegistry permissions = new PermissionRegistry(address(users));
        SchemaRegistry schemas = new SchemaRegistry("cndr/schema", address(permissions));
        EntityTypeRegistry entityTypes = new EntityTypeRegistry("cndr/type", address(permissions));
        EntityRegistry entities = new EntityRegistry("cndr/entity", address(permissions), address(entityTypes));
        DefinitionRegistry definitions =
            new DefinitionRegistry("cndr/definitions", address(permissions), address(entities), address(schemas));

        users.register("cndr/deployer", "deployer.cid");
        uint256 proposalSchemaId = schemas.register("cndr/proposal", "test.proposal");
        uint256 voteSchemaId = schemas.register("cndr/vote", "test.vote");
        uint256 commentSchemaId = schemas.register("cndr/comment", "test.comment");

        new CinderDAO(
            "cndr/dao",
            address(staking),
            address(token),
            address(permissions),
            address(entities),
            address(definitions),
            proposalSchemaId,
            voteSchemaId,
            commentSchemaId
        );
        vm.stopBroadcast();
    }
}
