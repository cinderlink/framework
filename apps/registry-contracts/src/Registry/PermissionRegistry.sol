// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.17;

import "../util/CandorStrings.sol";
import "./UserRegistry.sol";

contract PermissionRegistry {
    address owner;
    address usersAddr;
    UserRegistry public users;

    struct Permission {
        uint256 id;
        uint256 parent;
        string cid;
        string name;
        address owner;
    }

    struct UserPermissions {
        uint256 userId;
        uint256[] permissions;
        uint256 counter;
    }

    uint256 public counter = 0;
    mapping(uint256 => Permission) public permissions;
    mapping(uint256 => UserPermissions) public userPermissions;
    mapping(string => uint256) public permissionIds;

    constructor(address _usersAddr) {
        owner = msg.sender;
        usersAddr = _usersAddr;
        users = UserRegistry(usersAddr);
    }

    function registerPermission(string memory _name, string memory _cid, uint256 _parent, address _owner)
        public
        returns (uint256)
    {
        require(
            _owner == address(0) || _owner == msg.sender || msg.sender == owner,
            "Only the owner can register permissions on behalf of others"
        );

        string memory slug = CandorStrings.slugify(_name);
        require(!exists(slug), "Permission already registered");

        uint256 id = ++counter;
        permissions[id] = Permission(id, _parent, _cid, slug, _owner);
        permissionIds[slug] = id;

        return id;
    }

    function registerPermission(string memory _name, string memory _cid) public returns (uint256) {
        return registerPermission(_name, _cid, 0, msg.sender);
    }

    function registerPermission(string memory _name, string memory _cid, uint256 _parent) public returns (uint256) {
        return registerPermission(_name, _cid, _parent, msg.sender);
    }

    function exists(string memory _name) public view returns (bool) {
        string memory slug = CandorStrings.slugify(_name);
        return permissionIds[slug] > 0;
    }

    function getPermissionId(string memory _name) public view returns (uint256) {
        string memory slug = CandorStrings.slugify(_name);
        return permissionIds[slug];
    }

    function getPermission(uint256 _id) public view returns (Permission memory) {
        return permissions[_id];
    }

    function getPermission(string memory _name) public view returns (Permission memory) {
        string memory slug = CandorStrings.slugify(_name);
        return permissions[permissionIds[slug]];
    }

    function getPermissionCid(uint256 _id) public view returns (string memory) {
        return permissions[_id].cid;
    }

    function getPermissionCid(string memory _name) public view returns (string memory) {
        string memory slug = CandorStrings.slugify(_name);
        return permissions[permissionIds[slug]].cid;
    }

    function getPermissionName(uint256 _id) public view returns (string memory) {
        return permissions[_id].name;
    }

    function getPermissionParent(uint256 _id) public view returns (uint256) {
        return permissions[_id].parent;
    }

    function getPermissionOwner(uint256 _id) public view returns (address) {
        return permissions[_id].owner;
    }

    function updatePermissionName(uint256 _id, string memory _name) public {
        require(
            permissions[_id].owner == msg.sender || msg.sender == owner,
            "Only the owner of a permission can update the name"
        );
        string memory slug = CandorStrings.slugify(_name);
        permissions[_id].name = slug;
    }

    function updatePermissionCid(uint256 _id, string memory _cid) public {
        require(
            permissions[_id].owner == msg.sender || msg.sender == owner,
            "Only the owner of a permission can update the cid"
        );
        permissions[_id].cid = _cid;
    }

    function updatePermissionParent(uint256 _id, uint256 _parent) public {
        require(
            permissions[_id].owner == msg.sender || msg.sender == owner,
            "Only the owner of a permission can update the parent"
        );
        permissions[_id].parent = _parent;
    }

    function updatePermissionOwner(uint256 _id, address _owner) public {
        require(
            permissions[_id].owner == msg.sender || msg.sender == owner,
            "Only the owner of a permission can update the owner"
        );
        permissions[_id].owner = _owner;
    }

    function updatePermission(uint256 _id, string memory _name, string memory _cid, uint256 _parent, address _owner)
        public
    {
        require(
            permissions[_id].owner == address(0) || permissions[_id].owner == msg.sender || msg.sender == owner,
            "Only the owner of a permission can update the permission"
        );
        require(!exists(_name), "Permission already registered");

        delete permissionIds[permissions[_id].name];

        string memory slug = CandorStrings.slugify(_name);
        permissions[_id].name = slug;
        permissions[_id].cid = _cid;
        permissions[_id].parent = _parent;
        permissions[_id].owner = _owner;

        permissionIds[slug] = _id;
    }

    function updatePermission(uint256 _id, string memory _name, string memory _cid, uint256 _parent) public {
        Permission memory permission = getPermission(_id);
        updatePermission(_id, _name, _cid, _parent, permission.owner);
    }

    function updatePermission(uint256 _id, string memory _name, string memory _cid) public {
        Permission memory permission = getPermission(_id);
        updatePermission(_id, _name, _cid, permission.parent, permission.owner);
    }

    function userHasPermission(uint256 _userId, uint256 _permissionId) public view returns (bool) {
        require(users.exists(_userId), string.concat("User does not exist: ", CandorStrings.uint2str(_userId)));
        UserPermissions memory userPermission = userPermissions[_userId];
        for (uint256 i = 0; i < userPermission.counter; i++) {
            if (userPermission.permissions[i] == _permissionId) {
                return true;
            }
        }
        return false;
    }

    function userHasPermission(address _address, uint256 _permissionId) public view returns (bool) {
        require(users.exists(_address), string.concat("User does not exist: ", CandorStrings.address2str(_address)));
        if (_address == owner) {
            return true;
        }
        uint256 userId = users.getId(_address);
        return userHasPermission(userId, _permissionId);
    }

    function userHasPermission(address _address, string memory _name) public view returns (bool) {
        require(users.exists(_address), string.concat("User does not exist: ", CandorStrings.address2str(_address)));
        if (_address == owner) {
            return true;
        }
        uint256 userId = users.getId(_address);
        return userHasPermission(userId, _name);
    }

    function userHasPermission(uint256 _permissionId) public view returns (bool) {
        uint256 userId = users.getId(msg.sender);
        return userHasPermission(userId, _permissionId);
    }

    function userHasPermission(string memory _name) public view returns (bool) {
        uint256 userId = users.getId(msg.sender);
        return userHasPermission(userId, _name);
    }

    function userHasPermission(uint256 _userId, string memory _name) public view returns (bool) {
        require(users.exists(_userId), string.concat("User does not exist: ", CandorStrings.uint2str(_userId)));
        uint256 permissionId = getPermissionId(_name);
        return userHasPermission(_userId, permissionId);
    }

    function userHasPermission(string memory _username, uint256 _permissionId) public view returns (bool) {
        uint256 userId = users.getId(_username);
        return userHasPermission(userId, _permissionId);
    }

    function userHasPermission(string memory _username, string memory _name) public view returns (bool) {
        uint256 userId = users.getId(_username);
        return userHasPermission(userId, _name);
    }

    function grantPermission(uint256 _userId, uint256 _permissionId) public {
        require(users.exists(_userId), string.concat("User does not exist: ", CandorStrings.uint2str(_userId)));
        require(
            permissions[_permissionId].owner == msg.sender || msg.sender == owner,
            "Only the owner of a permission can grant it"
        );
        UserPermissions storage userPermission = userPermissions[_userId];
        for (uint256 i = 0; i < userPermission.counter; i++) {
            if (userPermission.permissions[i] == _permissionId) {
                return;
            }
        }
        userPermission.permissions.push(_permissionId);
        userPermission.counter++;
    }

    function grantPermission(uint256 _userId, string memory _name) public {
        uint256 permissionId = getPermissionId(_name);
        grantPermission(_userId, permissionId);
    }

    function grantPermission(string memory _username, uint256 _permissionId) public {
        uint256 userId = users.getId(_username);
        grantPermission(userId, _permissionId);
    }

    function grantPermission(address _addr, uint256 _permissionId) public {
        uint256 userId = users.getId(_addr);
        grantPermission(userId, _permissionId);
    }

    function grantPermission(address _addr, string memory _name) public {
        uint256 userId = users.getId(_addr);
        grantPermission(userId, _name);
    }

    function revokePermission(uint256 _userId, uint256 _permissionId) public {
        require(users.exists(_userId), string.concat("User does not exist: ", CandorStrings.uint2str(_userId)));
        require(
            permissions[_permissionId].owner == msg.sender || msg.sender == owner,
            "Only the owner of a permission can revoke it"
        );
        UserPermissions storage userPermission = userPermissions[_userId];
        for (uint256 i = 0; i < userPermission.counter; i++) {
            if (userPermission.permissions[i] == _permissionId) {
                userPermission.permissions[i] = userPermission.permissions[userPermission.counter - 1];
                userPermission.permissions.pop();
                userPermission.counter--;
                return;
            }
        }
    }

    function revokePermission(uint256 _userId, string memory _name) public {
        require(users.exists(_userId), string.concat("User does not exist: ", CandorStrings.uint2str(_userId)));
        uint256 permissionId = getPermissionId(_name);
        revokePermission(_userId, permissionId);
    }

    function revokeAllPermissions(uint256 _userId) public {
        require(users.exists(_userId), string.concat("User does not exist: ", CandorStrings.uint2str(_userId)));
        UserPermissions storage userPermission = userPermissions[_userId];
        for (uint256 i = 0; i < userPermission.counter; i++) {
            require(
                permissions[userPermission.permissions[i]].owner == msg.sender || msg.sender == owner,
                "Only the owner of a permission can revoke it"
            );
        }
        delete userPermissions[_userId];
    }

    function getUserPermissions(uint256 _userId, uint256 _offset, uint256 _limit)
        public
        view
        returns (uint256[] memory)
    {
        require(users.exists(_userId), string.concat("User does not exist: ", CandorStrings.uint2str(_userId)));
        UserPermissions memory userPermission = userPermissions[_userId];
        uint256[] memory result = new uint256[](_limit);
        for (uint256 i = 0; i < _limit; i++) {
            result[i] = userPermission.permissions[_offset + i];
        }
        return result;
    }

    function getUserPermissions(uint256 _userId) public view returns (uint256[] memory) {
        require(users.exists(_userId), string.concat("User does not exist: ", CandorStrings.uint2str(_userId)));
        UserPermissions memory userPermission = userPermissions[_userId];
        uint256[] memory result = new uint256[](userPermission.counter);
        for (uint256 i = 0; i < userPermission.counter; i++) {
            result[i] = userPermission.permissions[i];
        }
        return result;
    }

    function getUserPermissionsCount(uint256 _userId) public view returns (uint256) {
        require(users.exists(_userId), string.concat("User does not exist: ", CandorStrings.uint2str(_userId)));
        UserPermissions memory userPermission = userPermissions[_userId];
        return userPermission.counter;
    }
}
