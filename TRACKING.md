# Cinderlink IPFS/Helia Integration Tracking

## Goals
1. Update and modernize IPFS/Helia integration in Cinderlink
2. Ensure all packages use compatible, up-to-date versions
3. Improve network reliability and performance
4. Implement modern libp2p features and best practices

## Documentation References
- [Helia Documentation](https://github.com/ipfs/helia)
- [libp2p Documentation](https://github.com/libp2p/js-libp2p)
- [IPFS Documentation](https://docs.ipfs.tech/)
- [Cinderlink Architecture](./ARCHITECTURE_AND_AUDIT.md)

## Task Groups

### Group 1: Core Dependencies Update (Can be worked on in parallel)
- [ ] Update `libp2p` to v2.8.9 and related packages in `@cinderlink/client`
  - Update peerDependencies and devDependencies
  - Test basic connectivity
  - **Package**: client

- [ ] Standardize `@libp2p/*` package versions across the monorepo
  - Audit all packages using libp2p
  - Create version alignment strategy
  - **Package**: root (affects multiple packages)

- [ ] Update transport protocols in `packages/client/src/ipfs/create.ts`
  - Add WebTransport support
  - Configure WebSockets and TCP
  - **Package**: client

### Group 2: Network Configuration (Depends on Group 1)
- [ ] Implement improved peer discovery
  - Configure bootstrap nodes
  - Set up pubsub peer discovery
  - **Package**: client

- [ ] Add connection management
  - Configure min/max connections
  - Set up auto-dialing
  - **Package**: client

- [ ] Implement metrics collection
  - Add basic metrics
  - Set up monitoring
  - **Package**: client

### Group 3: Testing and Validation (Depends on Group 2)
- [ ] Create comprehensive test suite
  - Unit tests for new features
  - Integration tests for network behavior
  - **Package**: test-adapters

- [ ] Performance benchmarking
  - Measure connection times
  - Test under load
  - **Package**: test-adapters

- [ ] Update documentation
  - Document new features
  - Update API references
  - **Package**: documentation

## Status
- **Last Updated**: 2025-06-08
- **Current Focus**: Group 1 tasks
- **Blockers**: None

## Notes
- All version updates should maintain backward compatibility where possible
- Test coverage should not decrease with these changes
- Performance metrics should be captured before and after changes
