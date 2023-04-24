# @cinderlink/server-bin

This package provides a binary for the Cinderlink server.
The binary runs a js-ipfs node via [@cinderlink/client](https://github.com/cinderlink/framework/tree/main/packages/client) and accompanying HTTP API & Gateway server.
The server will store IPFS repository data in the `cinderlink/` directory in the current working directory.

## Installation

```bash
pnpm add @cinderlink/server-bin
```

## Usage Example

For an example server configuration with a custom plugin, see [this example](https://github.com/cinderlink/server-template).

## Commands

---

### `cinderlink init`

Initializes a new Cinderlink server. This command will create a `cinderlink.config.js` file in the current working directory.

#### init options

- `--pkey` - Indicates that the server should look for a private key in the environment at `CINDERLINK_PRIVATE_KEY`. If this option is not provided, the server will instead look for a mnemonic in the environment at `CINDERLINK_MNEMONIC`.
- `--env` - Also generate an environment file for the server.

---

### `cinderlink init-env`

Initializes a new environment file for the Cinderlink server. This command will create a `.env` file in the current working directory.

#### init-env options

- `--pkey` - Use a private key instead of a mnemonic.

---

### `cinderlink start`

Starts the Cinderlink server. This command will look for a `cinderlink.config.js` file in the current working directory.

#### start options

- `--env` - Specify an environment file to load for the server.
