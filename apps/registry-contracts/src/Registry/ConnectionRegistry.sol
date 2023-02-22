// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

import "forge-std/console.sol";
import "../util/Strings.sol";
import "../util/Arrays.sol";
import "./PermissionedContract.sol";
import "./EntityRegistry.sol";

contract ConnectionRegistry is PermissionedContract {
    uint8 public constant CONNECTION_TYPE_LINK = 1;
    uint8 public constant CONNECTION_TYPE_PARENT = 2;
    uint8 public constant CONNECTION_TYPE_CHILD = 3;
    uint8 public constant CONNECTION_TYPE_ALIAS = 4;

    event ConnectionCreated(uint256 id, uint256 fromId, uint256 toId, uint8 connectionType, uint256 contributorId);
    event ConnectionDeleted(uint256 id, uint256 fromId, uint256 toId, uint8 connectionType, uint256 contributorId);

    struct Connection {
        uint256 id;
        uint256 fromId;
        uint256 toId;
        uint8 connectionType;
        uint256 contributorId;
    }

    struct EntityDef {
        uint256 id;
        uint256[] connectionIds;
    }

    EntityRegistry public entities;
    mapping(uint256 => EntityDef) public entityConnections;
    mapping(uint256 => Connection) public connections;

    uint256 public counter = 0;

    constructor(string memory _permissionPrefix, address _permissionAddr, address _entitiesAddr)
        PermissionedContract(msg.sender, _permissionPrefix, _permissionAddr)
    {
        entities = EntityRegistry(_entitiesAddr);
    }

    function exists(uint256 _id) public view returns (bool) {
        return connections[_id].id > 0;
    }

    function hasEntityConnection(uint256 _fromEntityId, uint256 _toEntityId, uint8 _connectionType)
        public
        view
        returns (bool)
    {
        uint256[] memory _connections = getMutualConnectionIds(_fromEntityId, _toEntityId, _connectionType);
        return _connections.length > 0;
    }

    function hasEntityConnection(uint256 _fromId, uint256 _toId) public view returns (bool) {
        uint256[] memory _connections = getMutualConnectionIds(_fromId, _toId);
        return _connections.length > 0;
    }

    function getEntityConnectionIds(uint256 _entityId) public view returns (uint256[] memory) {
        return entityConnections[_entityId].connectionIds;
    }

    function getEntityConnectionIds(uint256 _entityId, uint8 _connectionType) public view returns (uint256[] memory) {
        EntityDef memory entity = entityConnections[_entityId];
        uint256[] memory matches = entity.connectionIds;
        uint256[] memory filtered = new uint256[](matches.length);
        uint256 count = 0;
        for (uint256 i = 0; i < matches.length; i++) {
            Connection memory connection = connections[matches[i]];
            if (connection.connectionType == _connectionType) {
                filtered[count] = connection.id;
                count++;
            }
        }
        return Arrays.slice(filtered, 0, count);
    }

    function getEntityConnections(uint256 _entityId) public view returns (Connection[] memory) {
        EntityDef memory entity = entityConnections[_entityId];
        uint256[] memory matches = entity.connectionIds;
        Connection[] memory result = new Connection[](matches.length);
        for (uint256 i = 0; i < matches.length; i++) {
            result[i] = connections[matches[i]];
        }
        return result;
    }

    function getEntityConnections(uint256 _entityId, uint8 _connectionType) public view returns (Connection[] memory) {
        uint256[] memory _matches = getEntityConnectionIds(_entityId, _connectionType);
        Connection[] memory result = new Connection[](_matches.length);
        for (uint256 i = 0; i < _matches.length; i++) {
            result[i] = connections[_matches[i]];
        }
        return result;
    }

    function getMutualConnectionIds(uint256 _fromId, uint256 _toId) public view returns (uint256[] memory) {
        EntityDef memory fromEntity = entityConnections[_fromId];
        uint256[] memory matches = fromEntity.connectionIds;
        uint256[] memory filtered = new uint256[](matches.length);
        uint256 count = 0;
        for (uint256 i = 0; i < matches.length; i++) {
            Connection memory connection = connections[matches[i]];
            if (connection.toId == _toId) {
                filtered[count] = connection.id;
                count++;
            }
        }
        return Arrays.slice(filtered, 0, count);
    }

    function getMutualConnectionIds(uint256 _fromId, uint256 _toId, uint8 _connectionType)
        public
        view
        returns (uint256[] memory)
    {
        EntityDef memory fromEntity = entityConnections[_fromId];
        uint256[] memory matches = fromEntity.connectionIds;
        uint256[] memory filtered = new uint256[](matches.length);
        uint256 count = 0;
        for (uint256 i = 0; i < matches.length; i++) {
            Connection memory connection = connections[matches[i]];
            if (connection.toId == _toId && connection.connectionType == _connectionType) {
                filtered[count] = connection.id;
                count++;
            }
        }
        return Arrays.slice(filtered, 0, count);
    }

    function getMutualConnections(uint256 _fromId, uint256 _toId) public view returns (Connection[] memory) {
        uint256[] memory _matches = getMutualConnectionIds(_fromId, _toId);
        Connection[] memory result = new Connection[](_matches.length);
        for (uint256 i = 0; i < _matches.length; i++) {
            result[i] = connections[_matches[i]];
        }
        return result;
    }

    function getMutualConnections(uint256 _fromId, uint256 _toId, uint8 _connectionType)
        public
        view
        returns (Connection[] memory)
    {
        uint256[] memory _matches = getMutualConnectionIds(_fromId, _toId, _connectionType);
        Connection[] memory result = new Connection[](_matches.length);
        for (uint256 i = 0; i < _matches.length; i++) {
            result[i] = connections[_matches[i]];
        }
        return result;
    }

    function getConnection(uint256 _id) public view returns (Connection memory) {
        return connections[_id];
    }

    function getEntityConnection(uint256 _fromEntity, uint256 _toEntity, uint8 _connectionType)
        public
        view
        returns (Connection memory)
    {
        uint256[] memory _matches = getMutualConnectionIds(_fromEntity, _toEntity, _connectionType);
        require(_matches.length > 0, "No connection found");
        return connections[_matches[0]];
    }

    function connect(uint256 _fromEntity, uint256 _toEntity, uint8 _connectionType) public returns (uint256) {
        requirePermission("connect");
        require(entities.exists(_fromEntity), "From entity does not exist");
        require(entities.exists(_toEntity), "To entity does not exist");
        require(!hasEntityConnection(_fromEntity, _toEntity, _connectionType), "Connection already exists");
        uint256 contributorId = permissions.users().getId(msg.sender);
        uint256 connectionId = ++counter;
        Connection memory connection = Connection(connectionId, _fromEntity, _toEntity, _connectionType, contributorId);
        connections[connectionId] = connection;
        entityConnections[_fromEntity].connectionIds.push(connectionId);
        emit ConnectionCreated(connectionId, _fromEntity, _toEntity, _connectionType, contributorId);

        // Create a corresponding connection in the other direction
        uint256 reverseConnectionId = ++counter;
        uint8 reverseConnectionType = _connectionType == CONNECTION_TYPE_PARENT
            ? CONNECTION_TYPE_CHILD
            : _connectionType == CONNECTION_TYPE_CHILD ? CONNECTION_TYPE_PARENT : _connectionType;
        Connection memory reverseConnection =
            Connection(reverseConnectionId, _toEntity, _fromEntity, reverseConnectionType, contributorId);
        connections[reverseConnectionId] = reverseConnection;
        entityConnections[_toEntity].connectionIds.push(reverseConnectionId);
        emit ConnectionCreated(reverseConnectionId, _toEntity, _fromEntity, reverseConnectionType, contributorId);

        return connectionId;
    }

    function disconnect(uint256 _fromEntity, uint256 _toEntity, uint8 _connectionType) public {
        requirePermission("disconnect");
        require(entities.exists(_fromEntity), "From entity does not exist");
        require(entities.exists(_toEntity), "To entity does not exist");
        require(hasEntityConnection(_fromEntity, _toEntity, _connectionType), "Connection does not exist");
        EntityDef memory entity = entityConnections[_fromEntity];
        uint256[] memory matches = entity.connectionIds;
        uint256 connectionId = 0;
        for (uint256 i = 0; i < matches.length; i++) {
            Connection memory connection = connections[matches[i]];
            if (connection.toId == _toEntity && connection.connectionType == _connectionType) {
                connectionId = connection.id;
                break;
            }
        }
        require(connectionId > 0, "Connection does not exist");
        uint256 contributorId = permissions.users().getId(msg.sender);
        delete connections[connectionId];
        entityConnections[_fromEntity].connectionIds = Arrays.remove(entity.connectionIds, connectionId);
        emit ConnectionDeleted(connectionId, _fromEntity, _toEntity, _connectionType, contributorId);

        uint8 reverseConnectionType = _connectionType == CONNECTION_TYPE_PARENT
            ? CONNECTION_TYPE_CHILD
            : _connectionType == CONNECTION_TYPE_CHILD ? CONNECTION_TYPE_PARENT : _connectionType;
        Connection memory reverseEntity = getEntityConnection(_toEntity, _fromEntity, reverseConnectionType);
        delete connections[reverseEntity.id];
        entityConnections[_toEntity].connectionIds =
            Arrays.remove(entityConnections[_toEntity].connectionIds, reverseEntity.id);
        emit ConnectionDeleted(reverseEntity.id, _toEntity, _fromEntity, reverseConnectionType, contributorId);
    }

    function disconnect(uint256 _fromEntity, uint256 _toEntity) public {
        EntityDef memory entity = entityConnections[_fromEntity];
        uint256[] memory matches = entity.connectionIds;
        for (uint256 i = 0; i < matches.length; i++) {
            Connection memory connection = connections[matches[i]];
            if (connection.toId == _toEntity) {
                delete connections[connection.id];
                entityConnections[_fromEntity].connectionIds = Arrays.remove(entity.connectionIds, connection.id);
            }
        }
    }
}
