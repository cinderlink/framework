// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import "forge-std/Test.sol";
import {console} from "forge-std/console.sol";
import "./CinderStaking.sol";
import "../Token/CinderToken.sol";

contract CinderStakingTest is Test {
    CinderToken token;
    CinderStaking staking;
    address deployer;
    address delegate;

    uint256 minStakeAmount = 1000000000;

    function setUp() public {
        deployer = vm.addr(1);
        delegate = vm.addr(2);
        vm.startPrank(deployer);
        token = new CinderToken();
        staking = new CinderStaking(address(token));
        token.mint(deployer, minStakeAmount * 10);
    }

    function _setupDelegate(uint256 _approve, uint256 _stake, uint256 _reward) internal {
        token.mint(delegate, _approve);
        vm.stopPrank();
        vm.startPrank(delegate);
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

    function testStake() public {
        token.approve(address(staking), minStakeAmount);
        staking.stake(minStakeAmount);
        require(staking.balanceOf(deployer) == minStakeAmount, "Staking: balanceOf != amount");
    }

    function testUnstake() public {
        token.approve(address(staking), minStakeAmount);
        staking.stake(minStakeAmount);
        require(staking.balanceOf(deployer) == minStakeAmount, "Staking: balanceOf != amount");
        staking.unstake(minStakeAmount);
        require(staking.balanceOf(deployer) == 0, "Staking: balanceOf != 0");
    }

    function testRewards() public {
        token.approve(address(staking), minStakeAmount);
        staking.stake(minStakeAmount);

        _setupDelegate();
        require(staking.pendingRewards(deployer) != 0, "staking: pendingRewards == 0");
    }

    function testClaim() public {
        token.approve(address(staking), minStakeAmount);
        staking.stake(minStakeAmount);

        _setupDelegate();
        staking.claim();
        require(staking.pendingRewards(deployer) == 0, "staking: pendingRewards != 0");
    }

    function testDelegate() public {
        token.approve(address(staking), minStakeAmount);
        staking.stake(minStakeAmount);

        _setupDelegate();

        staking.delegate(delegate);
        require(staking.getDelegate(deployer) == delegate, "Staking: delegate invalid");
    }

    function testDelegations() public {
        token.approve(address(staking), minStakeAmount);
        staking.stake(minStakeAmount);

        _setupDelegate();

        staking.delegate(delegate);
        require(staking.getDelegationAddresses(delegate)[0] == deployer, "Staking: delegations[0] != deployer");
    }

    function testVotingPower() public {
        token.approve(address(staking), minStakeAmount);
        staking.stake(minStakeAmount);

        _setupDelegate();

        staking.delegate(delegate);
        require(staking.votingPower(delegate) == minStakeAmount * 2, "Staking: votingPower != minStakeAmount * 2");
    }
}
