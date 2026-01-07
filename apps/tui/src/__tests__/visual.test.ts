/**
 * Visual Tests
 *
 * Generates visual recordings and snapshots for review.
 * Run with: bun run test
 * Output: .screenshots/ directory
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import {
  ScreenshotManager,
  RecordingSession,
  createSnapshot,
} from '../services/screenshotService';
import { colors, semanticColors, getSemanticColor } from '../theme';

const OUTPUT_DIR = '.screenshots/visual-tests';

describe('Visual Tests', () => {
  let screenshotManager: ScreenshotManager;

  beforeAll(() => {
    // Ensure output directory exists
    if (!fs.existsSync(OUTPUT_DIR)) {
      fs.mkdirSync(OUTPUT_DIR, { recursive: true });
    }
    screenshotManager = new ScreenshotManager(OUTPUT_DIR);
  });

  afterAll(() => {
    // Log location of screenshots
    console.log(`\n📸 Screenshots saved to: ${screenshotManager.getSessionDir()}`);
    console.log(`   Files: ${screenshotManager.list().join(', ')}`);
  });

  describe('Theme Color Palette', () => {
    it('generates dark theme color preview', () => {
      const palette = colors.dark;
      let output = '\x1b[0m\n';
      output += '╔══════════════════════════════════════════════╗\n';
      output += '║        CINDERLINK TUI - DARK THEME           ║\n';
      output += '╠══════════════════════════════════════════════╣\n';
      
      // Show each color
      const colorEntries = Object.entries(palette);
      for (const [name, value] of colorEntries) {
        if (typeof value === 'string' && value.startsWith('#')) {
          const hex = value.replace('#', '');
          const r = parseInt(hex.slice(0, 2), 16);
          const g = parseInt(hex.slice(2, 4), 16);
          const b = parseInt(hex.slice(4, 6), 16);
          // Use 24-bit color escape
          output += `║ \x1b[48;2;${r};${g};${b}m    \x1b[0m ${name.padEnd(20)} ${value} ║\n`;
        }
      }
      
      output += '╚══════════════════════════════════════════════╝\n';

      const result = screenshotManager.take('dark-theme-colors', output, 'html');
      expect(fs.existsSync(result.filepath)).toBe(true);
    });

    it('generates light theme color preview', () => {
      const palette = colors.light;
      let output = '\x1b[0m\n';
      output += '╔══════════════════════════════════════════════╗\n';
      output += '║        CINDERLINK TUI - LIGHT THEME          ║\n';
      output += '╠══════════════════════════════════════════════╣\n';
      
      for (const [name, value] of Object.entries(palette)) {
        if (typeof value === 'string' && value.startsWith('#')) {
          const hex = value.replace('#', '');
          const r = parseInt(hex.slice(0, 2), 16);
          const g = parseInt(hex.slice(2, 4), 16);
          const b = parseInt(hex.slice(4, 6), 16);
          output += `║ \x1b[48;2;${r};${g};${b}m    \x1b[0m ${name.padEnd(20)} ${value} ║\n`;
        }
      }
      
      output += '╚══════════════════════════════════════════════╝\n';

      const result = screenshotManager.take('light-theme-colors', output, 'html');
      expect(fs.existsSync(result.filepath)).toBe(true);
    });

    it('validates semantic color mappings', () => {
      const palette = colors.dark;
      
      // Verify all semantic colors resolve to valid palette colors
      for (const [semantic, colorKey] of Object.entries(semanticColors)) {
        const resolvedColor = getSemanticColor(palette, semantic as keyof typeof semanticColors);
        expect(resolvedColor).toBeDefined();
        expect(typeof resolvedColor).toBe('string');
      }
    });
  });

  describe('Component Mockups', () => {
    it('generates dashboard mockup', () => {
      const output = `
\x1b[34m╔════════════════════════════════════════════════════════════════════════════╗\x1b[0m
\x1b[34m║\x1b[0m \x1b[36m\x1b[1mCinderlink\x1b[0m │ \x1b[32m● Connected\x1b[0m │ \x1b[33mDemo\x1b[0m │ \x1b[32m2 peers\x1b[0m │ ↑↓ 0B/s              \x1b[34m║\x1b[0m
\x1b[34m╠════════════════════════════════════════════════════════════════════════════╣\x1b[0m
\x1b[34m║\x1b[0m [\x1b[36m1\x1b[0m] Dashboard  [\x1b[37m2\x1b[0m] Peers  [\x1b[37m3\x1b[0m] Logs  [\x1b[37m4\x1b[0m] Database  [\x1b[37m5\x1b[0m] Settings  [\x1b[37m6\x1b[0m] Messaging \x1b[34m║\x1b[0m
\x1b[34m╠════════════════════════════════════════════════════════════════════════════╣\x1b[0m
\x1b[34m║\x1b[0m                                                                            \x1b[34m║\x1b[0m
\x1b[34m║\x1b[0m  ┌─ Node Status ────────┐  ┌─ Peers ───────────────┐  ┌─ Database ──────┐  \x1b[34m║\x1b[0m
\x1b[34m║\x1b[0m  │ \x1b[32m● Online\x1b[0m              │  │ Total: \x1b[36m2\x1b[0m               │  │ Size: \x1b[36m5.2 MB\x1b[0m    │  \x1b[34m║\x1b[0m
\x1b[34m║\x1b[0m  │ Uptime: \x1b[36m00:15:32\x1b[0m     │  │ Connected: \x1b[32m2\x1b[0m          │  │ \x1b[32m● synced\x1b[0m       │  \x1b[34m║\x1b[0m
\x1b[34m║\x1b[0m  │                      │  │ Direct: \x1b[34m1\x1b[0m             │  │ 156 nodes      │  \x1b[34m║\x1b[0m
\x1b[34m║\x1b[0m  │                      │  │ Relayed: \x1b[33m1\x1b[0m            │  │                │  \x1b[34m║\x1b[0m
\x1b[34m║\x1b[0m  └──────────────────────┘  └───────────────────────┘  └────────────────┘  \x1b[34m║\x1b[0m
\x1b[34m║\x1b[0m                                                                            \x1b[34m║\x1b[0m
\x1b[34m║\x1b[0m  ┌─ Recent Activity ──────────────────────────────────────────────────────┐  \x1b[34m║\x1b[0m
\x1b[34m║\x1b[0m  │ \x1b[34m[INFO]\x1b[0m Client ready                                         \x1b[90m2s ago\x1b[0m  │  \x1b[34m║\x1b[0m
\x1b[34m║\x1b[0m  │ \x1b[32m[INFO]\x1b[0m Peer connected: QmBootstrap1                         \x1b[90m5s ago\x1b[0m  │  \x1b[34m║\x1b[0m
\x1b[34m║\x1b[0m  │ \x1b[33m[WARN]\x1b[0m High latency detected                              \x1b[90m10s ago\x1b[0m  │  \x1b[34m║\x1b[0m
\x1b[34m║\x1b[0m  └────────────────────────────────────────────────────────────────────────┘  \x1b[34m║\x1b[0m
\x1b[34m║\x1b[0m                                                                            \x1b[34m║\x1b[0m
\x1b[34m╠════════════════════════════════════════════════════════════════════════════╣\x1b[0m
\x1b[34m║\x1b[0m \x1b[90m[Tab] Focus │ [1-6] Views │ [Ctrl+P] Commands │ [?] Help │ [q] Quit\x1b[0m       \x1b[34m║\x1b[0m
\x1b[34m╚════════════════════════════════════════════════════════════════════════════╝\x1b[0m
`;

      const result = screenshotManager.take('dashboard-mockup', output, 'html');
      expect(fs.existsSync(result.filepath)).toBe(true);
    });

    it('generates peers view mockup', () => {
      const output = `
\x1b[34m╔════════════════════════════════════════════════════════════════════════════╗\x1b[0m
\x1b[34m║\x1b[0m \x1b[31m●\x1b[0m \x1b[1mPeer Connections\x1b[0m │ \x1b[32m2 connected\x1b[0m (\x1b[34m1 direct\x1b[0m, \x1b[33m1 relayed\x1b[0m) │ [v] list      \x1b[34m║\x1b[0m
\x1b[34m╠════════════════════════════════════════════════════════════════════════════╣\x1b[0m
\x1b[34m║\x1b[0m                                                                            \x1b[34m║\x1b[0m
\x1b[34m║\x1b[0m  ┌─ Search Peers [/] ─────────────────────────────────────────────────────┐  \x1b[34m║\x1b[0m
\x1b[34m║\x1b[0m  │ \x1b[90mPress [/] to search...\x1b[0m                                                │  \x1b[34m║\x1b[0m
\x1b[34m║\x1b[0m  └────────────────────────────────────────────────────────────────────────┘  \x1b[34m║\x1b[0m
\x1b[34m║\x1b[0m                                                                            \x1b[34m║\x1b[0m
\x1b[34m║\x1b[0m  ┌─ Add Peer [a] ──────────────────────────────────────────────────────────┐  \x1b[34m║\x1b[0m
\x1b[34m║\x1b[0m  │ \x1b[90mPress [a] to add peer...\x1b[0m                                              │  \x1b[34m║\x1b[0m
\x1b[34m║\x1b[0m  └────────────────────────────────────────────────────────────────────────┘  \x1b[34m║\x1b[0m
\x1b[34m║\x1b[0m                                                                            \x1b[34m║\x1b[0m
\x1b[34m║\x1b[0m  ┌─ Peers (2) ────────────────────────────────────────────────────────────┐  \x1b[34m║\x1b[0m
\x1b[34m║\x1b[0m  │                                                                        │  \x1b[34m║\x1b[0m
\x1b[34m║\x1b[0m  │  \x1b[34m┌────────────────────────────────────────────────────────────────┐\x1b[0m  │  \x1b[34m║\x1b[0m
\x1b[34m║\x1b[0m  │  \x1b[34m│\x1b[0m \x1b[34m>\x1b[0m \x1b[32m●\x1b[0m \x1b[32m\x1b[1mQmBootstrap1...abc123\x1b[0m                              \x1b[31m[d]\x1b[0m \x1b[34m│\x1b[0m  │  \x1b[34m║\x1b[0m
\x1b[34m║\x1b[0m  │  \x1b[34m│\x1b[0m   \x1b[32mConnected\x1b[0m │ \x1b[34m⚡ direct\x1b[0m │ 2s ago                          \x1b[34m│\x1b[0m  │  \x1b[34m║\x1b[0m
\x1b[34m║\x1b[0m  │  \x1b[34m└────────────────────────────────────────────────────────────────┘\x1b[0m  │  \x1b[34m║\x1b[0m
\x1b[34m║\x1b[0m  │                                                                        │  \x1b[34m║\x1b[0m
\x1b[34m║\x1b[0m  │  ┌────────────────────────────────────────────────────────────────┐  │  \x1b[34m║\x1b[0m
\x1b[34m║\x1b[0m  │  │ \x1b[32m●\x1b[0m \x1b[32mQmRelayNode2...def456\x1b[0m                                        │  │  \x1b[34m║\x1b[0m
\x1b[34m║\x1b[0m  │  │   \x1b[32mConnected\x1b[0m │ \x1b[33m🔄 relayed\x1b[0m │ 5s ago                         │  │  \x1b[34m║\x1b[0m
\x1b[34m║\x1b[0m  │  └────────────────────────────────────────────────────────────────┘  │  \x1b[34m║\x1b[0m
\x1b[34m║\x1b[0m  │                                                                        │  \x1b[34m║\x1b[0m
\x1b[34m║\x1b[0m  └────────────────────────────────────────────────────────────────────────┘  \x1b[34m║\x1b[0m
\x1b[34m║\x1b[0m                                                                            \x1b[34m║\x1b[0m
\x1b[34m╠════════════════════════════════════════════════════════════════════════════╣\x1b[0m
\x1b[34m║\x1b[0m \x1b[90m[↑↓] Navigate │ [Enter] Details │ [d] Disconnect │ [a] Add │ [/] Search\x1b[0m   \x1b[34m║\x1b[0m
\x1b[34m╚════════════════════════════════════════════════════════════════════════════╝\x1b[0m
`;

      const result = screenshotManager.take('peers-view-mockup', output, 'html');
      expect(fs.existsSync(result.filepath)).toBe(true);
    });

    it('generates logs view mockup', () => {
      const output = `
\x1b[34m╔════════════════════════════════════════════════════════════════════════════╗\x1b[0m
\x1b[34m║\x1b[0m \x1b[32m●\x1b[0m \x1b[1mLogs\x1b[0m │ Filter: \x1b[36m[1]ALL\x1b[0m \x1b[31m[2]ERR\x1b[0m \x1b[33m[3]WARN\x1b[0m \x1b[34m[4]INFO\x1b[0m │ 156 entries          \x1b[34m║\x1b[0m
\x1b[34m╠════════════════════════════════════════════════════════════════════════════╣\x1b[0m
\x1b[34m║\x1b[0m                                                                            \x1b[34m║\x1b[0m
\x1b[34m║\x1b[0m  \x1b[90m2024-01-06 13:45:01\x1b[0m \x1b[34m[INFO]\x1b[0m \x1b[90m[system]\x1b[0m TUI initialized                       \x1b[34m║\x1b[0m
\x1b[34m║\x1b[0m  \x1b[90m2024-01-06 13:45:02\x1b[0m \x1b[34m[INFO]\x1b[0m \x1b[90m[client]\x1b[0m Client mode: Demo (mock data)          \x1b[34m║\x1b[0m
\x1b[34m║\x1b[0m  \x1b[90m2024-01-06 13:45:03\x1b[0m \x1b[34m[INFO]\x1b[0m \x1b[90m[p2p]\x1b[0m Peer connected: QmBootstrap1             \x1b[34m║\x1b[0m
\x1b[34m║\x1b[0m  \x1b[90m2024-01-06 13:45:04\x1b[0m \x1b[34m[INFO]\x1b[0m \x1b[90m[p2p]\x1b[0m Peer connected: QmRelayNode2             \x1b[34m║\x1b[0m
\x1b[34m║\x1b[0m  \x1b[90m2024-01-06 13:45:05\x1b[0m \x1b[33m[WARN]\x1b[0m \x1b[90m[network]\x1b[0m High latency to peer QmRelay...      \x1b[34m║\x1b[0m
\x1b[34m║\x1b[0m  \x1b[90m2024-01-06 13:45:10\x1b[0m \x1b[90m[DEBUG]\x1b[0m \x1b[90m[db]\x1b[0m Loading schema: social                  \x1b[34m║\x1b[0m
\x1b[34m║\x1b[0m  \x1b[90m2024-01-06 13:45:11\x1b[0m \x1b[34m[INFO]\x1b[0m \x1b[90m[db]\x1b[0m Schema loaded: 3 tables                  \x1b[34m║\x1b[0m
\x1b[34m║\x1b[0m  \x1b[90m2024-01-06 13:45:15\x1b[0m \x1b[31m[ERROR]\x1b[0m \x1b[90m[sync]\x1b[0m Failed to sync block abc123...        \x1b[34m║\x1b[0m
\x1b[34m║\x1b[0m  \x1b[90m2024-01-06 13:45:16\x1b[0m \x1b[34m[INFO]\x1b[0m \x1b[90m[sync]\x1b[0m Retrying sync...                        \x1b[34m║\x1b[0m
\x1b[34m║\x1b[0m  \x1b[90m2024-01-06 13:45:20\x1b[0m \x1b[34m[INFO]\x1b[0m \x1b[90m[sync]\x1b[0m Sync complete                           \x1b[34m║\x1b[0m
\x1b[34m║\x1b[0m                                                                            \x1b[34m║\x1b[0m
\x1b[34m╠════════════════════════════════════════════════════════════════════════════╣\x1b[0m
\x1b[34m║\x1b[0m  Stats: \x1b[31m1 error\x1b[0m │ \x1b[33m1 warning\x1b[0m │ \x1b[34m7 info\x1b[0m │ \x1b[90m1 debug\x1b[0m                        \x1b[34m║\x1b[0m
\x1b[34m╠════════════════════════════════════════════════════════════════════════════╣\x1b[0m
\x1b[34m║\x1b[0m \x1b[90m[↑↓] Scroll │ [1-4] Filter │ [/] Search │ [c] Clear │ [e] Export\x1b[0m          \x1b[34m║\x1b[0m
\x1b[34m╚════════════════════════════════════════════════════════════════════════════╝\x1b[0m
`;

      const result = screenshotManager.take('logs-view-mockup', output, 'html');
      expect(fs.existsSync(result.filepath)).toBe(true);
    });

    it('generates empty state mockup', () => {
      const output = `
\x1b[34m╔════════════════════════════════════════════════════════════════════════════╗\x1b[0m
\x1b[34m║\x1b[0m                                                                            \x1b[34m║\x1b[0m
\x1b[34m║\x1b[0m                                                                            \x1b[34m║\x1b[0m
\x1b[34m║\x1b[0m                                                                            \x1b[34m║\x1b[0m
\x1b[34m║\x1b[0m                               \x1b[90m📭\x1b[0m                                          \x1b[34m║\x1b[0m
\x1b[34m║\x1b[0m                                                                            \x1b[34m║\x1b[0m
\x1b[34m║\x1b[0m                        \x1b[1mNo peers connected\x1b[0m                                 \x1b[34m║\x1b[0m
\x1b[34m║\x1b[0m                                                                            \x1b[34m║\x1b[0m
\x1b[34m║\x1b[0m              \x1b[90mConnect to bootstrap nodes to discover peers\x1b[0m                 \x1b[34m║\x1b[0m
\x1b[34m║\x1b[0m                                                                            \x1b[34m║\x1b[0m
\x1b[34m║\x1b[0m                     \x1b[34m[a] Add peer manually\x1b[0m                                 \x1b[34m║\x1b[0m
\x1b[34m║\x1b[0m                                                                            \x1b[34m║\x1b[0m
\x1b[34m║\x1b[0m                                                                            \x1b[34m║\x1b[0m
\x1b[34m║\x1b[0m                                                                            \x1b[34m║\x1b[0m
\x1b[34m╚════════════════════════════════════════════════════════════════════════════╝\x1b[0m
`;

      const result = screenshotManager.take('empty-state-mockup', output, 'html');
      expect(fs.existsSync(result.filepath)).toBe(true);
    });

    it('generates error state mockup', () => {
      const output = `
\x1b[34m╔════════════════════════════════════════════════════════════════════════════╗\x1b[0m
\x1b[34m║\x1b[0m                                                                            \x1b[34m║\x1b[0m
\x1b[34m║\x1b[0m   \x1b[31m┌─────────────────────────────────────────────────────────────────┐\x1b[0m   \x1b[34m║\x1b[0m
\x1b[34m║\x1b[0m   \x1b[31m│\x1b[0m                                                                 \x1b[31m│\x1b[0m   \x1b[34m║\x1b[0m
\x1b[34m║\x1b[0m   \x1b[31m│\x1b[0m  \x1b[31m✖ Connection Error\x1b[0m                                            \x1b[31m│\x1b[0m   \x1b[34m║\x1b[0m
\x1b[34m║\x1b[0m   \x1b[31m│\x1b[0m                                                                 \x1b[31m│\x1b[0m   \x1b[34m║\x1b[0m
\x1b[34m║\x1b[0m   \x1b[31m│\x1b[0m  Unable to connect to the network                               \x1b[31m│\x1b[0m   \x1b[34m║\x1b[0m
\x1b[34m║\x1b[0m   \x1b[31m│\x1b[0m                                                                 \x1b[31m│\x1b[0m   \x1b[34m║\x1b[0m
\x1b[34m║\x1b[0m   \x1b[31m│\x1b[0m  \x1b[90mCheck your network settings and bootstrap nodes configuration.\x1b[0m  \x1b[31m│\x1b[0m   \x1b[34m║\x1b[0m
\x1b[34m║\x1b[0m   \x1b[31m│\x1b[0m                                                                 \x1b[31m│\x1b[0m   \x1b[34m║\x1b[0m
\x1b[34m║\x1b[0m   \x1b[31m│\x1b[0m  \x1b[34m[r] Retry\x1b[0m  \x1b[90m[Esc] Dismiss\x1b[0m                                       \x1b[31m│\x1b[0m   \x1b[34m║\x1b[0m
\x1b[34m║\x1b[0m   \x1b[31m│\x1b[0m                                                                 \x1b[31m│\x1b[0m   \x1b[34m║\x1b[0m
\x1b[34m║\x1b[0m   \x1b[31m└─────────────────────────────────────────────────────────────────┘\x1b[0m   \x1b[34m║\x1b[0m
\x1b[34m║\x1b[0m                                                                            \x1b[34m║\x1b[0m
\x1b[34m╚════════════════════════════════════════════════════════════════════════════╝\x1b[0m
`;

      const result = screenshotManager.take('error-state-mockup', output, 'html');
      expect(fs.existsSync(result.filepath)).toBe(true);
    });
  });

  describe('Asciinema Recordings', () => {
    it('generates demo session recording', () => {
      const session = new RecordingSession({
        title: 'Cinderlink TUI Demo',
        width: 80,
        height: 24,
      });

      // Simulate a demo session
      session.recordOutput('\x1b[2J\x1b[H'); // Clear screen
      session.recordOutput('Starting Cinderlink TUI...\n');
      
      setTimeout(() => {
        session.recordOutput('\x1b[32m✓\x1b[0m Loaded configuration\n');
      }, 100);

      setTimeout(() => {
        session.recordOutput('\x1b[32m✓\x1b[0m Initialized client\n');
      }, 200);

      setTimeout(() => {
        session.recordOutput('\x1b[34mLaunching dashboard...\x1b[0m\n');
      }, 300);

      // Save after a brief delay to capture all events
      const filepath = path.join(screenshotManager.getSessionDir(), 'demo-session.cast');
      
      // Use synchronous events for test
      session.recordOutput('\x1b[2J\x1b[H');
      session.recordOutput('Starting Cinderlink TUI...\n');
      session.recordOutput('\x1b[32m✓\x1b[0m Loaded configuration\n');
      session.recordOutput('\x1b[32m✓\x1b[0m Initialized client\n');
      session.recordOutput('\x1b[34mLaunching dashboard...\x1b[0m\n');
      
      session.save(filepath);
      
      expect(fs.existsSync(filepath)).toBe(true);
      
      // Verify it's valid asciinema format
      const content = fs.readFileSync(filepath, 'utf-8');
      const lines = content.split('\n');
      const header = JSON.parse(lines[0]);
      
      expect(header.version).toBe(2);
      expect(header.title).toBe('Cinderlink TUI Demo');
    });
  });

  describe('Snapshot Tests', () => {
    it('creates consistent snapshots', () => {
      const content = 'Hello World';
      const snapshot1 = createSnapshot('Test', content);
      const snapshot2 = createSnapshot('Test', content);
      
      expect(snapshot1).toBe(snapshot2);
    });

    it('strips ANSI in snapshots when requested', () => {
      const content = '\x1b[32mGreen\x1b[0m Text';
      const snapshot = createSnapshot('Colored', content, { stripAnsi: true });
      
      expect(snapshot).not.toContain('\x1b');
      expect(snapshot).toContain('Green Text');
    });
  });
});
