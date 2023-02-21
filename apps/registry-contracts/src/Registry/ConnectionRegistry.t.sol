// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import "forge-std/Test.sol";
import "./ConnectionRegistry.sol";
import "./EntityTypeRegistry.sol";
import "./EntityRegistry.sol";
import "./UserRegistry.sol";
import "./PermissionRegistry.sol";

contract ConnectionRegistryTest is Test {
    UserRegistry public users;
    PermissionRegistry public permissions;
    EntityTypeRegistry public types;
    EntityRegistry public entities;
    ConnectionRegistry public connections;
    address public deployer;
    uint256 userId;
    uint256 typeId;
    uint256 fooId;
    uint256 barId;
    uint256 bazId;

    function setUp() public {
        deployer = vm.addr(1);
        vm.startPrank(deployer);
        users = new UserRegistry();
        permissions = new PermissionRegistry(address(users));
        types = new EntityTypeRegistry("test.types", address(permissions));
        entities = new EntityRegistry("test.entities", address(permissions), address(types));
        connections = new ConnectionRegistry("test.connections", address(permissions), address(entities));
        userId = users.register("test", "test");
        typeId = types.register("test");
        fooId = entities.register("foo", typeId);
        barId = entities.register("bar", typeId);
        bazId = entities.register("baz", typeId);
    }

    function testLinkConnection() public {
        uint256 id = connections.connect(fooId, barId, connections.CONNECTION_TYPE_LINK());
        require(id > 0, "ConnectionRegistry: failed to create connection");

        ConnectionRegistry.Connection[] memory _connections = connections.getEntityConnections(fooId);
        require(_connections[0].fromId == fooId, "fromId != fooId");
        require(_connections[0].toId == barId, "toId != barId");

        uint256[] memory _mutualConnectionIds = connections.getMutualConnectionIds(fooId, barId);
        require(_mutualConnectionIds[0] == id, "mutualConnections[0] != id");

        ConnectionRegistry.Connection[] memory _mutualConnections = connections.getMutualConnections(fooId, barId);
        require(_mutualConnections[0].fromId == fooId, "mutualConnections[0].fromId != fooId");
        require(_mutualConnections[0].toId == barId, "mutualConnections[0].toId != barId");
        require(
            _mutualConnections[0].connectionType == connections.CONNECTION_TYPE_LINK(),
            "mutualConnections[0].connectionType != CONNECTION_TYPE_LINK"
        );

        require(
            connections.hasEntityConnection(fooId, barId, connections.CONNECTION_TYPE_LINK()),
            "hasEntityConnection(fooId, barId, CONNECTION_TYPE_LINK) failed"
        );
    }

    function testParentChildConnection() public {
        uint256 id = connections.connect(fooId, barId, connections.CONNECTION_TYPE_PARENT());
        require(id > 0, "ConnectionRegistry: failed to create connection");

        ConnectionRegistry.Connection[] memory _connections = connections.getEntityConnections(fooId);
        require(_connections[0].fromId == fooId, "fromId != fooId");
        require(_connections[0].toId == barId, "toId != barId");

        uint256[] memory _mutualConnectionIds = connections.getMutualConnectionIds(fooId, barId);
        require(_mutualConnectionIds[0] == id, "mutualConnections[0] != id");

        ConnectionRegistry.Connection[] memory _mutualConnections = connections.getMutualConnections(fooId, barId);
        require(_mutualConnections[0].fromId == fooId, "mutualConnections[0].fromId != fooId");
        require(_mutualConnections[0].toId == barId, "mutualConnections[0].toId != barId");
        require(
            _mutualConnections[0].connectionType == connections.CONNECTION_TYPE_PARENT(),
            "mutualConnections[0].connectionType != CONNECTION_TYPE_PARENT_CHILD"
        );

        require(
            connections.hasEntityConnection(barId, fooId, connections.CONNECTION_TYPE_CHILD()),
            "hasEntityConnection(barId, fooId, CONNECTION_TYPE_CHILD) failed"
        );
    }

    function testAliasConnection() public {
        uint256 id = connections.connect(fooId, barId, connections.CONNECTION_TYPE_ALIAS());
        require(id > 0, "ConnectionRegistry: failed to create connection");

        ConnectionRegistry.Connection[] memory _connections = connections.getEntityConnections(fooId);
        require(_connections[0].fromId == fooId, "fromId != fooId");
        require(_connections[0].toId == barId, "toId != barId");

        uint256[] memory _mutualConnectionIds = connections.getMutualConnectionIds(fooId, barId);
        require(_mutualConnectionIds[0] == id, "mutualConnections[0] != id");

        ConnectionRegistry.Connection[] memory _mutualConnections = connections.getMutualConnections(fooId, barId);
        require(_mutualConnections[0].fromId == fooId, "mutualConnections[0].fromId != fooId");
        require(_mutualConnections[0].toId == barId, "mutualConnections[0].toId != barId");
        require(
            _mutualConnections[0].connectionType == connections.CONNECTION_TYPE_ALIAS(),
            "mutualConnections[0].connectionType != CONNECTION_TYPE_ALIAS"
        );

        require(
            connections.hasEntityConnection(fooId, barId, connections.CONNECTION_TYPE_ALIAS()),
            "hasEntityConnection(fooId, barId, CONNECTION_TYPE_ALIAS) failed"
        );
    }

    function testDisconnect() public {
        uint256 id = connections.connect(fooId, barId, connections.CONNECTION_TYPE_LINK());
        require(id > 0, "ConnectionRegistry: failed to create connection");

        connections.disconnect(fooId, barId, connections.CONNECTION_TYPE_LINK());
        require(
            !connections.hasEntityConnection(fooId, barId, connections.CONNECTION_TYPE_LINK()),
            "hasEntityConnection(fooId, barId, CONNECTION_TYPE_LINK) failed"
        );
        require(
            !connections.hasEntityConnection(barId, fooId, connections.CONNECTION_TYPE_LINK()),
            "hasEntityConnection(barId, fooId, CONNECTION_TYPE_LINK) failed"
        );
        require(connections.getEntityConnections(fooId).length == 0, "getEntityConnections(fooId).length != 0");
        require(connections.getEntityConnections(barId).length == 0, "getEntityConnections(barId).length != 0");
    }
}
