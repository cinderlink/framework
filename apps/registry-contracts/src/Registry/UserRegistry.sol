// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.17;

import "../util/CandorStrings.sol";

contract UserRegistry {
    address owner;

    struct User {
        uint256 id;
        string did;
        string name;
        address owner;
    }

    uint256 public counter = 0;
    mapping(uint256 => User) public users;
    mapping(address => uint256) public userAddresses;
    mapping(string => uint256) public userIds;

    constructor() {
        owner = msg.sender;
    }

    function register(string memory _name, string memory _did, address _user) public returns (uint256) {
        require(
            _user == address(0) || _user == msg.sender || msg.sender == owner,
            "Only the owner can register on behalf of others"
        );

        if (userAddresses[_user] > 0) {
            require(userAddresses[_user] == 0, "Address already registered");
        }

        string memory slug = CandorStrings.slugify(_name);
        require(!exists(slug), "User already registered");

        uint256 id = ++counter;
        users[id] = User(id, _did, slug, _user);
        userIds[slug] = id;
        userAddresses[_user] = id;

        return id;
    }

    function register(string memory _name, string memory _did) public returns (uint256) {
        return register(_name, _did, msg.sender);
    }

    function exists(string memory _name) public view returns (bool) {
        string memory slug = CandorStrings.slugify(_name);
        return userIds[slug] > 0;
    }

    function exists(uint256 _id) public view returns (bool) {
        return users[_id].id > 0;
    }

    function exists(address _address) public view returns (bool) {
        return userAddresses[_address] > 0;
    }

    function exists() public view returns (bool) {
        return userAddresses[msg.sender] > 0;
    }

    function getId(string memory _name) public view returns (uint256) {
        string memory slug = CandorStrings.slugify(_name);
        return userIds[slug];
    }

    function getId() public view returns (uint256) {
        return userAddresses[msg.sender];
    }

    function getId(address _address) public view returns (uint256) {
        return userAddresses[_address];
    }

    function getUser(uint256 _id) public view returns (User memory) {
        return users[_id];
    }

    function getUser(string memory _name) public view returns (User memory) {
        string memory slug = CandorStrings.slugify(_name);
        return users[userIds[slug]];
    }

    function getUser() public view returns (User memory) {
        return users[userAddresses[msg.sender]];
    }

    function getdid(uint256 _id) public view returns (string memory) {
        return users[_id].did;
    }

    function getdid(string memory _name) public view returns (string memory) {
        string memory slug = CandorStrings.slugify(_name);
        return users[userIds[slug]].did;
    }

    function getName(uint256 _id) public view returns (string memory) {
        return users[_id].name;
    }

    function getOwner(uint256 _id) public view returns (address) {
        return users[_id].owner;
    }

    function updateName(uint256 _id, string memory _name) public {
        require(
            users[_id].owner == msg.sender || msg.sender == owner, "Only the owner of a permission can update the name"
        );
        string memory slug = CandorStrings.slugify(_name);
        users[_id].name = slug;
    }

    function updatedid(uint256 _id, string memory _did) public {
        require(
            users[_id].owner == msg.sender || msg.sender == owner, "Only the owner of a permission can update the did"
        );
        users[_id].did = _did;
    }

    function updateOwner(uint256 _id, address _owner) public {
        require(
            users[_id].owner == msg.sender || msg.sender == owner, "Only the owner of a permission can update the owner"
        );
        users[_id].owner = _owner;
    }

    function update(uint256 _id, string memory _name, string memory _did, address _owner) public {
        require(
            users[_id].owner == address(0) || users[_id].owner == msg.sender || msg.sender == owner,
            "Only the owner of a permission can update the permission"
        );
        require(!exists(_name), "Permission already registered");

        delete userIds[users[_id].name];

        string memory slug = CandorStrings.slugify(_name);
        users[_id].name = slug;
        users[_id].did = _did;
        users[_id].owner = _owner;

        userIds[slug] = _id;
    }

    function update(uint256 _id, string memory _name, string memory _did) public {
        User memory permission = getUser(_id);
        update(_id, _name, _did, permission.owner);
    }
}
