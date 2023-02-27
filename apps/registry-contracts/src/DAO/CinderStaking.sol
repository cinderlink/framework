// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

// ERC20 staking contract

import "../util/CandorArrays.sol";
import "../Registry/PermissionedContract.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";
import "@openzeppelin/contracts/utils/Address.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract CinderStaking {
    address public owner;
    address public dao;

    address public tokenAddress;
    uint256 public totalStaked;
    uint256 public totalRewards;
    uint256 public totalRewardsClaimed;

    uint256 public daoBalance;
    uint256 public ownerBalance;

    uint256 public minStakeAmount = 1000;
    uint256 public earlyUnstakeInterval = 7 days;
    uint256 public earlyUnstakeFee = 10; // 10% early unstake fee
    uint256 public unstakeFee = 2; // 2% unstake fee
    uint256 public claimFee = 1; // 1% claim fee
    uint256 public rewardFee = 1; // 1% reward fee
    uint256 public ownerFeePercentage = 10; // 10% of collected fees go to owner, 90% to DAO

    struct Staker {
        uint256 amountStaked;
        uint256 rewardsClaimed;
        uint256 rewards;
        uint256 lastClaimed;
        address staker;
        address delegate;
    }

    uint256 public counter = 0;
    mapping(uint256 => Staker) stakers;
    mapping(address => uint256) stakerIds;
    mapping(uint256 => uint256[]) delegations;

    event Staked(address indexed staker, uint256 amount);
    event Unstaked(address indexed staker, uint256 amount);
    event Claimed(address indexed staker, uint256 amount);

    constructor(address _tokenAddress) {
        owner = msg.sender;
        tokenAddress = _tokenAddress;
    }

    function stake(uint256 _amount) public {
        require(_amount >= minStakeAmount, string.concat("Cannot stake less than ", CandorStrings.uint2str(minStakeAmount)));
        IERC20(tokenAddress).transferFrom(msg.sender, address(this), _amount);

        uint256 stakerId;
        if (stakerIds[msg.sender] != 0) {
            stakerId = stakerIds[msg.sender];
        } else {
            stakerId = ++counter;
            stakers[stakerId] = Staker(0, 0, 0, 0, msg.sender, address(0));
            stakerIds[msg.sender] = stakerId;
        }

        stakers[stakerId].amountStaked += _amount;
        totalStaked += _amount;
        emit Staked(msg.sender, _amount);
    }

    function unstake(uint256 _amount) public {
        require(_amount > 0, "Cannot unstake 0");
        uint256 stakerId = stakerIds[msg.sender];
        require(stakers[stakerId].amountStaked >= _amount, "Cannot unstake more than staked");

        bool isEarly = block.timestamp - stakers[stakerId].lastClaimed < earlyUnstakeInterval;
        uint256 fee = isEarly ? earlyUnstakeFee : unstakeFee;
        uint256 feeAmount = _amount * fee / 100;
        uint256 amountToTransfer = _amount - feeAmount;

        stakers[stakerId].amountStaked -= _amount;
        totalStaked -= _amount;
        IERC20(tokenAddress).transfer(msg.sender, amountToTransfer);
        uint256 ownerFeeAmount = feeAmount * ownerFeePercentage / 100;
        ownerBalance += ownerFeeAmount;
        daoBalance += feeAmount - ownerFeeAmount;

        emit Unstaked(msg.sender, _amount);
    }

    function claim() public {
        uint256 stakerId = stakerIds[msg.sender];
        require(stakers[stakerId].rewards > 0, "No rewards to claim");

        uint256 fee = claimFee;
        uint256 feeAmount = stakers[stakerId].rewards * fee / 100;
        uint256 amountToTransfer = stakers[stakerId].rewards - feeAmount;
        stakers[stakerId].rewardsClaimed += stakers[stakerId].rewards;
        totalRewardsClaimed += stakers[stakerId].rewards;
        stakers[stakerId].rewards = 0;
        stakers[stakerId].lastClaimed = block.timestamp;
        IERC20(tokenAddress).transfer(msg.sender, amountToTransfer);
        uint256 ownerFeeAmount = feeAmount * ownerFeePercentage / 100;
        ownerBalance += ownerFeeAmount;
        daoBalance += feeAmount - ownerFeeAmount;

        emit Claimed(msg.sender, amountToTransfer);
    }

    function delegate(address _delegate) public {
        require(_delegate != address(0), "Cannot delegate to 0 address");
        require(_delegate != msg.sender, "Cannot delegate to self");

        uint256 stakerId = stakerIds[msg.sender];
        uint256 delegateId = stakerIds[_delegate];
        require(stakers[delegateId].amountStaked > 0, "Cannot delegate to non-staker");

        uint256 delegateIndex = CandorArrays.indexOf(delegations[delegateId], stakerId);
        require(delegateIndex == type(uint256).max, "Already delegated to this address");

        stakers[stakerId].delegate = _delegate;
        delegations[delegateId].push(stakerId);
    }

    function getDelegate(address _staker) public view returns (address) {
        uint256 stakerId = stakerIds[_staker];
        return stakers[stakerId].delegate;
    }

    function getStaker(address _staker) public view returns (Staker memory) {
        require(_staker != address(0), "Cannot get staker for 0 address");
        uint256 stakerId = stakerIds[_staker];
        return stakers[stakerId];
    }

    function getStakerId(address _staker) public view returns (uint256) {
        return stakerIds[_staker];
    }

    function getDelegatedAmount(address _delegate) public view returns (uint256) {
        require(_delegate != address(0), "Cannot get delegations for 0 address");
        require(stakerIds[_delegate] > 0, "Cannot get delegations for non-staker");
        uint256 delegatedAmount = 0;
        uint256 delegateId = stakerIds[_delegate];
        for (uint256 i = 0; i < delegations[delegateId].length; i++) {
            delegatedAmount += stakers[delegations[delegateId][i]].amountStaked;
        }
        return delegatedAmount;
    }

    function getDelegationIds(address _delegate) public view returns (uint256[] memory) {
        require(_delegate != address(0), "Cannot get delegations for 0 address");
        require(stakerIds[_delegate] > 0, "Cannot get delegations for non-staker");

        uint256 delegateId = stakerIds[_delegate];
        return delegations[delegateId];
    }

    function getDelegationAddresses(address _delegate) public view returns (address[] memory) {
        require(_delegate != address(0), "Cannot get delegations for 0 address");
        require(stakerIds[_delegate] > 0, "Cannot get delegations for non-staker");

        uint256 delegateId = stakerIds[_delegate];
        address[] memory delegationAddresses = new address[](delegations[delegateId].length);
        for (uint256 i = 0; i < delegations[delegateId].length; i++) {
            delegationAddresses[i] = stakers[delegations[delegateId][i]].staker;
        }
        return delegationAddresses;
    }

    function votingPower(address _staker) public view returns (uint256) {
        require(_staker != address(0), "Cannot get voting power for 0 address");
        uint256 stakerId = stakerIds[_staker];
        return stakers[stakerId].amountStaked + getDelegatedAmount(_staker);
    }

    function balanceOf(address _staker) public view returns (uint256) {
        uint256 stakerId = stakerIds[_staker];
        return stakers[stakerId].amountStaked;
    }

    function pendingRewards(address _staker) public view returns (uint256) {
        uint256 stakerId = stakerIds[_staker];
        return stakers[stakerId].rewards;
    }

    function totalSupply() public view returns (uint256) {
        return totalStaked;
    }

    function setDAO(address _dao) public {
        require(msg.sender == owner, "Only owner can set DAO");
        dao = _dao;
    }

    function setEarlyUnstakeInterval(uint256 _earlyUnstakeInterval) public {
        require(msg.sender == owner, "Only owner can set early unstake interval");
        earlyUnstakeInterval = _earlyUnstakeInterval;
    }

    function setEarlyUnstakeFee(uint256 _earlyUnstakeFee) public {
        require(msg.sender == owner, "Only owner can set early unstake fee");
        earlyUnstakeFee = _earlyUnstakeFee;
    }

    function setUnstakeFee(uint256 _unstakeFee) public {
        require(msg.sender == owner, "Only owner can set unstake fee");
        unstakeFee = _unstakeFee;
    }

    function setClaimFee(uint256 _claimFee) public {
        require(msg.sender == owner, "Only owner can set claim fee");
        claimFee = _claimFee;
    }

    function setOwnerFeePercentage(uint256 _ownerFeePercentage) public {
        require(msg.sender == owner, "Only owner can set owner fee percentage");
        ownerFeePercentage = _ownerFeePercentage;
    }

    function rewardStakers(uint256 _amount) public {
        IERC20(tokenAddress).transferFrom(msg.sender, address(this), _amount);
    }

    function rewardDao(uint256 _amount) public {
        IERC20(tokenAddress).transferFrom(msg.sender, address(this), _amount);
        daoBalance += _amount;
    }

    function rewardOwner(uint256 _amount) public {
        IERC20(tokenAddress).transferFrom(msg.sender, address(this), _amount);
        ownerBalance += _amount;
    }

    function rewardStaker(address _staker, uint256 _amount) public {
        uint256 stakerId = stakerIds[_staker];
        IERC20(tokenAddress).transferFrom(msg.sender, address(this), _amount);
        stakers[stakerId].rewards += _amount;
        totalRewards += _amount;
    }

    // distribute balance above balances to stakers as rewards
    function distributeRewards() public returns (uint256) {
        require(msg.sender == owner, "Only owner can distribute rewards");
        uint256 balance = IERC20(tokenAddress).balanceOf(address(this));
        uint256 totalBalance = balance - ownerBalance - daoBalance;
        uint256 totalRewardsToDistribute = totalBalance - totalRewards;
        require(totalRewardsToDistribute > 0, "No rewards to distribute");

        for (uint256 i = 1; i <= counter; i++) {
            uint256 stakerRewards = (totalRewardsToDistribute * stakers[i].amountStaked) / totalStaked;
            stakers[i].rewards += stakerRewards;
            totalRewards += stakerRewards;
        }

        return totalRewardsToDistribute;
    }

    function withdrawOwnerFees() public {
        require(msg.sender == owner, "Only owner can withdraw");
        IERC20(tokenAddress).transfer(owner, ownerBalance);
        ownerBalance = 0;
    }

    function withdrawDAOFees() public {
        require(msg.sender == dao, "Only DAO can withdraw");
        IERC20(tokenAddress).transfer(dao, daoBalance);
        daoBalance = 0;
    }
}
