// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

import "forge-std/console.sol";
import "../util/CandorStrings.sol";
import "./PermissionedContract.sol";

contract SchemaRegistry is PermissionedContract {
    struct Schema {
        uint256 id;
        uint256 contributorId;
        string name;
        string cid;
    }

    mapping(uint256 => Schema) public schemas;
    mapping(string => uint256) public schemaIds;
    uint256 public counter = 0;

    constructor(string memory _namespace, address _permissionAddr)
        PermissionedContract(msg.sender, _namespace, _permissionAddr)
    {}

    function exists(uint256 _id) public view returns (bool) {
        return schemas[_id].id > 0;
    }

    function exists(string memory _name) public view returns (bool) {
        return schemaIds[_name] > 0;
    }

    function register(string memory _name, string memory _cid) public returns (uint256) {
        requirePermission("register");
        require(!exists(_name), "Schema already registered");

        uint256 userId = permissions.users().getId(msg.sender);
        uint256 id = ++counter;
        schemas[id] = Schema(id, userId, _name, _cid);
        schemaIds[_name] = id;

        return id;
    }

    function updateName(uint256 _id, string memory _name) public {
        requirePermission(_id, "update");
        require(exists(_id), string.concat("schema not found: ", CandorStrings.uint2str(_id)));
        require(!exists(_name), "Schema already registered");

        schemas[_id].name = _name;
        schemaIds[_name] = _id;
    }

    function updateCid(uint256 _id, string memory _cid) public {
        requirePermission(_id, "update");
        require(exists(_id), string.concat("schema not found: ", CandorStrings.uint2str(_id)));

        schemas[_id].cid = _cid;
    }

    function update(uint256 _id, string memory _name, string memory _cid) public {
        requirePermission(_id, "update");
        require(exists(_id), string.concat("schema not found: ", CandorStrings.uint2str(_id)));
        require(!exists(_name), string.concat("schema exists: ", _name));

        schemas[_id].name = _name;
        schemas[_id].cid = _cid;
        schemaIds[_name] = _id;
    }

    function remove(uint256 _id) public {
        requirePermission(_id, "delete");
        require(exists(_id), string.concat("schema not found: ", CandorStrings.uint2str(_id)));

        delete schemas[_id];
        delete schemaIds[schemas[_id].name];
    }

    function getSchema(uint256 _id) public view returns (uint256, uint256, string memory) {
        Schema memory entity = schemas[_id];
        return (entity.id, entity.contributorId, entity.name);
    }

    function getId(string memory _name) public view returns (uint256) {
        return schemaIds[_name];
    }

    function getCid(uint256 _id) public view returns (string memory) {
        return schemas[_id].cid;
    }

    function getCid(string memory _name) public view returns (string memory) {
        return schemas[schemaIds[_name]].cid;
    }

    function getContributorId(uint256 _id) public view returns (uint256) {
        return schemas[_id].contributorId;
    }

    function getContributorId(string memory _name) public view returns (uint256) {
        return schemas[schemaIds[_name]].contributorId;
    }

    function getContributorAddress(uint256 _id) public view returns (address) {
        return permissions.users().getOwner(schemas[_id].contributorId);
    }

    function getContributorAddress(string memory _name) public view returns (address) {
        return permissions.users().getOwner(schemas[schemaIds[_name]].contributorId);
    }

    function getName(uint256 _id) public view returns (string memory) {
        return schemas[_id].name;
    }
}
