import { LogLevel, ConnectionType, SyncStatus } from '../hooks/useCinderlinkClient';

export {
  LogLevel,
  ConnectionType,
  SyncStatus,
};

export interface TuiSettings {
  theme: 'dark' | 'light';
  autoConnect: boolean;
  logLevelFilter: LogLevel;
  defaultAutoScroll: boolean;
  timestampFormat: 'ISO' | 'relative' | 'local';
}

export interface PeerInfo {
  id: string;
  connected: boolean;
  type: ConnectionType;
  lastSeen: string;
}

export interface SystemMetrics {
  peerCount: number;
  databaseSize: string;
  uptime: string;
  connectionStatus: 'connected' | 'disconnected' | 'connecting';
}

export interface LogEntryDisplay {
  id: string;
  timestamp: string;
  level: LogLevel;
  message: string;
  source?: string;
}

export interface DatabaseNodeDisplay {
  path: string;
  content: unknown;
  schema?: string;
}

export const LOG_LEVELS: LogLevel[] = ['ERROR', 'WARN', 'INFO', 'DEBUG'];

export function formatTimestamp(isoString: string, format: 'ISO' | 'relative' | 'local'): string {
  if (!isoString) return '';
  
  const date = new Date(isoString);
  
  switch (format) {
    case 'ISO':
      return date.toISOString();
    
    case 'local':
      return date.toLocaleString();
    
    case 'relative':
    default:
      const now = Date.now();
      const diffMs = now - date.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      
      if (diffMins < 1) return 'Just now';
      if (diffMins < 60) return `${diffMins} min ago`;
      
      const diffHours = Math.floor(diffMins / 60);
      if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
      
      const diffDays = Math.floor(diffHours / 24);
      return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
  }
}

export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

export function formatDuration(seconds: number): string {
  if (seconds < 0) return '00:00:00';
  
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  
  return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}