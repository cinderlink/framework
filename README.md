# @cinderlink/framework

Tools for building dApps around the Cinderlink protocol.

## Repository configuration

Install [Node.js](https://nodejs.org/) (v16 or later is recommended) and [pnpm](https://pnpm.io/).

Install dependencies for all workspaces:

```sh
pnpm i -r
```

## Building packages

To compile every package in the monorepo run:

```sh
pnpm build
```

## Running tests

All package tests can be executed with:

```sh
pnpm test
```

## Example server

An example server is provided under `examples/server-example`.
After building the packages you can start it with:

```sh
pnpm --filter ./examples/server-example ts
```

This runs `ts-node src/start.ts` which starts a server with a few default plugins.
