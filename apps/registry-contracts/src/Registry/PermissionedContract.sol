// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

import "../util/CandorStrings.sol";
import "./PermissionRegistry.sol";

contract PermissionedContract {
    address owner;
    address permissionAddr;
    string permissionPrefix;
    PermissionRegistry permissions;

    constructor(address _owner, string memory _prefix, address _addr) {
        owner = _owner;
        permissionPrefix = _prefix;
        permissionAddr = _addr;
        permissions = PermissionRegistry(permissionAddr);
    }

    function permissionKey(string memory _permission) internal view returns (string memory) {
        return string.concat(permissionPrefix, ".", _permission);
    }

    function permissionKey(uint256 _entityId, string memory _permission) internal view returns (string memory) {
        return permissionKey(string.concat(CandorStrings.uint2str(_entityId), ".", _permission));
    }

    function userHasPermission(string memory _permission, address _address) public view returns (bool) {
        return _address == owner || permissions.userHasPermission(_address, permissionKey(_permission));
    }

    function userHasPermission(uint256 _entityId, string memory _permission, address _address)
        public
        view
        returns (bool)
    {
        return _address == owner || permissions.userHasPermission(_address, permissionKey(_entityId, _permission));
    }

    function requirePermission(string memory _permission) public view {
        require(
            userHasPermission(_permission, msg.sender),
            string.concat("User does not have required permission: ", permissionKey(_permission))
        );
    }

    function requirePermission(uint256 _entityId, string memory _permission) public view {
        require(
            userHasPermission(_entityId, _permission, msg.sender),
            string.concat("User does not have required permission: ", permissionKey(_entityId, _permission))
        );
    }

    function grantPermission(string memory _permission, address _address) public {
        permissions.grantPermission(_address, permissionKey(_permission));
    }

    function grantPermission(uint256 _entityId, string memory _permission, address _address) public {
        permissions.grantPermission(_address, permissionKey(_entityId, _permission));
    }
}
