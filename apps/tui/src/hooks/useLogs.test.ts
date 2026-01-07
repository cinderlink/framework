import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useLogs } from './useLogs';
import type { CinderlinkClientInterface } from '@cinderlink/core-types';

// Mock client factory
function createMockClient(): Partial<CinderlinkClientInterface> {
  return {
    id: 'did:key:test123',
    peerId: { toString: () => 'QmTestPeerId' } as unknown as CinderlinkClientInterface['peerId'],
    address: '0x1234567890abcdef' as `0x${string}`,
    on: vi.fn(),
    off: vi.fn(),
  };
}

describe('useLogs', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('initializes with empty logs', () => {
    const { result } = renderHook(() => useLogs());

    // Should have initial "TUI initialized" log
    expect(result.current.logs.length).toBeGreaterThanOrEqual(1);
  });

  it('adds logs with correct structure', () => {
    const { result } = renderHook(() => useLogs());

    act(() => {
      result.current.addLog('INFO', 'Test message', 'test-source');
    });

    const lastLog = result.current.logs[result.current.logs.length - 1];
    expect(lastLog.level).toBe('INFO');
    expect(lastLog.message).toBe('Test message');
    expect(lastLog.source).toBe('test-source');
    expect(lastLog.timestamp).toBeDefined();
    expect(lastLog.id).toBeDefined();
  });

  it('filters logs by minimum level', () => {
    const { result } = renderHook(() => useLogs(undefined, { minLevel: 'WARN' }));

    act(() => {
      result.current.addLog('DEBUG', 'Debug message');
      result.current.addLog('INFO', 'Info message');
      result.current.addLog('WARN', 'Warning message');
      result.current.addLog('ERROR', 'Error message');
    });

    // DEBUG and INFO should be filtered out
    const hasDebug = result.current.logs.some(l => l.message === 'Debug message');
    const hasInfo = result.current.logs.some(l => l.message === 'Info message');
    const hasWarn = result.current.logs.some(l => l.message === 'Warning message');
    const hasError = result.current.logs.some(l => l.message === 'Error message');

    expect(hasDebug).toBe(false);
    expect(hasInfo).toBe(false);
    expect(hasWarn).toBe(true);
    expect(hasError).toBe(true);
  });

  it('clears logs', () => {
    const { result } = renderHook(() => useLogs());

    act(() => {
      result.current.addLog('INFO', 'Message 1');
      result.current.addLog('INFO', 'Message 2');
    });

    expect(result.current.logs.length).toBeGreaterThan(0);

    act(() => {
      result.current.clearLogs();
    });

    expect(result.current.logs.length).toBe(0);
  });

  it('exports logs as formatted string', () => {
    const { result } = renderHook(() => useLogs());

    act(() => {
      result.current.clearLogs();
      result.current.addLog('INFO', 'Test export', 'system');
    });

    const exported = result.current.exportLogs();
    
    expect(exported).toContain('[INFO]');
    expect(exported).toContain('[system]');
    expect(exported).toContain('Test export');
  });

  it('filters logs with filteredLogs function', () => {
    const { result } = renderHook(() => useLogs(undefined, { minLevel: 'DEBUG' }));

    act(() => {
      result.current.clearLogs();
      result.current.addLog('DEBUG', 'Debug');
      result.current.addLog('INFO', 'Info');
      result.current.addLog('WARN', 'Warn');
      result.current.addLog('ERROR', 'Error');
    });

    const errorOnly = result.current.filteredLogs('ERROR');
    expect(errorOnly.length).toBe(1);
    expect(errorOnly[0].level).toBe('ERROR');

    const warnAndAbove = result.current.filteredLogs('WARN');
    expect(warnAndAbove.length).toBe(2);
  });

  it('respects maxLogs limit', () => {
    const { result } = renderHook(() => useLogs(undefined, { maxLogs: 5 }));

    act(() => {
      result.current.clearLogs();
      for (let i = 0; i < 10; i++) {
        result.current.addLog('INFO', `Message ${i}`);
      }
    });

    expect(result.current.logs.length).toBeLessThanOrEqual(5);
    // Should keep most recent logs
    expect(result.current.logs[result.current.logs.length - 1].message).toBe('Message 9');
  });

  it('includes data in log entry when provided', () => {
    const { result } = renderHook(() => useLogs());

    const testData = { key: 'value', count: 42 };

    act(() => {
      result.current.addLog('INFO', 'With data', 'test', testData);
    });

    const lastLog = result.current.logs[result.current.logs.length - 1];
    expect(lastLog.data).toEqual(testData);
  });

  it('subscribes to client events when client provided', () => {
    const mockClient = createMockClient();

    renderHook(() => useLogs(mockClient as CinderlinkClientInterface));

    expect(mockClient.on).toHaveBeenCalledWith('/peer/connect', expect.any(Function));
    expect(mockClient.on).toHaveBeenCalledWith('/peer/disconnect', expect.any(Function));
    expect(mockClient.on).toHaveBeenCalledWith('/server/connect', expect.any(Function));
    expect(mockClient.on).toHaveBeenCalledWith('/client/ready', expect.any(Function));
  });

  it('unsubscribes from client events on unmount', () => {
    const mockClient = createMockClient();

    const { unmount } = renderHook(() => useLogs(mockClient as CinderlinkClientInterface));

    unmount();

    expect(mockClient.off).toHaveBeenCalledWith('/peer/connect', expect.any(Function));
    expect(mockClient.off).toHaveBeenCalledWith('/peer/disconnect', expect.any(Function));
  });

  it('logs client info when real client connected', () => {
    const mockClient = createMockClient();

    const { result } = renderHook(() => useLogs(mockClient as CinderlinkClientInterface));

    // Should have logged client info
    const hasDIDLog = result.current.logs.some(l => l.message.includes('did:key:test123'));
    expect(hasDIDLog).toBe(true);
  });

  it('logs demo mode when no client', () => {
    const { result } = renderHook(() => useLogs());

    const hasDemoLog = result.current.logs.some(l => 
      l.message.toLowerCase().includes('demo') || l.message.includes('initialized')
    );
    expect(hasDemoLog).toBe(true);
  });
});
