// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

import "forge-std/console.sol";
import "../util/CandorStrings.sol";
import "./PermissionedContract.sol";
import "./EntityTypeRegistry.sol";

contract EntityRegistry is PermissionedContract {
    struct Entity {
        uint256 id;
        uint256 typeId;
        uint256 contributorId;
        string name;
    }

    EntityTypeRegistry public types;

    mapping(uint256 => Entity) public entities;
    mapping(string => uint256) public entityIds;
    mapping(uint256 => uint256[]) public entityTypeIds;
    uint256 public counter = 0;

    constructor(string memory _namespace, address _permissionAddr, address _typesAddr)
        PermissionedContract(msg.sender, _namespace, _permissionAddr)
    {
        types = EntityTypeRegistry(_typesAddr);
    }

    function exists(uint256 _id) public view returns (bool) {
        return entities[_id].id > 0;
    }

    function exists(string memory _name) public view returns (bool) {
        return entityIds[_name] > 0;
    }

    function register(string memory _name, uint256 _typeId) public returns (uint256) {
        requirePermission("register");
        require(!exists(_name), "Entity already registered");
        require(types.exists(_typeId), "Entity type does not exist");

        uint256 userId = permissions.users().getId(msg.sender);
        uint256 id = ++counter;
        entities[id] = Entity(id, _typeId, userId, _name);
        entityIds[_name] = id;
        entityTypeIds[_typeId].push(id);

        return id;
    }

    function update(uint256 _id, string memory _name) public {
        require(exists(_id), "Entity does not exist");
        require(!exists(_name), "Entity already registered");
        requirePermission(_id, "update");

        entities[_id].name = _name;
        entityIds[_name] = _id;
    }

    function remove(uint256 _id) public {
        require(exists(_id), "Entity does not exist");
        requirePermission("delete");

        delete entities[_id];
        delete entityIds[entities[_id].name];
    }

    function getEntity(uint256 _id) public view returns (uint256, uint256, string memory) {
        Entity memory entity = entities[_id];
        return (entity.id, entity.contributorId, entity.name);
    }

    function getEntityType(uint256 _id) public view returns (uint256, string memory) {
        Entity memory entity = entities[_id];
        return (entity.typeId, types.getName(entity.typeId));
    }

    function getEntities(uint256 _offset, uint256 _limit) public view returns (uint256[] memory) {
        uint256[] memory ids = new uint256[](_limit);
        uint256 _counter = 0;
        for (uint256 i = _offset; i < counter; i++) {
            if (exists(i)) {
                ids[_counter] = i;
                _counter++;
            }
        }
        return ids;
    }

    function getEntitiesByType(uint256 _typeId, uint256 _offset, uint256 _limit)
        public
        view
        returns (uint256[] memory)
    {
        uint256[] memory ids = new uint256[](_limit);
        uint256 _counter = 0;
        for (uint256 i = _offset; i < entityTypeIds[_typeId].length; i++) {
            if (exists(entityTypeIds[_typeId][i])) {
                ids[_counter] = entityTypeIds[_typeId][i];
                _counter++;
            }
        }
        return ids;
    }
}
