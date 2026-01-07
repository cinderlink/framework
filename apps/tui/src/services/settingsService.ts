import fs from 'fs';
import path from 'path';
import { homedir } from 'os';

export interface TuiSettings {
  theme: 'dark' | 'light';
  autoConnect: boolean;
  logLevelFilter: 'ERROR' | 'WARN' | 'INFO' | 'DEBUG';
  defaultAutoScroll: boolean;
  timestampFormat: 'ISO' | 'relative' | 'local';
}

const DEFAULT_SETTINGS: TuiSettings = {
  theme: 'dark',
  autoConnect: true,
  logLevelFilter: 'INFO',
  defaultAutoScroll: true,
  timestampFormat: 'relative',
};

class SettingsService {
  private settingsPath: string;
  
  constructor() {
    const configDir = path.join(homedir(), '.cinderlink');
    this.settingsPath = path.join(configDir, 'tui.config.json');
    
    if (!fs.existsSync(configDir)) {
      fs.mkdirSync(configDir, { recursive: true });
    }
  }
  
  async load(): Promise<TuiSettings> {
    try {
      if (fs.existsSync(this.settingsPath)) {
        const content = fs.readFileSync(this.settingsPath, 'utf-8');
        const loaded = JSON.parse(content);
        
        return { ...DEFAULT_SETTINGS, ...loaded };
      }
    } catch (error) {
      console.error('Failed to load settings:', error);
    }
    
    return DEFAULT_SETTINGS;
  }
  
  async save(settings: TuiSettings): Promise<void> {
    try {
      const content = JSON.stringify(settings, null, 2);
      fs.writeFileSync(this.settingsPath, content, 'utf-8');
    } catch (error) {
      console.error('Failed to save settings:', error);
      throw new Error('Unable to persist settings');
    }
  }
  
  async reset(): Promise<void> {
    try {
      if (fs.existsSync(this.settingsPath)) {
        fs.unlinkSync(this.settingsPath);
      }
    } catch (error) {
      console.error('Failed to reset settings:', error);
    }
  }
}

export const settingsService = new SettingsService();