// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.17;

import "forge-std/Test.sol";
import "./DefinitionRegistry.sol";
import "./EntityTypeRegistry.sol";
import "./EntityRegistry.sol";
import "./SchemaRegistry.sol";
import "./UserRegistry.sol";
import "./PermissionRegistry.sol";

contract DefinitionRegistryTest is Test {
    UserRegistry public users;
    PermissionRegistry public permissions;
    SchemaRegistry public schemas;
    EntityTypeRegistry public types;
    EntityRegistry public entities;
    DefinitionRegistry public definitions;
    address public deployer;

    uint256 typeId;
    uint256 entityId;
    uint256 schemaId;
    uint256 deployerId;

    function setUp() public {
        deployer = vm.addr(1);
        vm.startPrank(deployer);
        users = new UserRegistry();
        permissions = new PermissionRegistry(address(users));
        schemas = new SchemaRegistry("test.schemas", address(permissions));
        types = new EntityTypeRegistry("test.types", address(permissions));
        entities = new EntityRegistry("test.entities", address(permissions), address(types));
        definitions =
            new DefinitionRegistry("test.definitions", address(permissions), address(entities), address(schemas));
        deployerId = users.register("test", "test");
        typeId = types.register("test");
        entityId = entities.register("test", typeId);
        schemaId = schemas.register("test", "test");
    }

    function testRegister() public {
        uint256 id = definitions.register(entityId, schemaId, "test");
        require(definitions.exists(id), "definition not found [exists(uint256)]");
    }

    function testHasSchemaDefinition() public {
        definitions.register(entityId, schemaId, "test");
        require(
            definitions.hasSchemaDefinition(entityId, schemaId),
            "definition not found [hasSchemaDefinition(uint256, uint256)]"
        );
    }

    function testGetters() public {
        uint256 id = definitions.register(entityId, schemaId, "test");
        require(definitions.exists(id), "definition not found [exists(uint256)]");

        uint256 definitionEntityId = definitions.getEntityId(id);
        require(definitionEntityId == entityId, "entityId mismatch [getEntityId(uint256)]");

        uint256 definitionSchemaId = definitions.getSchemaId(id);
        require(definitionSchemaId == schemaId, "schemaId mismatch [getSchemaId(uint256)]");

        string memory definitionCid = definitions.getCid(id);
        require(CandorStrings.isEqual(definitionCid, "test"), "cid mismatch [getCid(uint256)]");

        uint256 definitionVersion = definitions.getVersion(id);
        require(definitionVersion == 1, "version mismatch [getVersion(uint256)]");

        uint256 definitionContributor = definitions.getContributor(id);
        require(definitionContributor == deployerId, "contributor mismatch [getContributor(uint256)]");

        uint256[] memory definitionIds = definitions.getEntityDefinitionIds(entityId);
        require(definitionIds.length == 1, "definitionIds length mismatch [getEntityDefinitionIds(uint256)]");
        require(definitionIds[0] == id, "definitionIds mismatch [getEntityDefinitionIds(uint256)]");

        uint256[] memory schemaIds = definitions.getEntitySchemaIds(entityId);
        require(schemaIds.length == 1, "schemaIds length mismatch [getEntitySchemaIds(uint256)]");
        require(schemaIds[0] == schemaId, "schemaIds mismatch [getEntitySchemaIds(uint256)]");

        uint256[] memory definitionIds2 = definitions.getSchemaDefinitionIds(schemaId);
        require(definitionIds2.length == 1, "definitionIds length mismatch [getSchemaDefinitionIds(uint256)]");
        require(definitionIds2[0] == id, "definitionIds mismatch [getSchemaDefinitionIds(uint256)]");

        uint256[] memory entityIds = definitions.getSchemaEntityIds(schemaId);
        require(entityIds.length == 1, "entityIds length mismatch [getSchemaEntityIds(uint256)]");
        require(entityIds[0] == entityId, "entityIds mismatch [getSchemaEntityIds(uint256)]");
    }

    function testUpdate() public {
        uint256 id = definitions.register(entityId, schemaId, "test");
        require(definitions.exists(id), "definition not found [exists(uint256)]");

        definitions.update(id, "test2");
        string memory definitionCid = definitions.getCid(id);
        require(CandorStrings.isEqual(definitionCid, "test2"), "cid mismatch [getCid(uint256)]");

        uint256 definitionVersion = definitions.getVersion(id);
        require(definitionVersion == 2, "version mismatch [getVersion(uint256)]");
    }

    function testRemove() public {
        uint256 id = definitions.register(entityId, schemaId, "test");
        require(definitions.exists(id), "definition not found [exists(uint256)]");

        definitions.remove(id);
        require(!definitions.exists(id), "definition found [exists(uint256)]");
    }
}
