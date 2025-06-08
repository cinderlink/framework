# @cinderlink/plugin-rcon-server

Remote Console (RCON) server plugin for Cinderlink, providing secure remote administration capabilities.

## Overview

This plugin implements a secure RCON protocol for remote server administration, allowing authorized clients to execute commands and manage the server. It supports authentication, command whitelisting, and role-based access control.

## Features

- Secure RCON protocol implementation
- Command whitelisting and blacklisting
- Role-based access control
- Command logging and auditing
- Session management
- Rate limiting

## Installation

```bash
npm install @cinderlink/plugin-rcon-server
```

## Quick Start

### Server Setup

```typescript
import { createServer } from '@cinderlink/server';
import { RconServerPlugin } from '@cinderlink/plugin-rcon-server';

const server = await createServer({
  // Server configuration
});

// Add the RCON server plugin
const rcon = new RconServerPlugin({
  port: 25575, // RCON server port
  password: 'secure-password', // RCON password
  // Optional configuration
  maxConnections: 10, // Maximum concurrent connections
  commandTimeout: 30000, // Timeout for command execution (ms)
  logCommands: true, // Log all executed commands
  rateLimit: {
    windowMs: 60000, // 1 minute window
    max: 10 // Max requests per window
  }
});

await server.addPlugin(rcon);
await server.start();
```

### Client Usage

```typescript
import { RconClient } from '@cinderlink/plugin-rcon-client';

const client = new RconClient({
  host: 'localhost',
  port: 25575,
  password: 'secure-password'
});

// Connect to the RCON server
await client.connect();

// Execute a command
const response = await client.command('status');
console.log(response);

// Close the connection
await client.disconnect();
```

## Configuration

### `RconServerOptions`

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `port` | `number` | `25575` | RCON server port |
| `password` | `string` | **Required** | RCON password |
| `host` | `string` | `'0.0.0.0'` | Host to bind to |
| `maxConnections` | `number` | `10` | Maximum concurrent connections |
| `commandTimeout` | `number` | `30000` | Command execution timeout (ms) |
| `logCommands` | `boolean` | `true` | Log all executed commands |
| `whitelist` | `string[]` | `[]` | List of allowed commands (empty = all allowed) |
| `blacklist` | `string[]` | `[]` | List of denied commands |
| `rateLimit` | `object` | See below | Rate limiting configuration |

### Rate Limiting

```typescript
{
  windowMs: 60000, // 1 minute window
  max: 10, // Max requests per window
  message: 'Too many requests',
  statusCode: 429
}
```

## Built-in Commands

| Command | Description | Example |
|---------|-------------|----------|
| `help` | Show help information | `help` |
| `status` | Show server status | `status` |
| `clients` | List connected clients | `clients` |
| `kick` | Disconnect a client | `kick <clientId> [reason]` |
| `ban` | Ban an IP address | `ban <ip> [reason]` |
| `unban` | Unban an IP address | `unban <ip>` |
| `eval` | Execute JavaScript code | `eval 2+2` |
| `reload` | Reload configuration | `reload` |
| `shutdown` | Shutdown the server | `shutdown` |

## Custom Commands

You can add custom commands by extending the `RconServerPlugin` class:

```typescript
class CustomRconServer extends RconServerPlugin {
  constructor(options: RconServerOptions) {
    super(options);
    
    // Register custom commands
    this.registerCommand('hello', {
      description: 'Say hello',
      usage: 'hello [name]',
      handler: async (client, args) => {
        const name = args[0] || 'stranger';
        return `Hello, ${name}!`;
      },
      // Optional: restrict access
      roles: ['admin']
    });
  }
}

// Usage
const rcon = new CustomRconServer({
  port: 25575,
  password: 'secure-password'
});
```

## Security Considerations

### Authentication

- Always use strong, unique passwords
- Consider using environment variables for sensitive configuration
- Change the default port if possible

### Network Security

- Use a firewall to restrict access to the RCON port
- Consider using a VPN for remote access
- Enable TLS for encrypted connections

### Command Security

- Use command whitelisting to restrict available commands
- Be cautious with the `eval` command
- Implement proper input validation for custom commands

## API Reference

### `RconServerPlugin`

#### `constructor(options: RconServerOptions)`

Create a new RCON server instance.

#### `registerCommand(name: string, command: RconCommand): void`

Register a custom command.

#### `unregisterCommand(name: string): void`

Unregister a command.

#### `broadcast(message: string, excludeClients?: RconClient[]): void`

Broadcast a message to all connected clients.

#### `getClients(): RconClient[]`

Get all connected clients.

#### `getClient(id: string): RconClient | undefined`

Get a client by ID.

#### `kickClient(id: string, reason?: string): Promise<void>`

Kick a client.

#### `banIp(ip: string, reason?: string): void`

Ban an IP address.

#### `unbanIp(ip: string): void`

Unban an IP address.

#### `isBanned(ip: string): boolean`

Check if an IP is banned.

#### `shutdown(): Promise<void>`

Gracefully shut down the RCON server.

## Events

### `'connect'`
Emitted when a client connects.

### `'authenticate'`
Emitted when a client successfully authenticates.

### `'command'`
Emitted when a command is executed.

### `'disconnect'`
Emitted when a client disconnects.

### `'error'`
Emitted when an error occurs.

## Example: Custom Command with Permissions

```typescript
class AdminRconServer extends RconServerPlugin {
  constructor(options: RconServerOptions) {
    super(options);
    
    // Register admin-only commands
    this.registerCommand('users', {
      description: 'List all users',
      handler: async () => {
        const users = await this.getUserList();
        return users.map(u => `${u.username} (${u.role})`).join('\n');
      },
      roles: ['admin']
    });
    
    this.registerCommand('promote', {
      description: 'Promote a user',
      usage: 'promote <username> <role>',
      handler: async (client, [username, role]) => {
        if (!username || !role) {
          throw new Error('Usage: promote <username> <role>');
        }
        await this.promoteUser(username, role);
        return `Promoted ${username} to ${role}`;
      },
      roles: ['admin']
    });
  }
  
  private async getUserList() {
    // Implementation depends on your user storage
    return [];
  }
  
  private async promoteUser(username: string, role: string) {
    // Implementation depends on your user storage
  }
}
```

## Logging

The RCON server uses the Cinderlink logger. You can configure the log level in your server configuration:

```typescript
const server = await createServer({
  // ...
  logger: {
    level: 'info' // 'error', 'warn', 'info', 'debug', 'trace'
  }
});
```

## Contributing

Contributions are welcome! Please ensure all code follows the project's coding standards and includes appropriate tests.
