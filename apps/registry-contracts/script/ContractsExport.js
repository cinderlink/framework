import minimist from "minimist";
import fs from "fs";

const argv = minimist(process.argv.slice(2));

const format = argv.format || "json";

if (["json", "ts"].indexOf(format) === -1) {
  throw new Error("Unknown format");
}

const contracts = {};

if (fs.existsSync("export/")) {
  fs.rmSync("export/", { recursive: true });
}

fs.mkdirSync(`export/contracts`, { recursive: true });

["Deploy.s.sol", "DeployNFT.s.sol"].forEach((script) => {
  const artifact = JSON.parse(
    fs.readFileSync("./broadcast/" + script + "/31337/run-latest.json", "utf8")
  );

  if (artifact && artifact.transactions) {
    for (let tx of artifact.transactions) {
      if (tx.contractName && tx.contractAddress) {
        const { abi } = JSON.parse(
          fs.readFileSync(
            `./out/${tx.contractName}.sol/${tx.contractName}.json`,
            "utf8"
          )
        );
        contracts[tx.contractName] = tx.contractAddress;

        fs.writeFileSync(
          `export/contracts/${tx.contractName}.${format}`,
          format === "json"
            ? JSON.stringify({ abi, address: tx.contractAddress }, null, 2)
            : `export const ${tx.contractName} = {
  abi: ${JSON.stringify(abi)}, 
  address: "${tx.contractAddress}" 
};
export default ${tx.contractName};
`
        );
      }
    }
  }
});

fs.writeFileSync(
  `export/contracts.${format}`,
  format === "json"
    ? JSON.stringify(contracts, null, 2)
    : `
export const contracts = ${JSON.stringify(contracts, null, 2)};
export default contracts;

${Object.keys(contracts)
  .map(
    (contract) =>
      `export { default as ${contract} } from "./contracts/${contract}";`
  )
  .join("\n")}
`
);
console.info(`contracts exported to export/contracts.${format}`);
