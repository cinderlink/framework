import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import {
  saveScreenshot,
  createSnapshot,
  createAsciinemaHeader,
  createAsciinemaEvent,
  RecordingSession,
  ScreenshotManager,
  getTerminalSize,
} from './screenshotService';

const TEST_OUTPUT_DIR = '.test-screenshots';

describe('screenshotService', () => {
  beforeEach(() => {
    // Clean up test directory
    if (fs.existsSync(TEST_OUTPUT_DIR)) {
      fs.rmSync(TEST_OUTPUT_DIR, { recursive: true });
    }
  });

  afterEach(() => {
    // Clean up after tests
    if (fs.existsSync(TEST_OUTPUT_DIR)) {
      fs.rmSync(TEST_OUTPUT_DIR, { recursive: true });
    }
  });

  describe('saveScreenshot', () => {
    it('saves ANSI content as HTML', () => {
      const ansiContent = '\x1b[32mGreen text\x1b[0m Normal text';
      
      const result = saveScreenshot(ansiContent, {
        outputDir: TEST_OUTPUT_DIR,
        filename: 'test',
        includeTimestamp: false,
        format: 'html',
      });

      expect(result.format).toBe('html');
      expect(result.filepath).toContain('test.html');
      expect(fs.existsSync(result.filepath)).toBe(true);

      const content = fs.readFileSync(result.filepath, 'utf-8');
      expect(content).toContain('<!DOCTYPE html>');
      expect(content).toContain('Green text');
    });

    it('saves plain text with ANSI stripped', () => {
      const ansiContent = '\x1b[31mRed\x1b[0m text';
      
      const result = saveScreenshot(ansiContent, {
        outputDir: TEST_OUTPUT_DIR,
        filename: 'plain',
        includeTimestamp: false,
        format: 'text',
      });

      expect(result.format).toBe('text');
      const content = fs.readFileSync(result.filepath, 'utf-8');
      expect(content).toBe('Red text');
      expect(content).not.toContain('\x1b');
    });

    it('saves raw ANSI content', () => {
      const ansiContent = '\x1b[34mBlue\x1b[0m';
      
      const result = saveScreenshot(ansiContent, {
        outputDir: TEST_OUTPUT_DIR,
        filename: 'raw',
        includeTimestamp: false,
        format: 'ansi',
      });

      expect(result.format).toBe('ansi');
      const content = fs.readFileSync(result.filepath, 'utf-8');
      expect(content).toContain('\x1b[34m');
    });

    it('includes timestamp in filename when requested', () => {
      const result = saveScreenshot('content', {
        outputDir: TEST_OUTPUT_DIR,
        filename: 'timestamped',
        includeTimestamp: true,
        format: 'text',
      });

      // Should have date-like pattern in filename
      expect(result.filepath).toMatch(/timestamped_\d{4}-\d{2}-\d{2}/);
    });
  });

  describe('createSnapshot', () => {
    it('creates formatted snapshot with name', () => {
      const snapshot = createSnapshot('TestView', 'Hello World');
      
      expect(snapshot).toContain('=== TestView ===');
      expect(snapshot).toContain('Hello World');
      expect(snapshot).toContain('=== end ===');
    });

    it('strips ANSI when requested', () => {
      const snapshot = createSnapshot(
        'CleanView',
        '\x1b[32mColored\x1b[0m text',
        { stripAnsi: true }
      );
      
      expect(snapshot).not.toContain('\x1b');
      expect(snapshot).toContain('Colored text');
    });
  });

  describe('asciinema helpers', () => {
    it('creates valid asciinema header', () => {
      const header = createAsciinemaHeader({
        width: 120,
        height: 40,
        title: 'Test Recording',
      });

      const parsed = JSON.parse(header);
      expect(parsed.version).toBe(2);
      expect(parsed.width).toBe(120);
      expect(parsed.height).toBe(40);
      expect(parsed.title).toBe('Test Recording');
      expect(parsed.timestamp).toBeDefined();
    });

    it('creates valid asciinema event', () => {
      const event = createAsciinemaEvent(1.5, 'o', 'Hello');
      
      const parsed = JSON.parse(event);
      expect(parsed[0]).toBe(1.5);
      expect(parsed[1]).toBe('o');
      expect(parsed[2]).toBe('Hello');
    });
  });

  describe('RecordingSession', () => {
    it('records output events', async () => {
      const session = new RecordingSession({ title: 'Test' });
      
      session.recordOutput('Line 1\n');
      await new Promise(r => setTimeout(r, 10));
      session.recordOutput('Line 2\n');

      const filepath = path.join(TEST_OUTPUT_DIR, 'test.cast');
      session.save(filepath);

      expect(fs.existsSync(filepath)).toBe(true);
      
      const content = fs.readFileSync(filepath, 'utf-8');
      const lines = content.split('\n');
      
      // First line is header
      const header = JSON.parse(lines[0]);
      expect(header.version).toBe(2);
      
      // Second line is first event
      const event1 = JSON.parse(lines[1]);
      expect(event1[1]).toBe('o');
      expect(event1[2]).toBe('Line 1\n');
    });

    it('tracks duration', async () => {
      const session = new RecordingSession();
      
      await new Promise(r => setTimeout(r, 50));
      
      const duration = session.getDuration();
      expect(duration).toBeGreaterThanOrEqual(0.04);
    });
  });

  describe('ScreenshotManager', () => {
    it('creates session directory', () => {
      const manager = new ScreenshotManager(TEST_OUTPUT_DIR);
      const sessionDir = manager.getSessionDir();
      
      expect(fs.existsSync(sessionDir)).toBe(true);
    });

    it('takes multiple screenshots in session', () => {
      const manager = new ScreenshotManager(TEST_OUTPUT_DIR);
      
      manager.take('view1', 'Content 1');
      manager.take('view2', 'Content 2');
      
      const files = manager.list();
      expect(files).toContain('view1.html');
      expect(files).toContain('view2.html');
    });

    it('supports different formats', () => {
      const manager = new ScreenshotManager(TEST_OUTPUT_DIR);
      
      manager.take('html-view', 'HTML', 'html');
      manager.take('text-view', 'Text', 'text');
      manager.take('ansi-view', 'ANSI', 'ansi');
      
      const files = manager.list();
      expect(files).toContain('html-view.html');
      expect(files).toContain('text-view.txt');
      expect(files).toContain('ansi-view.ans');
    });
  });

  describe('getTerminalSize', () => {
    it('returns dimensions object', () => {
      const size = getTerminalSize();
      
      expect(size).toHaveProperty('width');
      expect(size).toHaveProperty('height');
      expect(typeof size.width).toBe('number');
      expect(typeof size.height).toBe('number');
    });
  });
});
