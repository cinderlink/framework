# Cinderlink Framework

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/%3C%2F%3E-TypeScript-%230074c1.svg)](http://www.typescriptlang.org/)
[![Discord](https://img.shields.io/discord/your-discord-invite-code)](https://discord.gg/your-invite-link)

A modular, peer-to-peer framework for building decentralized applications with built-in identity, social features, and data synchronization.

## 🌟 Features

- **Decentralized Identity**: Built-in support for DIDs (Decentralized Identifiers)
- **Peer-to-Peer Networking**: Powered by libp2p for efficient peer discovery and communication
- **Social Features**: User profiles, posts, follows, and messaging out of the box
- **Data Synchronization**: Real-time sync of application state across peers
- **Modular Architecture**: Extensible through a powerful plugin system
- **Offline-First**: Works seamlessly with intermittent connectivity
- **End-to-End Encryption**: Secure communication between peers

## 🏗️ Architecture

Cinderlink is built with a modular architecture that separates concerns and promotes extensibility:

```
┌─────────────────────────────────────────────────────────────┐
│                    Application Layer                       │
│  ┌─────────────────────────────────────────────────────┐  │
│  │                     Plugins                        │  │
│  │  ┌─────────────┐  ┌─────────────┐  ┌───────────┐  │  │
│  │  │ Social      │  │ Identity    │  │ Sync      │  │  │
│  │  │ Features    │  │ Management  │  │ Protocol  │  │  │
│  │  └─────────────┘  └─────────────┘  └───────────┘  │  │
│  └─────────────────────────────────────────────────────┘  │
├─────────────────────────────────────────────────────────────┤
│                    Core Framework                          │
│  ┌─────────────────────────────────────────────────────┐  │
│  │  Client/Server   │  DID Management  │  IPLD Storage  │  │
│  └─────────────────────────────────────────────────────┘  │
├─────────────────────────────────────────────────────────────┤
│                    Network Layer                           │
│  ┌─────────────────────────────────────────────────────┐  │
│  │  libp2p Network   │  PubSub  │  DHT  │  Transport  │  │
│  └─────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

## 🚀 Getting Started

### Prerequisites

- Node.js v16 or later
- pnpm package manager

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/cinderlink/framework.git
   cd framework
   ```

2. Install dependencies:
   ```bash
   pnpm i -r
   ```

3. Build all packages:
   ```bash
   pnpm build
   ```

### Running the Example Server

An example server is provided in the `examples/server-example` directory. To start it:

```bash
pnpm --filter ./examples/server-example ts
```

This will start a Cinderlink server with default plugins.

## 📦 Core Packages

| Package | Description |
|---------|-------------|
| `@cinderlink/client` | Core client implementation |
| `@cinderlink/server` | Server implementation |
| `@cinderlink/core-types` | Shared TypeScript types and interfaces |
| `@cinderlink/identifiers` | DID and identity management |
| `@cinderlink/ipld-database` | IPLD-based database |
| `@cinderlink/protocol` | Core protocol implementation |

## 🔌 Plugins

Cinderlink's functionality can be extended through plugins:

- `@cinderlink/plugin-social-*`: Social networking features
- `@cinderlink/plugin-identity-server`: Identity management server
- `@cinderlink/plugin-sync-db`: Database synchronization
- `@cinderlink/plugin-offline-sync-*`: Offline synchronization

## 🛠️ Development

### Building

To build all packages:

```bash
pnpm build
```

### Testing

Run all tests:

```bash
pnpm test
```

Run tests for a specific package:

```bash
cd packages/package-name
pnpm test
```

### Code Style

We use [ESLint](https://eslint.org/) and [Prettier](https://prettier.io/) for code style. To format your code:

```bash
pnpm format
```

## 🤝 Contributing

Contributions are welcome! Please read our [Contributing Guidelines](CONTRIBUTING.md) for details on how to submit pull requests, report issues, or suggest new features.

## 📚 Documentation

For detailed documentation, please visit our [documentation site](https://docs.cinderlink.io).

## 🌐 Community

- [Discord](https://discord.gg/your-invite-link)
- [Twitter](https://twitter.com/cinderlink)
- [GitHub Discussions](https://github.com/cinderlink/framework/discussions)

## 🔗 Related Projects

- [Cinderlink CLI](https://github.com/cinderlink/cli) - Command-line tools for Cinderlink
- [Cinderlink UI](https://github.com/cinderlink/ui) - React components for Cinderlink apps

## 🙏 Acknowledgments

- Built with ❤️ by the Cinderlink team
- Inspired by IPFS, libp2p, and other great decentralized technologies
