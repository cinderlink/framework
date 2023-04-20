import * as ethers from "ethers";
import { createAddressVerificationMessage } from "./create";

export async function signAddressVerification(
  app: string,
  did: string,
  signer: ethers.Signer
) {
  const address = await signer.getAddress();
  const message = createAddressVerificationMessage(app, did, address);
  return signer.signMessage(message);
}

export async function checkAddressVerification(
  app: string,
  did: string,
  address: string,
  signature: string
) {
  const message = createAddressVerificationMessage(app, did, address);
  const signer = ethers.utils.verifyMessage(message, signature);
  return signer === address;
}
