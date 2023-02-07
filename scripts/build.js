import path from "path";
import { exec } from "child_process";
import chokidar from "chokidar";
import minimist from "minimist";

const args = minimist(process.argv.slice(2));

const building = {};
const lastBuild = {};

// build order
const packages = [
  "packages/core-types",
  // 'packages/peerstore-memory',
  "packages/ipld-database",
  "packages/client",
  "packages/plugin-identity-server",
  "packages/server",
  "packages/server-bin",
  "packages/plugin-social-core",
  "packages/plugin-social-client",
  "packages/plugin-social-server",
  "packages/test-adapters",
  "ui-kit",
];

const build = (pkg) => {
  if (building[pkg]) {
    return Promise.resolve();
  }
  if (lastBuild[pkg] && Date.now() - lastBuild[pkg] < 1000) {
    return Promise.resolve();
  }
  building[pkg] = true;
  lastBuild[pkg] = Date.now();
  const cmd = "pnpm build";
  console.log(`Building ${pkg}...`);
  return new Promise((resolve) =>
    exec(cmd, { cwd: process.cwd() + "/" + pkg }, (err, stdout, stderr) => {
      if (err) {
        console.error(`${pkg} / error: ${err}`);
      } else {
        console.log(`${pkg} / success`);
      }
      building[pkg] = false;
      resolve();
    })
  );
};

const watch = async (pkg, buildFirst = true) => {
  if (buildFirst) {
    await build(pkg);
  }
  console.info("watching " + pkg + "/src" + " for changes...");
  // TODO: read package.json, emit on build, watch for emitted deps
  chokidar
    .watch(process.cwd() + "/" + pkg + "/src/")
    .on("change", async (event, path) => {
      await build(pkg);
      // rebuild everything lower on the list
      const idx = packages.indexOf(pkg);
      if (idx > -1) {
        for (const pkg of packages.slice(idx + 1)) {
          await build(pkg);
        }
      }
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
