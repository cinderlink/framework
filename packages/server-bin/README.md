# @cinderlink/server-bin

Command-line interface for running a Cinderlink server node with support for various plugins and configurations.

## Features

- Easy server initialization with `cinderlink init`
- Support for both mnemonic and private key authentication
- Configurable via `cinderlink.config.js`
- Plugin system for extending functionality
- Integrated IPFS node with configurable settings

## Installation

Install globally:

```bash
bun add -g @cinderlink/server-bin
```

Or use with bunx:

```bash
bunx @cinderlink/server-bin <command>
```

## Quick Start

1. Initialize a new configuration:
   ```bash
   cinderlink init
   ```
   This creates a `cinderlink.config.js` file in the current directory.

2. Start the server:
   ```bash
   cinderlink start
   ```

## Commands

### `cinderlink init`

Initialize a new Cinderlink server configuration.

Options:
- `--config <path>`: Path to config file (default: `cinderlink.config.js`)
- `--pkey`: Use private key authentication (default: mnemonic)
- `--env`: Create a `.env` file for sensitive data

Example:
```bash
cinderlink init --pkey --env
```

### `cinderlink start`

Start the Cinderlink server.

Options:
- `--config <path>`: Path to config file (default: `cinderlink.config.js`)
- `--env <path>`: Path to `.env` file (default: `.env`)

Example:
```bash
cinderlink start --config ./my-config.js
```

### `cinderlink help`

Show help information.

## Configuration

The server is configured using a JavaScript configuration file (default: `cinderlink.config.js`). Here's an example:

```javascript
import { SocialSyncConfig } from "@cinderlink/plugin-social-core";
import dotenv from "dotenv";

dotenv.config({ path: ".env" });

export default {
  app: "my-cinderlink-app",
  
  // Authentication (use either mnemonic or privateKey)
  mnemonic: process.env.CINDERLINK_MNEMONIC,
  // OR
  // privateKey: process.env.CINDERLINK_PRIVATE_KEY,
  
  // Account nonce for DID creation
  accountNonce: 0,
  
  // Plugins to load
  plugins: [
    [
      "@cinderlink/plugin-sync-db",
      {
        syncing: {
          social: SocialSyncConfig,
        },
      },
    ],
    ["@cinderlink/plugin-social-server"],
    ["@cinderlink/plugin-identity-server"],
    ["@cinderlink/plugin-offline-sync-server"],
  ],
  
  // IPFS configuration
  ipfs: {
    config: {
      Addresses: {
        Swarm: ["/ip4/0.0.0.0/tcp/4500", "/ip4/0.0.0.0/tcp/4501/ws"],
        API: "/ip4/0.0.0.0/tcp/4502",
        Gateway: "/ip4/0.0.0.0/tcp/4503",
      },
      API: {
        HTTPHeaders: {
          "Access-Control-Allow-Origin": ["*"],
          "Access-Control-Allow-Methods": ["PUT", "GET", "POST"],
          "Access-Control-Allow-Credentials": ["true"],
        },
      },
      Bootstrap: [],
    },
  },
};
```

## Environment Variables

- `CINDERLINK_MNEMONIC`: BIP-39 mnemonic phrase for wallet generation
- `CINDERLINK_PRIVATE_KEY`: Private key for authentication (alternative to mnemonic)

## Data Storage

By default, the server stores data in the following locations:

- IPFS repository: `./cinderlink/ipfs`
- Plugin data: `./cinderlink/data`
- Configuration: `./cinderlink.config.js`
- Environment: `./.env`

## Plugins

The server supports various plugins that can be added to the `plugins` array in the configuration. Plugins are loaded in the order they are specified.

### Available Plugins

- `@cinderlink/plugin-social-server`: Social networking features
- `@cinderlink/plugin-identity-server`: Identity management
- `@cinderlink/plugin-offline-sync-server`: Offline data synchronization
- `@cinderlink/plugin-sync-db`: Database synchronization

## Development

To run from source:

```bash
# Clone the repository
git clone https://github.com/cinderlink/framework.git
cd framework

# Install dependencies
bun install

# Build all packages
bun run build

# Run the server binary
node packages/server-bin/dist/bin.js start
```

## License

MIT

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
