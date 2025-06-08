# @cinderlink/server

Server implementation for the Cinderlink P2P network.

## Overview

The Cinderlink server extends the base Cinderlink client with server-specific functionality, such as federated pinning, message relaying, and additional plugin support. It's designed to run as a long-lived node in the network.

## Features

- **Federated Pinning**: Pin and serve content for the network
- **Message Relaying**: Relay messages for offline peers
- **Plugin Support**: Extend with server-specific plugins
- **High Availability**: Designed for 24/7 operation
- **Metrics**: Built-in metrics and monitoring

## Installation

```bash
npm install @cinderlink/server
# or
yarn add @cinderlink/server
```

## Quick Start

### Creating a Server

```typescript
import { createServer } from '@cinderlink/server';

const server = await createServer({
  // Inherits all client options
  node: {
    // Server-specific node configuration
  },
  
  // Server configuration
  server: {
    // Enable/disable server features
    federatedPinning: true,
    messageRelay: true,
    
    // Server identity
    name: 'my-server',
    description: 'My Cinderlink Server',
    
    // Access control
    public: true, // Allow public access
    whitelist: [
      // List of allowed peer IDs or DIDs
    ],
    blacklist: [
      // List of blocked peer IDs or DIDs
    ],
    
    // Rate limiting
    rateLimit: {
      enabled: true,
      points: 10, // Requests
      duration: 1, // Per second
      blockDuration: 3600 // Block for 1 hour if limit exceeded
    },
    
    // Storage
    storage: {
      // Directory to store server data
      path: './.cinderlink-server',
      
      // Maximum storage size (bytes)
      maxSize: 1024 * 1024 * 1024, // 1GB
      
      // Garbage collection
      gc: {
        enabled: true,
        interval: 3600, // Run every hour
        age: 30 * 24 * 3600 * 1000 // Keep data for 30 days
      }
    },
    
    // Metrics
    metrics: {
      enabled: true,
      port: 9090, // Metrics server port
      path: '/metrics' // Metrics endpoint path
    }
  }
});

// Start the server
await server.start();

// Handle shutdown signals
process.on('SIGINT', async () => {
  await server.stop();
  process.exit(0);
});
```

## Server Features

### Federated Pinning

Federated pinning allows the server to pin and serve content for the network:

```typescript
// Pin content by CID
await server.pin('bafy...');

// Unpin content
await server.unpin('bafy...');

// List pinned content
const pins = await server.listPins();
```

### Message Relaying

Relay messages for offline peers:

```typescript
// Enable message relaying for a peer
await server.relay.enableForPeer(peerId);

// Disable message relaying
await server.relay.disableForPeer(peerId);

// Check if relaying is enabled for a peer
const isEnabled = await server.relay.isEnabledForPeer(peerId);
```

### Access Control

Manage access to your server:

```typescript
// Add a peer to the whitelist
await server.acl.allow(peerId);

// Add a peer to the blacklist
await server.acl.deny(peerId);

// Check if a peer is allowed
const isAllowed = await server.acl.isAllowed(peerId);
```

### Metrics

Monitor server performance:

```typescript
// Get server metrics
const metrics = await server.metrics.getMetrics();

// Custom metrics
server.metrics.counter('requests_total', 'Total number of requests')
  .inc();

server.metrics.histogram('request_duration_seconds', 'Request duration in seconds')
  .observe(0.5);

server.metrics.gauge('active_connections', 'Number of active connections')
  .set(42);
```

## Server Plugins

Extend the server with plugins:

```typescript
import { ServerPluginInterface } from '@cinderlink/core-types';

class MyServerPlugin implements ServerPluginInterface {
  static id = 'my-server-plugin';
  
  constructor(public server: CinderlinkServerInterface) {}
  
  async start() {
    console.log('My server plugin started');
  }
  
  async stop() {
    console.log('My server plugin stopped');
  }
}

// Register the plugin
await server.addPlugin(new MyServerPlugin(server));
```

## Configuration Reference

### Server Configuration

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `federatedPinning` | boolean | `true` | Enable federated pinning |
| `messageRelay` | boolean | `true` | Enable message relaying |
| `name` | string | `'cinderlink-server'` | Server name |
| `description` | string | `''` | Server description |
| `public` | boolean | `false` | Allow public access |
| `whitelist` | string[] | `[]` | List of allowed peer IDs or DIDs |
| `blacklist` | string[] | `[]` | List of blocked peer IDs or DIDs |
| `rateLimit` | object | `{ enabled: true, points: 10, duration: 1, blockDuration: 3600 }` | Rate limiting configuration |
| `storage` | object | `{ path: './.cinderlink-server', maxSize: 1073741824, gc: { enabled: true, interval: 3600, age: 2592000000 } }` | Storage configuration |
| `metrics` | object | `{ enabled: true, port: 9090, path: '/metrics' }` | Metrics configuration |

## Security Considerations

- Run the server behind a reverse proxy with HTTPS
- Use strong authentication for admin endpoints
- Monitor server resources and logs
- Keep the server and dependencies up to date
- Follow security best practices for your deployment

## Deployment

### Docker

```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install --production

COPY . .

EXPOSE 4001 5001 8080 9090

CMD ["node", "dist/index.js"]
```

### Systemd Service

```ini
[Unit]
Description=Cinderlink Server
After=network.target

[Service]
Type=simple
User=cinderlink
WorkingDirectory=/opt/cinderlink
ExecStart=/usr/bin/node dist/index.js
Restart=always
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
```

## Monitoring

### Prometheus

Prometheus can be used to collect metrics from the server:

```yaml
scrape_configs:
  - job_name: 'cinderlink-server'
    scrape_interval: 15s
    static_configs:
      - targets: ['localhost:9090']
```

### Logging

Configure logging with your preferred logger:

```typescript
const server = await createServer({
  logger: {
    level: 'info',
    transports: [
      new winston.transports.Console(),
      new winston.transports.File({ filename: 'cinderlink-server.log' })
    ]
  }
});
```

## Contributing

Contributions are welcome! Please ensure all code follows the project's coding standards and includes appropriate tests.
