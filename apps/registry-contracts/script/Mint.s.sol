// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.17;

import "forge-std/Script.sol";
import "../src/Token/CinderToken.sol";
import "../src/Registry/UserRegistry.sol";

contract MintScript is Script {
    function setUp() public {}

    function run() public {
        uint256 deployerPrivateKey = vm.envUint("DEPLOYER_PRIVATE_KEY");
        vm.startBroadcast(deployerPrivateKey);

        address tokenAddress = vm.envAddress("TOKEN_ADDRESS");
        CinderToken token = CinderToken(tokenAddress);

        address deployer = vm.envAddress("DEPLOYER_ADDRESS");
        token.mint(deployer, 10000000000000000000000);

        address user = vm.envAddress("USER_ADDRESS");
        token.mint(user, 10000000000000000000000);

        vm.stopBroadcast();
    }
}
