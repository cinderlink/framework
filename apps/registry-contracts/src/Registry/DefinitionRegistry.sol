// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import "../util/CandorArrays.sol";
import "./EntityRegistry.sol";
import "./SchemaRegistry.sol";
import "./PermissionedContract.sol";

contract DefinitionRegistry is PermissionedContract {
    struct EntityDefinitions {
        uint256 id;
        uint256[] definitionIds;
        uint256[] schemaIds;
    }

    struct Definition {
        uint256 id;
        uint256 entityId;
        uint256 schemaId;
        uint256 version;
        uint256 contributorId;
        string cid;
    }

    address public entitiesAddr;
    EntityRegistry public entities;
    address public schemasAddr;
    SchemaRegistry public schemas;

    mapping(uint256 => EntityDefinitions) public entityDefs;

    uint256 public counter = 0;
    mapping(uint256 => Definition) public definitions;
    mapping(uint256 => uint256[]) public schemaDefs;
    mapping(uint256 => uint256[]) public userDefs;

    constructor(string memory _namespace, address _permissionsAddr, address _entitiesAddr, address _schemasAddr)
        PermissionedContract(msg.sender, _namespace, _permissionsAddr)
    {
        owner = msg.sender;
        entitiesAddr = _entitiesAddr;
        entities = EntityRegistry(entitiesAddr);
        schemasAddr = _schemasAddr;
        schemas = SchemaRegistry(schemasAddr);
    }

    function register(uint256 _entityId, uint256 _schemaId, string memory _cid) public returns (uint256) {
        require(entities.exists(_entityId), "Entity does not exist");
        require(schemas.exists(_schemaId), "Schema does not exist");
        require(
            userHasPermission("register", msg.sender) || userHasPermission(_entityId, "register", msg.sender),
            "ERR_PERMISSION_DENIED"
        );

        uint256 userId = permissions.users().getId(msg.sender);

        uint256 id = ++counter;
        Definition memory def = Definition(id, _entityId, _schemaId, 1, userId, _cid);
        definitions[id] = def;

        entityDefs[_entityId].id = _entityId;
        entityDefs[_entityId].definitionIds.push(id);
        entityDefs[_entityId].schemaIds.push(_schemaId);
        schemaDefs[_schemaId].push(id);
        userDefs[userId].push(id);

        return id;
    }

    function exists(uint256 _id) public view returns (bool) {
        return definitions[_id].id > 0;
    }

    function hasSchemaDefinition(uint256 _entityId, uint256 _schemaId) public view returns (bool) {
        require(entities.exists(_entityId), "Entity does not exist");
        require(schemas.exists(_schemaId), "Schema does not exist");
        uint256[] memory ids = getEntityDefinitionIds(_entityId);
        for (uint256 i = 0; i < ids.length; i++) {
            if (definitions[ids[i]].schemaId == _schemaId) {
                return true;
            }
        }
        return false;
    }

    function update(uint256 _id, string memory _cid) public {
        require(definitions[_id].id > 0, "Definition does not exist");

        uint256 senderId = permissions.users().getId(msg.sender);
        require(
            senderId == definitions[_id].contributorId || userHasPermission("update", msg.sender),
            "ERR_PERMISSION_DENIED"
        );

        definitions[_id].version++;
        definitions[_id].cid = _cid;
    }

    function remove(uint256 _id) public {
        require(definitions[_id].id > 0, "Definition does not exist");

        uint256 senderId = permissions.users().getId(msg.sender);
        require(
            senderId == definitions[_id].contributorId || userHasPermission("remove", msg.sender),
            "ERR_PERMISSION_DENIED"
        );

        uint256 entityId = definitions[_id].entityId;
        entityDefs[entityId].definitionIds = CandorArrays.remove(entityDefs[entityId].definitionIds, _id);

        delete definitions[_id];
    }

    function get(uint256 id) public view returns (Definition memory) {
        return definitions[id];
    }

    function getEntityId(uint256 id) public view returns (uint256) {
        return definitions[id].entityId;
    }

    function getSchemaId(uint256 id) public view returns (uint256) {
        return definitions[id].schemaId;
    }

    function getCid(uint256 id) public view returns (string memory) {
        return definitions[id].cid;
    }

    function getVersion(uint256 id) public view returns (uint256) {
        return definitions[id].version;
    }

    function getContributor(uint256 id) public view returns (uint256) {
        return definitions[id].contributorId;
    }

    function getEntityDefinitionIds(uint256 _entityId) public view returns (uint256[] memory) {
        return entityDefs[_entityId].definitionIds;
    }

    function getEntityDefinitions(uint256 _entityId) public view returns (Definition[] memory) {
        uint256[] memory ids = getEntityDefinitionIds(_entityId);
        Definition[] memory defs = new Definition[](ids.length);

        for (uint256 i = 0; i < ids.length; i++) {
            defs[i] = definitions[ids[i]];
        }

        return defs;
    }

    function getEntitySchemaIds(uint256 _entityId) public view returns (uint256[] memory) {
        return entityDefs[_entityId].schemaIds;
    }

    function getEntitySchemaDefinitionIds(uint256 _entityId, uint256 _schemaId)
        public
        view
        returns (uint256[] memory)
    {
        uint256[] memory ids = entityDefs[_entityId].definitionIds;
        uint256[] memory schemaIds = entityDefs[_entityId].schemaIds;
        uint256[] memory filteredIds = new uint256[](ids.length);

        uint256 _counter = 0;
        for (uint256 i = 0; i < ids.length; i++) {
            if (schemaIds[i] == _schemaId) {
                filteredIds[_counter] = ids[i];
                _counter++;
            }
        }

        uint256[] memory result = new uint256[](_counter);
        for (uint256 i = 0; i < _counter; i++) {
            result[i] = filteredIds[i];
        }

        return result;
    }

    function getEntitySchemaDefinitions(uint256 _entityId, uint256 _schemaId)
        public
        view
        returns (Definition[] memory)
    {
        uint256[] memory ids = getEntitySchemaDefinitionIds(_entityId, _schemaId);
        Definition[] memory defs = new Definition[](ids.length);

        for (uint256 i = 0; i < ids.length; i++) {
            defs[i] = definitions[ids[i]];
        }

        return defs;
    }

    function getSchemaDefinitionIds(uint256 _schemaId) public view returns (uint256[] memory) {
        return schemaDefs[_schemaId];
    }

    function getSchemaDefinitions(uint256 _schemaId) public view returns (Definition[] memory) {
        uint256[] memory ids = getSchemaDefinitionIds(_schemaId);
        Definition[] memory defs = new Definition[](ids.length);

        for (uint256 i = 0; i < ids.length; i++) {
            defs[i] = definitions[ids[i]];
        }

        return defs;
    }

    function getSchemaEntityIds(uint256 _schemaId) public view returns (uint256[] memory) {
        uint256[] memory ids = getSchemaDefinitionIds(_schemaId);
        uint256[] memory entityIds = new uint256[](ids.length);

        for (uint256 i = 0; i < ids.length; i++) {
            entityIds[i] = definitions[ids[i]].entityId;
        }

        return entityIds;
    }

    function getContributorDefinitionIds(uint256 _contributorId) public view returns (uint256[] memory) {
        return userDefs[_contributorId];
    }

    function getContributorDefinitions(uint256 _contributorId) public view returns (Definition[] memory) {
        uint256[] memory ids = getContributorDefinitionIds(_contributorId);
        Definition[] memory defs = new Definition[](ids.length);

        for (uint256 i = 0; i < ids.length; i++) {
            defs[i] = definitions[ids[i]];
        }

        return defs;
    }
}
