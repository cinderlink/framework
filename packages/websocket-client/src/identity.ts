import {
  Account,
  HDAccount,
  PrivateKeyAccount,
  privateKeyToAccount,
} from 'viem/accounts';
import { base32 } from 'multiformats/bases/base32';
import { sha256 } from 'multiformats/hashes/sha2';
import { createDID } from '@cinderlink/identifiers';
import * as json from 'multiformats/codecs/json';
import { Client, WalletClient } from 'viem';
import { CinderlinkIdentity, CinderlinkCredentials } from './types';

export async function createIdentity<
  Type extends 'wallet' | 'hd' | 'pkey' = 'pkey',
>(
  listenerId: string,
  credentials: CinderlinkCredentials,
  type: Type,
  signer: Type extends 'wallet'
    ? Account | `0x${string}`
    : Type extends 'hd'
    ? HDAccount
    : PrivateKeyAccount,
  client:
    | (Type extends 'wallet' ? WalletClient : Client | undefined)
    | undefined = undefined,
): Promise<CinderlinkIdentity<'pkey', boolean>> {
  const _hashed = await hashCredentials(credentials);
  const _did = await createDID(_hashed);

  let account: PrivateKeyAccount;
  if (type === 'wallet') {
    if (!client) {
      throw new Error(
        `Cannot create a wallet account without a client instance`,
      );
    }
    const _signature = await (client as WalletClient).signMessage({
      account: signer as Account,
      message: createSignatureMessage(
        (signer as Account).address,
        credentials.username,
        base32.encode(_hashed),
      ),
    });

    account = await deriveAccountFromSignature(_signature);
  } else {
    const _signature = await (
      signer as HDAccount | PrivateKeyAccount
    ).signMessage({
      message: createSignatureMessage(
        (signer as HDAccount | PrivateKeyAccount).address,
        credentials.username,
        base32.encode(_hashed),
      ),
    });

    account = await deriveAccountFromSignature(_signature);
  }
  return {
    id: _did.id,
    listenerId,
    address: account.address,
    account,
    did: _did,
    client,
  };
}

export async function hashCredentials(credentials: CinderlinkCredentials) {
  return await sha256.encode(json.encode(credentials));
}

export function createSignatureMessage(
  address: `0x${string}`,
  username: string,
  hashedCredentials: string,
) {
  return `${address} logging in as ${username} on cinderlink (${hashedCredentials})`;
}

export async function deriveAccountFromSignature(signature: `0x${string}`) {
  const _account = await privateKeyToAccount(
    signature.substring(0, 66) as `0x${string}`,
  );
  return _account;
}
