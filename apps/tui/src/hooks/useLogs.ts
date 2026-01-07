import { useState, useEffect, useCallback, useRef } from 'react';
import type { CinderlinkClientInterface, Peer, IncomingP2PMessage } from '@cinderlink/core-types';

export type LogLevel = 'ERROR' | 'WARN' | 'INFO' | 'DEBUG';

export interface LogEntry {
  id: string;
  timestamp: string;
  level: LogLevel;
  message: string;
  source?: string;
  data?: Record<string, unknown>;
}

interface UseLogsOptions {
  maxLogs?: number;
  minLevel?: LogLevel;
}

interface UseLogsReturn {
  logs: LogEntry[];
  addLog: (level: LogLevel, message: string, source?: string, data?: Record<string, unknown>) => void;
  clearLogs: () => void;
  exportLogs: () => string;
  filteredLogs: (minLevel: LogLevel) => LogEntry[];
}

const LOG_LEVEL_PRIORITY: Record<LogLevel, number> = {
  DEBUG: 0,
  INFO: 1,
  WARN: 2,
  ERROR: 3,
};

/**
 * Hook to manage logs from real Cinderlink client events
 */
export function useLogs(
  client?: CinderlinkClientInterface,
  options: UseLogsOptions = {}
): UseLogsReturn {
  const { maxLogs = 1000, minLevel = 'INFO' } = options;
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const logIdCounter = useRef(0);

  const addLog = useCallback(
    (level: LogLevel, message: string, source?: string, data?: Record<string, unknown>) => {
      // Filter by min level
      if (LOG_LEVEL_PRIORITY[level] < LOG_LEVEL_PRIORITY[minLevel]) {
        return;
      }

      const entry: LogEntry = {
        id: `log-${Date.now()}-${logIdCounter.current++}`,
        timestamp: new Date().toISOString(),
        level,
        message,
        source,
        data,
      };

      setLogs((prev) => {
        const updated = [...prev, entry];
        // Keep only the most recent logs
        if (updated.length > maxLogs) {
          return updated.slice(-maxLogs);
        }
        return updated;
      });
    },
    [maxLogs, minLevel]
  );

  const clearLogs = useCallback(() => {
    setLogs([]);
  }, []);

  const exportLogs = useCallback(() => {
    return logs
      .map((log) => {
        const base = `[${log.timestamp}] [${log.level}]${log.source ? ` [${log.source}]` : ''} ${log.message}`;
        if (log.data) {
          return `${base}\n  ${JSON.stringify(log.data)}`;
        }
        return base;
      })
      .join('\n');
  }, [logs]);

  const filteredLogs = useCallback(
    (filterLevel: LogLevel) => {
      const minPriority = LOG_LEVEL_PRIORITY[filterLevel];
      return logs.filter((log) => LOG_LEVEL_PRIORITY[log.level] >= minPriority);
    },
    [logs]
  );

  // Add initial log
  useEffect(() => {
    addLog('INFO', 'TUI initialized', 'system');
  }, [addLog]);

  // Subscribe to client events
  useEffect(() => {
    if (!client) {
      addLog('INFO', 'Running in demo mode - no real client connected', 'system');
      return;
    }

    addLog('INFO', 'Real client connected', 'client');
    addLog('INFO', `DID: ${client.id}`, 'client');
    if (client.peerId) {
      addLog('INFO', `Peer ID: ${client.peerId.toString()}`, 'client');
    }
    addLog('INFO', `Address: ${client.address}`, 'client');

    // Peer events
    const handlePeerConnect = (peer: Peer) => {
      addLog('INFO', `Peer connected: ${peer.peerId.toString()}`, 'p2p', {
        did: peer.did,
        role: peer.role,
      });
    };

    const handlePeerDisconnect = (peer: Peer) => {
      addLog('WARN', `Peer disconnected: ${peer.peerId.toString()}`, 'p2p');
    };

    const handleServerConnect = (peer: Peer) => {
      addLog('INFO', `Connected to server: ${peer.peerId.toString()}`, 'p2p', {
        did: peer.did,
      });
    };

    // Client lifecycle events
    const handleReady = () => {
      addLog('INFO', 'Client ready', 'client');
    };

    const handleLoaded = () => {
      addLog('DEBUG', 'Client data loaded', 'client');
    };

    // Message events
    const handlePeerMessage = (message: IncomingP2PMessage) => {
      addLog('DEBUG', `Message from ${message.peer.peerId.toString()}`, 'p2p', {
        topic: message.topic,
        payloadSize: JSON.stringify(message.payload).length,
      });
    };

    // Subscribe to events
    client.on('/peer/connect', handlePeerConnect);
    client.on('/peer/disconnect', handlePeerDisconnect);
    client.on('/server/connect', handleServerConnect);
    client.on('/client/ready', handleReady);
    client.on('/client/loaded', handleLoaded);
    client.on('/peer/message', handlePeerMessage);

    return () => {
      client.off('/peer/connect', handlePeerConnect);
      client.off('/peer/disconnect', handlePeerDisconnect);
      client.off('/server/connect', handleServerConnect);
      client.off('/client/ready', handleReady);
      client.off('/client/loaded', handleLoaded);
      client.off('/peer/message', handlePeerMessage);
    };
  }, [client, addLog]);

  return {
    logs,
    addLog,
    clearLogs,
    exportLogs,
    filteredLogs,
  };
}

/**
 * Create a logger interface that sends logs to the TUI
 */
export function createTuiLogger(
  addLog: (level: LogLevel, message: string, source?: string, data?: Record<string, unknown>) => void
) {
  return {
    debug: (module: string, msg: string, data?: Record<string, unknown>) =>
      addLog('DEBUG', msg, module, data),
    info: (module: string, msg: string, data?: Record<string, unknown>) =>
      addLog('INFO', msg, module, data),
    warn: (module: string, msg: string, data?: Record<string, unknown>) =>
      addLog('WARN', msg, module, data),
    error: (module: string, msg: string, data?: Record<string, unknown>) =>
      addLog('ERROR', msg, module, data),
  };
}
