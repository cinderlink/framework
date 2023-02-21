    // SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.17;

import "forge-std/Script.sol";
import "../src/Registry/UserRegistry.sol";

contract RegisterScript is Script {
    function setUp() public {}

    function run() public {
        uint256 userPrivateKey = vm.envUint("USER_PRIVATE_KEY");
        vm.startBroadcast(userPrivateKey);

        address usersAddress = vm.envAddress("REGISTRY_USERS_ADDRESS");
        UserRegistry users = UserRegistry(usersAddress);
        users.register("cndr/user", "user.cid");

        vm.stopBroadcast();
    }
}
