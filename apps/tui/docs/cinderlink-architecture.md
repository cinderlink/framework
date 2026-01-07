# Cinderlink Architecture Overview

This document outlines the key components and architecture of the Cinderlink framework to inform TUI development.

## Core Components

### Client
- Main entry point for interacting with the Cinderlink network
- Manages P2P connections and communication
- Handles DID (Decentralized Identifier) management
- Integrates with IPFS/Helia for distributed storage

### Server
- Federated server implementation  
- Provides network coordination and discovery
- Manages peer connections and routing

### Identifiers
- DID (Decentralized Identifier) management system
- Ethereum wallet integration for identity verification
- Key generation and management

### IPLD Database
- Distributed storage layer using IPLD
- Database synchronization capabilities
- Support for various data structures and schemas

### Protocol
- Network protocols for communication between peers
- Message formats and serialization
- Security and authentication mechanisms

## TUI Integration Points

### Node Management
- Start/stop Cinderlink server nodes
- View node status and configuration
- Monitor network connections

### Logging
- Real-time log viewing from nodes
- Log filtering and search capabilities
- Log export functionality

### Database Explorer
- Browse IPLD database contents
- Query and visualize data structures
- Schema inspection

### Debug Client
- Direct client interaction tools
- Network diagnostics
- Performance monitoring