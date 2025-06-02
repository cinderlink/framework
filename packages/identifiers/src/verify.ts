import { verifyMessage, type Account, type WalletClient } from "viem";
import { createAddressVerificationMessage } from "./create";

export async function signAddressVerification(
  app: string,
  did: string,
  account: Account,
  walletClient: WalletClient
) {
  const address = account.address;
  const message = createAddressVerificationMessage(app, did, address);
  return walletClient.signMessage({
    account,
    message,
  });
}

export async function checkAddressVerification(
  app: string,
  did: string,
  address: string,
  signature: `0x${string}`
) {
  const message = createAddressVerificationMessage(app, did, address);
  const recoveredAddress = await verifyMessage({
    address: address as `0x${string}`,
    message,
    signature,
  });
  return recoveredAddress;
}
