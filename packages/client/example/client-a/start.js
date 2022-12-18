import { createCryptidsClient, createCryptidsSeed } from "../../dist/index.js";
import { config } from "dotenv";
config({ path: "../.env" });

const seed = await createCryptidsSeed("client a seed");
const client = await createCryptidsClient(seed, [
  process.env.IPFS_SWARM_ADDRESSES,
]);
await client.start();
await client.ipfs.swarm.connect(process.env.IPFS_SWARM_ADDRESSES);

client.on("message", (message) => {
  console.info("message", message);
});

await client.subscribe("test");

setTimeout(() => {
  client.publish("test", "hello world");
}, 3000);
