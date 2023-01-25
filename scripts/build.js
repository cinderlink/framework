import path from "path";
import { exec } from "child_process";
import chokidar from "chokidar";
import minimist from "minimist";

const args = minimist(process.argv.slice(2));

// build order
const packages = [
  "packages/core-types",
  // 'packages/peerstore-memory',
  "packages/ipld-database",
  "packages/client",
  "packages/plugin-identity-server",
  "packages/server",
  "packages/server-bin",
  "packages/plugin-social-client",
  "packages/plugin-social-server",
  "packages/test-adapters",
  "ui-kit",
];

const build = (pkg) => {
  const cmd = "pnpm build";
  console.log(`Building ${pkg}...`);
  return new Promise((resolve) =>
    exec(cmd, { cwd: process.cwd() + "/" + pkg }, (err, stdout, stderr) => {
      if (err) {
        throw new Error(`Error building ${pkg}: ${err}`);
      }
      console.log(`${pkg} : ${stdout}`);
      resolve();
    })
  );
};

const watch = async (pkg, buildFirst = true) => {
  if (buildFirst) {
    await build(pkg);
  }
  console.info("watching " + pkg + "/src" + " for changes...");
  chokidar
    .watch(process.cwd() + "/" + pkg + "/src/")
    .on("change", (event, path) => {
      console.log(`File ${path} changed, rebuilding ${pkg}...`);
      return build(pkg);
    });
};

const buildAll = () => {
  return Promise.all(packages.map(build));
};

const watchAll = async (buildFirst) => {
  for (const pkg of packages) {
    await watch(pkg, buildFirst);
  }
};

if (args.watch) {
  watchAll(args.build);
} else if (args.build) {
  buildAll();
}
