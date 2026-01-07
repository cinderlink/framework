import fs from 'fs';
import path from 'path';
import { homedir } from 'os';

export interface ExportPayload {
  exportedAt: string;
  sourceView: 'logs' | 'database';
  filters?: {
    levels?: LogLevel[];
    searchTerm?: string;
    path?: string;
  };
  data: LogEntry[] | DatabaseNode[];
}

export type LogLevel = 'ERROR' | 'WARN' | 'INFO' | 'DEBUG';

export interface LogEntry {
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

class ExportService {
  private exportDir: string;
  
  constructor() {
    this.exportDir = path.join(homedir(), '.cinderlink', 'exports');
    
    if (!fs.existsSync(this.exportDir)) {
      fs.mkdirSync(this.exportDir, { recursive: true });
    }
  }
  
  async exportLogs(entries: LogEntry[], filters?: ExportPayload['filters']): Promise<string> {
    const payload: ExportPayload = {
      exportedAt: new Date().toISOString(),
      sourceView: 'logs',
      filters,
      data: entries.filter(entry => {
        if (!filters?.levels) return true;
        const validLevels: LogLevel[] = ['ERROR', 'WARN', 'INFO'];
        const filterSet = new Set(filters.levels || validLevels);
        return filterSet.has(entry.level);
      }),
    };
    
    const filename = `cinderlink-logs-${Date.now()}.json`;
    const filepath = path.join(this.exportDir, filename);
    
    fs.writeFileSync(filepath, JSON.stringify(payload, null, 2), 'utf-8');
    
    return filepath;
  }
  
  async exportDatabase(nodes: DatabaseNode[], filters?: ExportPayload['filters']): Promise<string> {
    let filteredNodes = nodes;
    
    if (filters?.path) {
      filteredNodes = nodes.filter(n => n.path.startsWith(filters.path!));
    }
    
    const payload: ExportPayload = {
      exportedAt: new Date().toISOString(),
      sourceView: 'database',
      filters,
      data: filteredNodes,
    };
    
    const filename = `cinderlink-database-${Date.now()}.json`;
    const filepath = path.join(this.exportDir, filename);
    
    fs.writeFileSync(filepath, JSON.stringify(payload, null, 2), 'utf-8');
    
    return filepath;
  }
  
  async listExports(): Promise<{ name: string; path: string; size: number }[]> {
    const files = fs.readdirSync(this.exportDir);
    
    return files.map(name => {
      const filepath = path.join(this.exportDir, name);
      const stats = fs.statSync(filepath);
      
      return {
        name,
        path: filepath,
        size: stats.size,
      };
    });
  }
}

export const exportService = new ExportService();