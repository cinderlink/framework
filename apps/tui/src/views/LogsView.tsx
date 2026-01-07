import { useState, useMemo, useRef, useEffect } from 'react';
import { PanelContainer } from '../components/Layout/PanelContainer';
import { useKeyboard, useRenderer } from '@opentui/react';
import { FocusZone } from '../input';
import { Button } from '../components/Button';

type LogLevel = 'ERROR' | 'WARN' | 'INFO' | 'DEBUG';
type FilterLevel = LogLevel | 'ALL';

interface LogEntry {
  id: string;
  timestamp: string;
  level: LogLevel;
  message: string;
  source?: string;
}

interface LogsViewProps {
  colors: typeof import('../theme/colors').colors.dark;
  logs: LogEntry[];
  onClearLogs: () => void;
  onExportLogs: () => void;
}

const FILTER_LEVELS: FilterLevel[] = ['ALL', 'ERROR', 'WARN', 'INFO', 'DEBUG'];

// Virtual scrolling config
const LOG_ITEM_HEIGHT = 2; // Approximate height per log entry
const VISIBLE_BUFFER = 5; // Extra items to render above/below viewport

export function LogsView({
  colors,
  logs,
  onClearLogs,
  onExportLogs,
}: LogsViewProps) {
  const [filterLevel, setFilterLevel] = useState<FilterLevel>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [focusedInput, setFocusedInput] = useState<'none' | 'search'>('none');
  const [autoScroll, setAutoScroll] = useState(true);
  const [selectedLogIndex, setSelectedLogIndex] = useState<number | null>(null);
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);

  const renderer = useRenderer();
  const previousLogCount = useRef(logs.length);

  // Filter logs by level and search query
  const filteredLogs = useMemo(() => {
    let result = logs;

    // Filter by level
    if (filterLevel !== 'ALL') {
      result = result.filter(log => log.level === filterLevel);
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(log =>
        log.message.toLowerCase().includes(query) ||
        log.source?.toLowerCase().includes(query)
      );
    }

    return result;
  }, [logs, filterLevel, searchQuery]);

  // Count logs by level for display
  const levelCounts = useMemo(() => ({
    ALL: logs.length,
    ERROR: logs.filter(l => l.level === 'ERROR').length,
    WARN: logs.filter(l => l.level === 'WARN').length,
    INFO: logs.filter(l => l.level === 'INFO').length,
    DEBUG: logs.filter(l => l.level === 'DEBUG').length,
  }), [logs]);

  // Auto-scroll to bottom when new logs arrive
  useEffect(() => {
    if (autoScroll && logs.length > previousLogCount.current) {
      // Request re-render to update scroll position
      renderer?.requestRender?.();
    }
    previousLogCount.current = logs.length;
  }, [logs.length, autoScroll, renderer]);

  useKeyboard((...args: unknown[]) => {
    const key = (args[1] || args[0]) as { name?: string; ctrl?: boolean } | undefined;
    if (!key) return;

    // Exit search mode
    if (key.name === 'escape') {
      setFocusedInput('none');
      setExpandedLogId(null);
      setSelectedLogIndex(null);
      return;
    }

    // Don't process shortcuts while in input mode
    if (focusedInput !== 'none') return;

    // Action shortcuts
    if (key.name === 'c') onClearLogs();
    if (key.name === 'e') onExportLogs();
    if (key.name === 'a') setAutoScroll(prev => !prev);

    // Enter search mode
    if (key.name === '/' || key.name === 's') {
      setFocusedInput('search');
      return;
    }

    // Level filter shortcuts
    if (key.name === '0') setFilterLevel('ALL');
    if (key.name === '1') setFilterLevel('ERROR');
    if (key.name === '2') setFilterLevel('WARN');
    if (key.name === '3') setFilterLevel('INFO');
    if (key.name === '4') setFilterLevel('DEBUG');

    // Navigation within logs
    if (key.name === 'up' && selectedLogIndex !== null) {
      setSelectedLogIndex(prev => Math.max(0, (prev ?? 0) - 1));
      setAutoScroll(false);
    }
    if (key.name === 'down') {
      if (selectedLogIndex === null) {
        setSelectedLogIndex(0);
      } else {
        setSelectedLogIndex(prev => Math.min(filteredLogs.length - 1, (prev ?? 0) + 1));
      }
      setAutoScroll(false);
    }

    // Expand/collapse log detail
    if (key.name === 'return' && selectedLogIndex !== null) {
      const log = filteredLogs[selectedLogIndex];
      if (log) {
        setExpandedLogId(prev => prev === log.id ? null : log.id);
      }
    }

    // Jump to top/bottom
    if (key.name === 'g') {
      setSelectedLogIndex(0);
      setAutoScroll(false);
    }
    if (key.name === 'G' || (key.name === 'g' && key.ctrl)) {
      setSelectedLogIndex(filteredLogs.length - 1);
      setAutoScroll(true);
    }
  });

  const getLevelColor = (level: FilterLevel) => {
    switch (level) {
      case 'ERROR': return colors.accentRed;
      case 'WARN': return colors.accentYellow;
      case 'INFO': return colors.accentBlue;
      case 'DEBUG': return colors.textSecondary;
      default: return colors.textPrimary;
    }
  };

  const getLevelIcon = (level: LogLevel) => {
    switch (level) {
      case 'ERROR': return '✖';
      case 'WARN': return '⚠';
      case 'INFO': return 'ℹ';
      case 'DEBUG': return '⚙';
    }
  };

  return (
    <box style={{ flexDirection: 'column', padding: 1, flexGrow: 1 }}>
      {/* Header */}
      <box style={{ height: 2, marginBottom: 1 }}>
        <box style={{ flexDirection: 'row', alignItems: 'center' }}>
          <text fg={colors.accentYellow}>● </text>
          <text fg={colors.textPrimary}><b>System Logs</b></text>
          <text fg={colors.textSecondary}> ({filteredLogs.length}/{logs.length})</text>
          {autoScroll && <text fg={colors.accentGreen}> [Auto-scroll ON]</text>}
          {selectedLogIndex !== null && (
            <text fg={colors.accentBlue}> [{selectedLogIndex + 1}/{filteredLogs.length}]</text>
          )}
        </box>
      </box>

      {/* Filter Controls */}
      <box style={{ height: 5, marginBottom: 1 }}>
        <PanelContainer title="Filters" colors={colors}>
          {/* Level filters */}
          <box style={{ flexDirection: 'row', marginBottom: 1 }}>
            <text fg={colors.textSecondary}>Level: </text>
            {FILTER_LEVELS.map((level, idx) => (
              <box key={level} style={{ marginRight: 1 }}>
                <text
                  fg={filterLevel === level ? getLevelColor(level) : colors.textSecondary}
                >
                  {filterLevel === level ? <b>[{idx}:{level}]</b> : `[${idx}:${level}]`}
                </text>
                <text fg={colors.textSecondary}>({levelCounts[level]})</text>
              </box>
            ))}
          </box>

          {/* Search input */}
          <box style={{ flexDirection: 'row' }}>
            <text fg={colors.textSecondary}>[/] Search: </text>
            {focusedInput === 'search' ? (
              <input
                placeholder="Type to filter logs..."
                value={searchQuery}
                onInput={setSearchQuery}
                focused={focusedInput === 'search'}
              />
            ) : (
              <text fg={searchQuery ? colors.textPrimary : colors.textSecondary}>
                {searchQuery || '(press / to search)'}
              </text>
            )}
          </box>
        </PanelContainer>
      </box>

      {/* Log Entries */}
      <box style={{ flexGrow: 1 }}>
        <PanelContainer
          title="Log Entries"
          colors={colors}
          actions={
            <FocusZone zone="log-actions" orderStart={300}>
              <box style={{ flexDirection: 'row' }}>
                <Button
                  id="btn-clear"
                  label="Clear"
                  onClick={onClearLogs}
                  zone="log-actions"
                  order={300}
                  variant="danger"
                />
                <Button
                  id="btn-export"
                  label="Export"
                  onClick={onExportLogs}
                  zone="log-actions"
                  order={310}
                />
                <Button
                  id="btn-autoscroll"
                  label={autoScroll ? 'Auto: ON' : 'Auto: OFF'}
                  onClick={() => setAutoScroll(prev => !prev)}
                  zone="log-actions"
                  order={320}
                  variant={autoScroll ? 'primary' : 'ghost'}
                />
              </box>
            </FocusZone>
          }
        >
          <scrollbox
            style={{ flexGrow: 1, flexDirection: 'column' }}
            showScrollIndicator={true}
          >
            {filteredLogs.length === 0 ? (
              <box style={{ padding: 2, justifyContent: 'center' }}>
                <text fg={colors.textSecondary}>
                  {logs.length === 0 ? 'No logs to display.' : 'No logs match the current filter.'}
                </text>
              </box>
            ) : (
              filteredLogs.map((log, idx) => (
                <LogEntryItem
                  key={log.id}
                  log={log}
                  colors={colors}
                  searchQuery={searchQuery}
                  isSelected={idx === selectedLogIndex}
                  isExpanded={log.id === expandedLogId}
                  getLevelIcon={getLevelIcon}
                />
              ))
            )}
          </scrollbox>
        </PanelContainer>
      </box>

      {/* Footer with keyboard hints */}
      <box style={{ height: 2, marginTop: 1 }}>
        <text fg={colors.textSecondary}>
          [0-4] Filter | [/] Search | [Up/Down] Navigate | [Enter] Expand | [g/G] Top/Bottom | [a] AutoScroll
        </text>
      </box>
    </box>
  );
}

function LogEntryItem({
  log,
  colors,
  searchQuery,
  isSelected,
  isExpanded,
  getLevelIcon,
}: {
  log: LogEntry;
  colors: typeof import('../theme/colors').colors.dark;
  searchQuery: string;
  isSelected: boolean;
  isExpanded: boolean;
  getLevelIcon: (level: LogLevel) => string;
}) {
  const levelColors: Record<LogLevel, string> = {
    ERROR: colors.accentRed,
    WARN: colors.accentYellow,
    INFO: colors.accentBlue,
    DEBUG: colors.textSecondary,
  };

  const color = levelColors[log.level];

  // Simple highlight - show match indicator if search is active
  const hasMatch = searchQuery && (
    log.message.toLowerCase().includes(searchQuery.toLowerCase()) ||
    log.source?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <box
      style={{
        flexDirection: 'column',
        marginBottom: 1,
        border: isSelected,
        borderColor: isSelected ? colors.accentBlue : colors.border,
        backgroundColor: isSelected ? colors.panelBackground : undefined,
        padding: isSelected ? 1 : 0,
      }}
    >
      <box style={{ flexDirection: 'row' }}>
        {/* Selection indicator */}
        {isSelected && <text fg={colors.accentBlue}>{'> '}</text>}

        {/* Match indicator */}
        {searchQuery && (
          <box style={{ marginRight: 1 }}>
            <text fg={hasMatch ? colors.accentGreen : colors.textSecondary}>
              {hasMatch ? '●' : ' '}
            </text>
          </box>
        )}

        {/* Level icon */}
        <box style={{ marginRight: 1 }}>
          <text fg={color}>{getLevelIcon(log.level)}</text>
        </box>

        {/* Timestamp */}
        <box style={{ marginRight: 1 }}>
          <text fg={colors.textSecondary}>{log.timestamp}</text>
        </box>

        {/* Level badge */}
        <box style={{ marginRight: 1 }}>
          <text fg={color}><b>[{log.level.padEnd(5)}]</b></text>
        </box>

        {/* Source (if present) */}
        {log.source && (
          <box style={{ marginRight: 1 }}>
            <text fg={colors.accentBlue}>[{log.source}]</text>
          </box>
        )}

        {/* Message (truncated if not expanded) */}
        <text fg={colors.textPrimary}>
          {isExpanded ? log.message : log.message.slice(0, 80) + (log.message.length > 80 ? '...' : '')}
        </text>
      </box>

      {/* Expanded details */}
      {isExpanded && (
        <box style={{ flexDirection: 'column', marginTop: 1, marginLeft: 4 }}>
          <box style={{ flexDirection: 'row' }}>
            <text fg={colors.textSecondary}>Full message: </text>
          </box>
          <box style={{ marginTop: 1 }}>
            <code language="text" content={log.message} />
          </box>
          {log.source && (
            <box style={{ marginTop: 1, flexDirection: 'row' }}>
              <text fg={colors.textSecondary}>Source: </text>
              <text fg={colors.accentBlue}>{log.source}</text>
            </box>
          )}
        </box>
      )}
    </box>
  );
}
