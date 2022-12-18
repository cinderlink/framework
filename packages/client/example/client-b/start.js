import { createCryptidsClient, createCryptidsSeed } from "../../dist/index.js";
import { config } from "dotenv";
config();

const seed = await createCryptidsSeed("client b");
const client = await createCryptidsClient(seed, []);
await client.start();

client.on("message", (message) => {
  console.info("message", message);
});

await client.subscribe("test");

setTimeout(() => {
  client.publish("test", "hello world");
}, 3000);
