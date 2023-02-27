// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.17;

import "../util/CandorStrings.sol";
import "./PermissionRegistry.sol";
import "./PermissionedContract.sol";

contract EntityTypeRegistry is PermissionedContract {
    struct EntityType {
        uint256 id;
        string name;
        address contributor;
    }

    constructor(string memory _namespace, address _permissionAddr)
        PermissionedContract(msg.sender, _namespace, _permissionAddr)
    {}

    uint256 public counter = 0;
    mapping(uint256 => EntityType) public entityTypes;
    mapping(string => uint256) public entityTypeIds;

    function exists(uint256 _id) public view returns (bool) {
        return entityTypes[_id].id > 0;
    }

    function exists(string memory _name) public view returns (bool) {
        return entityTypeIds[_name] > 0;
    }

    function register(string memory _name) public returns (uint256) {
        require(!exists(_name), "Entity type already registered");
        requirePermission("register");

        uint256 id = ++counter;
        entityTypes[id] = EntityType(id, _name, msg.sender);
        entityTypeIds[_name] = id;

        return id;
    }

    function update(uint256 _id, string memory _name) public {
        require(exists(_id), "Entity type does not exist");
        require(!exists(_name), "Entity type already registered");
        requirePermission(_id, "update");

        entityTypes[_id].name = _name;
        entityTypeIds[_name] = _id;
    }

    function remove(uint256 _id) public {
        require(exists(_id), "Entity type does not exist");
        requirePermission(_id, "remove");

        delete entityTypes[_id];
        delete entityTypeIds[entityTypes[_id].name];
    }

    function getId(string memory _name) public view returns (uint256) {
        return entityTypeIds[_name];
    }

    function getName(uint256 _id) public view returns (string memory) {
        return entityTypes[_id].name;
    }

    function getContributor(uint256 _id) public view returns (address) {
        return entityTypes[_id].contributor;
    }
}
