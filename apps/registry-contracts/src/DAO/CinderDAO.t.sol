// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import "forge-std/Test.sol";
import {console} from "forge-std/console.sol";
import "./CinderDAO.sol";
import "./CinderStaking.sol";
import "../Token/CinderToken.sol";
import "../Registry/EntityRegistry.sol";
import "../Registry/EntityTypeRegistry.sol";
import "../Registry/DefinitionRegistry.sol";
import "../Registry/PermissionRegistry.sol";
import "../Registry/SchemaRegistry.sol";
import "../Registry/UserRegistry.sol";

contract CinderDAOTest is Test {
    CinderToken token;
    CinderStaking staking;
    CinderDAO dao;
    UserRegistry users;
    PermissionRegistry permissions;
    EntityTypeRegistry entityTypes;
    EntityRegistry entities;
    DefinitionRegistry definitions;
    SchemaRegistry schemas;

    address deployer;
    uint256 deployerUserId;
    address delegate;
    uint256 delegateUserId;
    uint256 proposalSchemaId;
    uint256 voteSchemaId;
    uint256 commentSchemaId;

    uint256 minStakeAmount = 1000000000;

    function setUp() public {
        deployer = vm.addr(1);
        delegate = vm.addr(2);
        vm.startPrank(deployer);
        token = new CinderToken();
        staking = new CinderStaking(address(token));
        users = new UserRegistry();
        permissions = new PermissionRegistry(address(users));
        schemas = new SchemaRegistry("test.schema", address(permissions));
        entityTypes = new EntityTypeRegistry("test.entityType", address(permissions));
        entities = new EntityRegistry("test.entity", address(permissions), address(schemas));
        definitions =
            new DefinitionRegistry("test.definitions", address(permissions), address(entities), address(schemas));

        deployerUserId = users.register("deployer", "deployer.cid");
        proposalSchemaId = schemas.register("test.proposal", "test.proposal");
        voteSchemaId = schemas.register("test.vote", "test.vote");
        commentSchemaId = schemas.register("test.comment", "test.comment");

        dao = new CinderDAO(
            "test.dao",
            address(staking),
            address(token),
            address(permissions),
            address(entities),
            address(definitions),
            proposalSchemaId,
            voteSchemaId,
            commentSchemaId
        );
        token.mint(deployer, minStakeAmount * 10);
    }

    function _setupDelegate(uint256 _approve, uint256 _stake, uint256 _reward) internal {
        token.mint(delegate, _approve);
        vm.stopPrank();
        vm.startPrank(delegate);
        delegateUserId = users.register("delegate", "delegate.cid");
        token.approve(address(staking), _approve);
        if (_stake > 0) {
            staking.stake(_stake);
        }
        if (_reward > 0) {
            staking.rewardStakers(_reward);
        }
        vm.stopPrank();
        vm.startPrank(deployer);
        staking.distributeRewards();
    }

    function _setupDelegate(uint256 _reward) internal {
        _setupDelegate(minStakeAmount * 10, minStakeAmount, _reward);
    }

    function _setupDelegate() internal {
        _setupDelegate(minStakeAmount * 10, minStakeAmount, minStakeAmount);
    }

    function testCreateProposal() public {
        _setupDelegate();
        uint256 proposalEntityId = entities.register("test.proposal", proposalSchemaId);
        uint256 proposalDefinitionId =
            definitions.register(proposalEntityId, proposalSchemaId, "test.proposal.definition");
        token.approve(address(staking), staking.minStakeAmount());
        staking.stake(staking.minStakeAmount());
        token.approve(address(dao), dao.proposalCost());
        uint256 proposalId = dao.createProposal(proposalEntityId, proposalDefinitionId);
        require(dao.getProposal(proposalId).id == proposalId, "proposal id should match");
        require(dao.getProposal(proposalId).entityId == proposalEntityId, "proposal entity id should match");
        require(dao.getProposal(proposalId).definitionId == proposalDefinitionId, "proposal definition id should match");
    }

    function testCannotCreateProposalWithoutStake() public {
        token.approve(address(dao), dao.proposalCost());
        _setupDelegate();
        uint256 proposalEntityId = entities.register("test.proposal", proposalSchemaId);
        uint256 proposalDefinitionId =
            definitions.register(proposalEntityId, proposalSchemaId, "test.proposal.definition");
        vm.expectRevert("Insufficient staking balance");
        dao.createProposal(proposalEntityId, proposalDefinitionId);
    }

    function testCannotCreateProposalWithInvalidData() public {
        token.approve(address(dao), dao.proposalCost());
        token.approve(address(staking), staking.minStakeAmount());
        staking.stake(staking.minStakeAmount());
        _setupDelegate();
        uint256 proposalEntityId = entities.register("test.proposal", 1);
        uint256 proposalDefinitionId =
            definitions.register(proposalEntityId, proposalSchemaId, "test.proposal.definition");
        vm.expectRevert("Entity does not exist");
        dao.createProposal(proposalEntityId + 1, proposalDefinitionId);

        uint256 secondEntityId = entities.register("test.proposal2", 1);
        uint256 secondSchemaId = schemas.register("test.proposal2", "test.proposal2");
        uint256 secondDefinitionId = definitions.register(secondEntityId, secondSchemaId, "test.proposal2.definition");

        vm.expectRevert("Definition does not belong to entity");
        dao.createProposal(secondEntityId, proposalDefinitionId);

        vm.expectRevert("Definition is not a proposal (invalid schemaId)");
        dao.createProposal(proposalEntityId, secondDefinitionId);

        vm.expectRevert("Definition is not a proposal (invalid schemaId)");
        dao.createProposal(secondEntityId, secondDefinitionId);
    }
}
