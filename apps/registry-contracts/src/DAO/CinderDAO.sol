// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

import "../util/Arrays.sol";
import "../util/Strings.sol";
import "./CinderStaking.sol";
import "../Token/CinderToken.sol";
import "../Registry/PermissionedContract.sol";
import "../Registry/EntityRegistry.sol";
import "../Registry/DefinitionRegistry.sol";

contract CinderDAO is PermissionedContract {
    address stakingAddress;
    address tokenAddress;
    address permissionsAddress;
    address entitiesAddress;
    address definitionsAddress;

    CinderStaking staking;
    CinderToken token;
    EntityRegistry entities;
    DefinitionRegistry definitions;

    uint256 proposalSchemaId;
    uint256 voteSchemaId;
    uint256 commentSchemaId;

    struct Proposal {
        uint256 id;
        uint256 entityId;
        uint256 definitionId;
        uint256 version;
        uint256 createdAt;
        uint256[] voteIds;
        uint256[] commentIds;
        uint256 contributorId;
        bool active;
    }

    struct Vote {
        uint256 id;
        bool favor;
        uint256 contributorId;
        uint256 amount;
    }

    struct Comment {
        uint256 id;
        uint256 definitionId;
        uint256 createdAt;
        uint256 contributorId;
    }

    mapping(uint256 => Proposal) proposals;
    mapping(uint256 => Vote) votes;
    mapping(uint256 => Comment) comments;
    mapping(uint256 => uint256) leaderboard;

    uint256 public proposalCount = 0;
    uint256 public voteCount = 0;
    uint256 public commentCount = 0;

    // 10 CNDR
    uint256 public proposalCost = 100;
    uint256 public proposalWinRefund = 90;
    // 1 CNDR
    uint256 public voteCost = 10;
    uint256 public voteWinRefund = 9;
    // .001 CNDR
    uint256 public commentCost = 1;

    uint256 public governanceBalance = 0;
    uint256 public rewardsBalance = 0;

    constructor(
        string memory _namespace,
        address _stakingAddress,
        address _tokenAddress,
        address _permissionsAddress,
        address _entitiesAddress,
        address _definitionsAddress,
        uint256 _proposalSchemaId,
        uint256 _voteSchemaId,
        uint256 _commentSchemaId
    ) PermissionedContract(msg.sender, _namespace, _permissionsAddress) {
        stakingAddress = _stakingAddress;
        staking = CinderStaking(stakingAddress);
        tokenAddress = _tokenAddress;
        token = CinderToken(tokenAddress);
        entities = EntityRegistry(_entitiesAddress);
        definitions = DefinitionRegistry(_definitionsAddress);
        proposalSchemaId = _proposalSchemaId;
        voteSchemaId = _voteSchemaId;
        commentSchemaId = _commentSchemaId;
    }

    function setStakingAddress(address _stakingAddress) public {
        require(msg.sender == owner, "Only owner can set staking address");
        stakingAddress = _stakingAddress;
        staking = CinderStaking(stakingAddress);
    }

    function setTokenAddress(address _tokenAddress) public {
        require(msg.sender == owner, "Only owner can set token address");
        tokenAddress = _tokenAddress;
        token = CinderToken(tokenAddress);
    }

    function setOwner(address _owner) public {
        require(msg.sender == owner, "Only owner can set owner");
        owner = _owner;
    }

    function getOwner() public view returns (address) {
        return owner;
    }

    function getStakingAddress() public view returns (address) {
        return stakingAddress;
    }

    function getTokenAddress() public view returns (address) {
        return tokenAddress;
    }

    function createProposal(uint256 _entityId, uint256 _definitionId) public returns (uint256) {
        require(permissions.userHasPermission(msg.sender, "proposal.create"), "Permission denied");
        require(
            staking.balanceOf(msg.sender) >= staking.minStakeAmount(), string.concat("Insufficient staking balance")
        );
        require(token.balanceOf(msg.sender) >= proposalCost, "Insufficient CNDR balance");
        require(entities.exists(_entityId), "Entity does not exist");
        require(definitions.exists(_definitionId), "Definition does not exist");
        require(
            definitions.getSchemaId(_definitionId) == proposalSchemaId,
            string.concat("Definition is not a proposal (invalid schemaId)")
        );
        require(definitions.getEntityId(_definitionId) == _entityId, "Definition does not belong to entity");

        uint256 userId = permissions.users().getId(msg.sender);

        token.transferFrom(msg.sender, address(this), proposalCost);
        governanceBalance = governanceBalance + proposalCost;

        uint256 version = definitions.getVersion(_definitionId);

        uint256 id = ++proposalCount;
        proposals[id] = Proposal({
            id: id,
            entityId: _entityId,
            definitionId: _definitionId,
            version: version,
            createdAt: block.timestamp,
            voteIds: new uint256[](0),
            commentIds: new uint256[](0),
            contributorId: userId,
            active: true
        });
        return id;
    }

    function vote(uint256 _proposalId, bool _favor, uint256 _amount, uint256 _commentDefinitionId)
        public
        returns (uint256)
    {
        require(permissions.userHasPermission(msg.sender, "proposal.vote"), "Permission denied");
        require(token.balanceOf(msg.sender) > voteCost, "Insufficient CNDR balance");
        require(proposals[_proposalId].active, "Proposal is not active");
        require(definitions.exists(_commentDefinitionId), "Definition does not exist");
        require(definitions.getSchemaId(_commentDefinitionId) == commentSchemaId, "Comment has invalid schema");
        require(
            definitions.getEntityId(_commentDefinitionId) == proposals[_proposalId].entityId,
            "Comment definition does not belong to proposal entity"
        );

        uint256 userId = permissions.users().getId(msg.sender);

        token.transferFrom(msg.sender, address(this), voteCost);
        governanceBalance = governanceBalance + voteCost;

        uint256 id = ++voteCount;
        votes[id] = Vote({id: id, favor: _favor, contributorId: userId, amount: _amount});
        proposals[_proposalId].voteIds.push(id);

        uint256 commentId = ++commentCount;
        comments[commentId] = Comment({
            id: commentId,
            definitionId: _commentDefinitionId,
            createdAt: block.timestamp,
            contributorId: userId
        });
        proposals[_proposalId].commentIds.push(commentId);

        return id;
    }

    function getProposals() public view returns (uint256[] memory) {
        uint256[] memory ids = new uint256[](proposalCount);
        for (uint256 i = 0; i < proposalCount; i++) {
            ids[i] = i + 1;
        }
        return ids;
    }

    function getProposal(uint256 _id) public view returns (Proposal memory) {
        return proposals[_id];
    }

    function getProposalsByEntityId(uint256 _entityId) public view returns (uint256[] memory) {
        uint256[] memory ids = new uint256[](proposalCount);
        uint256 count = 0;
        for (uint256 i = 0; i < proposalCount; i++) {
            if (proposals[i + 1].entityId == _entityId) {
                ids[count] = i + 1;
                count++;
            }
        }
        uint256[] memory result = new uint256[](count);
        for (uint256 i = 0; i < count; i++) {
            result[i] = ids[i];
        }
        return result;
    }
}
