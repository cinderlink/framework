/**
 * Screenshot Service
 *
 * Utilities for capturing and saving TUI state for visual feedback.
 * Supports ANSI output capture, HTML rendering, and integration with asciinema.
 */

import * as fs from 'fs';
import * as path from 'path';

export interface ScreenshotOptions {
  /** Output directory for screenshots */
  outputDir?: string;
  /** Screenshot filename (without extension) */
  filename?: string;
  /** Whether to include timestamp in filename */
  includeTimestamp?: boolean;
  /** Output format */
  format?: 'ansi' | 'html' | 'text';
}

export interface ScreenshotResult {
  filepath: string;
  format: string;
  timestamp: Date;
  width?: number;
  height?: number;
}

/**
 * Default screenshot directory
 */
const DEFAULT_OUTPUT_DIR = '.screenshots';

/**
 * Convert ANSI codes to HTML for viewing in browser
 */
function ansiToHtml(ansi: string): string {
  // Basic ANSI to HTML conversion
  const colorMap: Record<string, string> = {
    '30': 'color: #000',
    '31': 'color: #c00',
    '32': 'color: #0c0',
    '33': 'color: #cc0',
    '34': 'color: #00c',
    '35': 'color: #c0c',
    '36': 'color: #0cc',
    '37': 'color: #ccc',
    '90': 'color: #666',
    '91': 'color: #f66',
    '92': 'color: #6f6',
    '93': 'color: #ff6',
    '94': 'color: #66f',
    '95': 'color: #f6f',
    '96': 'color: #6ff',
    '97': 'color: #fff',
    '40': 'background-color: #000',
    '41': 'background-color: #c00',
    '42': 'background-color: #0c0',
    '43': 'background-color: #cc0',
    '44': 'background-color: #00c',
    '45': 'background-color: #c0c',
    '46': 'background-color: #0cc',
    '47': 'background-color: #ccc',
    '1': 'font-weight: bold',
    '3': 'font-style: italic',
    '4': 'text-decoration: underline',
  };

  let html = ansi
    // Escape HTML
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    // Convert ANSI sequences
    .replace(/\x1b\[([0-9;]+)m/g, (_, codes) => {
      if (codes === '0' || codes === '') {
        return '</span>';
      }
      const styles = codes.split(';').map((c: string) => colorMap[c] || '').filter(Boolean).join('; ');
      return styles ? `<span style="${styles}">` : '';
    })
    // Remove other escape sequences
    .replace(/\x1b\[[0-9;]*[A-Za-z]/g, '');

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>TUI Screenshot</title>
  <style>
    body {
      background-color: #1e1e1e;
      color: #d4d4d4;
      font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
      font-size: 14px;
      line-height: 1.4;
      padding: 20px;
      white-space: pre;
    }
    .container {
      border: 1px solid #333;
      padding: 10px;
      border-radius: 4px;
      background-color: #0d0d0d;
    }
  </style>
</head>
<body>
  <div class="container">${html}</div>
</body>
</html>`;
}

/**
 * Strip ANSI codes for plain text output
 */
function stripAnsi(str: string): string {
  return str.replace(/\x1b\[[0-9;]*[A-Za-z]/g, '');
}

/**
 * Generate a timestamp string for filenames
 */
function getTimestamp(): string {
  const now = new Date();
  return now.toISOString().replace(/[:.]/g, '-').replace('T', '_').slice(0, -5);
}

/**
 * Ensure output directory exists
 */
function ensureDir(dir: string): void {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

/**
 * Save a screenshot of ANSI output
 */
export function saveScreenshot(
  ansiContent: string,
  options: ScreenshotOptions = {}
): ScreenshotResult {
  const {
    outputDir = DEFAULT_OUTPUT_DIR,
    filename = 'screenshot',
    includeTimestamp = true,
    format = 'html',
  } = options;

  ensureDir(outputDir);

  const timestamp = getTimestamp();
  const baseName = includeTimestamp ? `${filename}_${timestamp}` : filename;
  
  let content: string;
  let extension: string;

  switch (format) {
    case 'html':
      content = ansiToHtml(ansiContent);
      extension = 'html';
      break;
    case 'text':
      content = stripAnsi(ansiContent);
      extension = 'txt';
      break;
    case 'ansi':
    default:
      content = ansiContent;
      extension = 'ans';
      break;
  }

  const filepath = path.join(outputDir, `${baseName}.${extension}`);
  fs.writeFileSync(filepath, content, 'utf-8');

  return {
    filepath,
    format,
    timestamp: new Date(),
  };
}

/**
 * Capture current terminal dimensions
 */
export function getTerminalSize(): { width: number; height: number } {
  return {
    width: process.stdout.columns || 80,
    height: process.stdout.rows || 24,
  };
}

/**
 * Create a visual test snapshot
 * For use with vitest snapshot testing
 */
export function createSnapshot(
  name: string,
  content: string,
  options: { stripAnsi?: boolean } = {}
): string {
  const output = options.stripAnsi ? stripAnsi(content) : content;
  return `=== ${name} ===\n${output}\n=== end ===`;
}

/**
 * Generate asciinema recording header
 * Use this to create .cast files for asciinema playback
 */
export function createAsciinemaHeader(options: {
  width?: number;
  height?: number;
  title?: string;
  env?: Record<string, string>;
} = {}): string {
  const { width, height } = getTerminalSize();
  const header = {
    version: 2,
    width: options.width || width,
    height: options.height || height,
    timestamp: Math.floor(Date.now() / 1000),
    title: options.title || 'Cinderlink TUI Recording',
    env: options.env || { SHELL: '/bin/bash', TERM: 'xterm-256color' },
  };
  return JSON.stringify(header);
}

/**
 * Format an asciinema event
 * @param time Time offset in seconds
 * @param type Event type: 'o' for output, 'i' for input
 * @param data The text data
 */
export function createAsciinemaEvent(
  time: number,
  type: 'o' | 'i',
  data: string
): string {
  return JSON.stringify([time, type, data]);
}

/**
 * Simple recording session for creating asciinema-compatible recordings
 */
export class RecordingSession {
  private events: string[] = [];
  private startTime: number;
  private header: string;

  constructor(options: { width?: number; height?: number; title?: string } = {}) {
    this.startTime = Date.now();
    this.header = createAsciinemaHeader(options);
  }

  /**
   * Record an output event
   */
  recordOutput(data: string): void {
    const time = (Date.now() - this.startTime) / 1000;
    this.events.push(createAsciinemaEvent(time, 'o', data));
  }

  /**
   * Record an input event
   */
  recordInput(data: string): void {
    const time = (Date.now() - this.startTime) / 1000;
    this.events.push(createAsciinemaEvent(time, 'i', data));
  }

  /**
   * Save the recording to a .cast file
   */
  save(filepath: string): void {
    const dir = path.dirname(filepath);
    ensureDir(dir);
    
    const content = [this.header, ...this.events].join('\n');
    fs.writeFileSync(filepath, content, 'utf-8');
  }

  /**
   * Get recording duration in seconds
   */
  getDuration(): number {
    return (Date.now() - this.startTime) / 1000;
  }
}

/**
 * Screenshot manager for organizing multiple screenshots
 */
export class ScreenshotManager {
  private outputDir: string;
  private session: string;

  constructor(outputDir: string = DEFAULT_OUTPUT_DIR) {
    this.outputDir = outputDir;
    this.session = getTimestamp();
    ensureDir(path.join(outputDir, this.session));
  }

  /**
   * Take a screenshot with automatic naming
   */
  take(name: string, content: string, format: 'ansi' | 'html' | 'text' = 'html'): ScreenshotResult {
    return saveScreenshot(content, {
      outputDir: path.join(this.outputDir, this.session),
      filename: name,
      includeTimestamp: false,
      format,
    });
  }

  /**
   * Get the session directory
   */
  getSessionDir(): string {
    return path.join(this.outputDir, this.session);
  }

  /**
   * List all screenshots in current session
   */
  list(): string[] {
    const dir = this.getSessionDir();
    if (!fs.existsSync(dir)) return [];
    return fs.readdirSync(dir);
  }
}
