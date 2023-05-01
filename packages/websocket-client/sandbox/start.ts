import { mnemonicToAccount } from 'viem/accounts';
import { createIdentity } from '../src/identity';
import { CinderlinkWebSocketClient } from '../src/client';
import { createListenerId } from '../src/listenerid';
import { CinderlinkCredentials } from '../src/types';
import { handshakeProtocol } from '../src/protocols/handshake';

const testMnemonic =
  'nature crop car heavy lawsuit loyal cram hospital amused sugar apple similar';

(async () => {
  const user: CinderlinkCredentials = {
    username: 'test@cinderlink.com',
    password: 'testing123?!',
  };
  const wallet = mnemonicToAccount(testMnemonic);
  const listenerId = await createListenerId(
    ['ws://localhost:42069/server-a'],
    wallet.address,
  );
  const identity = await createIdentity(listenerId, user, 'hd', wallet);

  console.info(
    `origin address: ${wallet.address}\ncinderlink address: ${identity.address}\ndid: ${identity.did.id}\nlistenerId: ${listenerId}`,
  );

  const client = new CinderlinkWebSocketClient(identity);
  handshakeProtocol(client);
  await client.connectToListenerId('mANrcqJOU3tvMz9fL2OHYn6aemaSk');
})();
