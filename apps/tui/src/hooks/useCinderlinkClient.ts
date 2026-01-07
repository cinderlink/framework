import { useState, useEffect, useCallback, useRef } from 'react';
import type { CinderlinkClientInterface, Peer } from '@cinderlink/core-types';
import { multiaddr } from '@multiformats/multiaddr';
import { peerIdFromString } from '@libp2p/peer-id';

export type LogLevel = 'ERROR' | 'WARN' | 'INFO' | 'DEBUG';
export type ConnectionType = 'direct' | 'relayed';
export type SyncStatus = 'synced' | 'syncing' | 'pending';

export interface TuiPeerInfo {
  id: string;
  connected: boolean;
  connectionType: ConnectionType;
  lastSeen: Date;
  address?: string;
  did?: string;
  role?: 'server' | 'peer';
}

export interface DatabaseStats {
  totalSize: number;
  nodeCount: number;
  syncStatus: SyncStatus;
}

export interface ClientMetrics {
  peerCount: number;
  databaseStats: DatabaseStats;
  uptimeSeconds: number;
  isConnected: boolean;
  peerId?: string;
  didId?: string;
  address?: string;
}

export interface LogEntry {
  id: string;
  timestamp: string;
  level: LogLevel;
  message: string;
  source?: string;
}

export interface DatabaseNode {
  path: string;
  content: unknown;
  schema?: string;
}

interface LoadingStates {
  connecting: boolean;
  addingPeer: boolean;
  removingPeer: boolean;
  sendingMessage: boolean;
  publishing: boolean;
}

interface UseCinderlinkClientReturn {
  connected: boolean;
  peers: TuiPeerInfo[];
  metrics: ClientMetrics;
  loading: LoadingStates;
  addPeer: (multiaddr: string) => Promise<void>;
  removePeer: (peerId: string) => Promise<void>;
  disconnect: () => void;
  connect: (nodes?: string[]) => Promise<void>;
  isRealClient: boolean;
  sendMessage: (peerId: string, topic: string, payload: unknown) => Promise<void>;
  publishMessage: (topic: string, payload: unknown) => Promise<void>;
}

/**
 * Convert a Cinderlink Peer to TuiPeerInfo
 */
function peerToTuiPeer(peer: Peer): TuiPeerInfo {
  return {
    id: peer.peerId.toString(),
    connected: peer.connected,
    connectionType: 'direct', // Could check relay status
    lastSeen: peer.seenAt ? new Date(peer.seenAt) : new Date(),
    did: peer.did,
    role: peer.role,
  };
}

/**
 * Hook to access Cinderlink client state
 *
 * If a real client is available from context, uses that.
 * Otherwise falls back to mock data for demo mode.
 */
export function useCinderlinkClient(
  realClient?: CinderlinkClientInterface
): UseCinderlinkClientReturn {
  const [connected, setConnected] = useState(false);
  const [peers, setPeers] = useState<TuiPeerInfo[]>([]);
  const [isRealClient, setIsRealClient] = useState(false);
  const [loading, setLoading] = useState<LoadingStates>({
    connecting: false,
    addingPeer: false,
    removingPeer: false,
    sendingMessage: false,
    publishing: false,
  });
  const startTimeRef = useRef(Date.now());
  const uptimeIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Helper to update a single loading state
  const setLoadingState = useCallback((key: keyof LoadingStates, value: boolean) => {
    setLoading(prev => ({ ...prev, [key]: value }));
  }, []);

  const calculateMetrics = useCallback(
    (peerList: TuiPeerInfo[], isConnected: boolean, client?: CinderlinkClientInterface): ClientMetrics => {
      const connectedPeers = peerList.filter((p) => p.connected);

      return {
        peerCount: connectedPeers.length,
        databaseStats: {
          totalSize: 0,
          nodeCount: 0,
          syncStatus: 'pending' as SyncStatus,
        },
        uptimeSeconds: Math.floor((Date.now() - startTimeRef.current) / 1000),
        isConnected: isConnected || connectedPeers.length > 0,
        peerId: client?.peerId?.toString(),
        didId: client?.id,
        address: client?.address,
      };
    },
    []
  );

  const [metrics, setMetrics] = useState<ClientMetrics>(() => calculateMetrics([], false));

  // Setup uptime counter
  useEffect(() => {
    uptimeIntervalRef.current = setInterval(() => {
      setMetrics((prev) => ({
        ...prev,
        uptimeSeconds: Math.floor((Date.now() - startTimeRef.current) / 1000),
      }));
    }, 1000);

    return () => {
      if (uptimeIntervalRef.current) {
        clearInterval(uptimeIntervalRef.current);
      }
    };
  }, []);

  // Real client integration
  useEffect(() => {
    if (!realClient) {
      setIsRealClient(false);
      return;
    }

    setIsRealClient(true);
    setConnected(realClient.running);

    // Get initial peers
    const allPeers = realClient.peers.getAllPeers();
    setPeers(allPeers.map(peerToTuiPeer));

    // Update metrics with client info
    setMetrics(prev => ({
      ...prev,
      peerId: realClient.peerId?.toString(),
      didId: realClient.id,
      address: realClient.address,
    }));

    // Subscribe to peer events
    const handlePeerConnect = (peer: Peer) => {
      setPeers((prev) => {
        const existing = prev.findIndex((p) => p.id === peer.peerId.toString());
        if (existing >= 0) {
          const updated = [...prev];
          updated[existing] = peerToTuiPeer(peer);
          return updated;
        }
        return [...prev, peerToTuiPeer(peer)];
      });
    };

    const handlePeerDisconnect = (peer: Peer) => {
      setPeers((prev) =>
        prev.map((p) => (p.id === peer.peerId.toString() ? { ...p, connected: false } : p))
      );
    };

    const handleServerConnect = (peer: Peer) => {
      setConnected(true);
      handlePeerConnect(peer);
    };

    const handleReady = () => {
      setConnected(true);
      // Refresh metrics when ready
      setMetrics(prev => ({
        ...prev,
        peerId: realClient.peerId?.toString(),
        didId: realClient.id,
        address: realClient.address,
        isConnected: true,
      }));
    };

    // Subscribe to events
    realClient.on('/peer/connect', handlePeerConnect);
    realClient.on('/peer/disconnect', handlePeerDisconnect);
    realClient.on('/server/connect', handleServerConnect);
    realClient.on('/client/ready', handleReady);

    return () => {
      realClient.off('/peer/connect', handlePeerConnect);
      realClient.off('/peer/disconnect', handlePeerDisconnect);
      realClient.off('/server/connect', handleServerConnect);
      realClient.off('/client/ready', handleReady);
    };
  }, [realClient]);

  // Update metrics when peers change
  useEffect(() => {
    setMetrics((prev) => ({
      ...prev,
      peerCount: peers.filter((p) => p.connected).length,
      isConnected: connected,
    }));
  }, [peers, connected]);

  // Mock implementations for when real client is not available
  const updatePeerList = useCallback((updater: (prev: TuiPeerInfo[]) => TuiPeerInfo[]) => {
    setPeers((prev) => updater(prev));
  }, []);

  const addPeer = useCallback(
    async (multiaddrStr: string) => {
      setLoadingState('addingPeer', true);
      try {
        if (realClient) {
          // Real client: parse multiaddr and connect via libp2p
          const ma = multiaddr(multiaddrStr);
          const peerIdStr = ma.getPeerId();

          if (peerIdStr) {
            const peerId = peerIdFromString(peerIdStr);
            // Add to peer store and dial
            realClient.peers.addPeer(peerId, 'peer');
            await realClient.ipfs.libp2p.dial(ma);
          } else {
            // Try direct dial without explicit peer ID
            await realClient.ipfs.libp2p.dial(ma);
          }
          return;
        }

        // Mock implementation - simulate network delay
        await new Promise(resolve => setTimeout(resolve, 500));
        updatePeerList((prev) => [
          ...prev,
          {
            id: `peer-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            connected: true,
            connectionType: 'direct' as ConnectionType,
            lastSeen: new Date(),
            address: multiaddrStr,
          },
        ]);
      } catch (error) {
        console.error('Failed to connect to peer:', error);
        throw error;
      } finally {
        setLoadingState('addingPeer', false);
      }
    },
    [realClient, updatePeerList, setLoadingState]
  );

  const removePeer = useCallback(
    async (peerId: string) => {
      setLoadingState('removingPeer', true);
      try {
        if (realClient) {
          // Real client: disconnect and remove peer
          const pid = peerIdFromString(peerId);
          // Close connections to this peer
          const connections = realClient.ipfs.libp2p.getConnections(pid);
          for (const conn of connections) {
            await conn.close();
          }
          // Remove from peer store
          realClient.peers.removePeer(pid.toString());
          return;
        }

        // Mock implementation - simulate network delay
        await new Promise(resolve => setTimeout(resolve, 300));
        updatePeerList((prev) => prev.map((p) => (p.id === peerId ? { ...p, connected: false } : p)));
      } catch (error) {
        console.error('Failed to remove peer:', error);
        throw error;
      } finally {
        setLoadingState('removingPeer', false);
      }
    },
    [realClient, updatePeerList, setLoadingState]
  );

  const disconnect = useCallback(() => {
    if (realClient) {
      realClient.stop().catch(console.error);
      setConnected(false);
      return;
    }

    // Mock implementation
    setConnected(false);
    updatePeerList((prev) => prev.map((p) => ({ ...p, connected: false })));
    setMetrics((prev) => ({
      ...prev,
      isConnected: false,
    }));
  }, [realClient, updatePeerList]);

  const connect = useCallback(async (nodes?: string[]) => {
    setLoadingState('connecting', true);
    try {
      if (realClient) {
        // Real client: start with configured nodes
        await realClient.start(nodes || []);
        setConnected(true);
        return;
      }

      // Mock implementation - simulate connection delay
      await new Promise(resolve => setTimeout(resolve, 800));
      setConnected(true);
      startTimeRef.current = Date.now();

      // Simulate peer discovery
      setTimeout(() => {
        updatePeerList(() => [
          {
            id: 'QmBootstrap1',
            connected: true,
            connectionType: 'direct' as ConnectionType,
            lastSeen: new Date(),
          },
          {
            id: 'QmRelayNode2',
            connected: true,
            connectionType: 'relayed' as ConnectionType,
            lastSeen: new Date(),
          },
        ]);
      }, 500);

      setMetrics((prev) => ({
        ...prev,
        isConnected: true,
        databaseStats: {
          totalSize: 1024 * 1024 * 5.2,
          nodeCount: 156,
          syncStatus: 'synced' as SyncStatus,
        },
      }));
    } catch (error) {
      console.error('Failed to connect:', error);
      throw error;
    } finally {
      setLoadingState('connecting', false);
    }
  }, [realClient, updatePeerList, setLoadingState]);

  // Send a P2P message to a specific peer
  const sendMessage = useCallback(async (peerId: string, topic: string, payload: unknown) => {
    setLoadingState('sendingMessage', true);
    try {
      if (!realClient) {
        // Mock implementation - simulate network delay
        await new Promise(resolve => setTimeout(resolve, 200));
        console.log('[MOCK] Would send P2P message:', { peerId, topic, payload });
        return;
      }

      // Use type assertion for generic messaging from TUI
      // The client's send method is strongly typed for plugin events,
      // but TUI needs to send arbitrary messages for debugging/testing
      const message = { topic, payload } as Parameters<typeof realClient.send>[1];
      await realClient.send(peerId, message);
    } catch (error) {
      console.error('Failed to send message:', error);
      throw error;
    } finally {
      setLoadingState('sendingMessage', false);
    }
  }, [realClient, setLoadingState]);

  // Publish a message to a pubsub topic
  const publishMessage = useCallback(async (topic: string, payload: unknown) => {
    setLoadingState('publishing', true);
    try {
      if (!realClient) {
        // Mock implementation - simulate network delay
        await new Promise(resolve => setTimeout(resolve, 200));
        console.log('[MOCK] Would publish to topic:', { topic, payload });
        return;
      }

      // Use type assertion for generic pubsub from TUI
      // The client's publish method is strongly typed for plugin events,
      // but TUI needs to publish arbitrary messages for debugging/testing
      const typedTopic = topic as Parameters<typeof realClient.publish>[0];
      const typedPayload = payload as Parameters<typeof realClient.publish>[1];
      await realClient.publish(typedTopic, typedPayload);
    } catch (error) {
      console.error('Failed to publish message:', error);
      throw error;
    } finally {
      setLoadingState('publishing', false);
    }
  }, [realClient, setLoadingState]);

  // Auto-connect in mock mode
  useEffect(() => {
    if (!realClient) {
      connect();
    }

    return () => {
      if (!realClient) {
        disconnect();
      }
    };
  }, [realClient, connect, disconnect]);

  return {
    connected,
    peers,
    metrics,
    loading,
    addPeer,
    removePeer,
    disconnect,
    connect,
    isRealClient,
    sendMessage,
    publishMessage,
  };
}
