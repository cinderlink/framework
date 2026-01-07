import { useState, useEffect, useContext, useMemo, useCallback } from 'react';
import { colors as colorPalette, Theme } from './theme';
import { useViewState } from './hooks/useViewState';
import { settingsService, TuiSettings } from './services/settingsService';
import { DashboardView } from './views/DashboardView';
import { PeersView } from './views/PeersView';
import { LogsView } from './views/LogsView';
import { DatabaseView } from './views/DatabaseView';
import { SettingsView } from './views/SettingsView';
import { MessagingView } from './views/MessagingView';
import { useCinderlinkClient } from './hooks/useCinderlinkClient';
import { useDatabase } from './hooks/useDatabase';
import { useLogs } from './hooks/useLogs';
import { RuntimeContextReact, useKeyboardHandler, useInputMode, useBlockingLayer } from './context';
import { useFocusStore } from './input';
import { useToast, createToastHelpers } from './hooks/useToast';
import { useAppLifecycle } from './hooks/useAppLifecycle';
import { HelpOverlay } from './components/HelpOverlay';
import { ToastContainer } from './components/ToastContainer';
import { LoadingSpinner } from './components/LoadingSpinner';
import { ConnectionIndicator, PeerCountIndicator, NetworkActivity } from './components/ConnectionIndicator';
import { CommandPalette, createDefaultCommands } from './components/CommandPalette';
import { Separator } from './components/Separator';
import { TabBar, type Tab } from './components/TabBar';
import { DebugConsole, useDebugConsole } from './components/DebugConsole';

type ViewType = 'dashboard' | 'peers' | 'logs' | 'database' | 'settings' | 'messaging';

const viewTabs: Tab[] = [
  { id: 'dashboard', label: 'Dashboard', shortcut: '1' },
  { id: 'peers', label: 'Peers', shortcut: '2' },
  { id: 'logs', label: 'Logs', shortcut: '3' },
  { id: 'database', label: 'Database', shortcut: '4' },
  { id: 'settings', label: 'Settings', shortcut: '5' },
  { id: 'messaging', label: 'Messaging', shortcut: '6' },
];

const formatUptime = (seconds: number): string => {
  if (seconds < 0) return '00:00:00';

  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
};

const formatBytes = (bytes: number): string => {
  if (bytes === 0) return '0 B';

  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

export function App() {
  // Get runtime context if available (from shell plugin)
  const runtimeContext = useContext(RuntimeContextReact);
  const realClient = runtimeContext?.client;

  // Element-level focus management
  const focusNext = useFocusStore((state) => state.focusNext);
  const focusPrevious = useFocusStore((state) => state.focusPrevious);
  const activateFocused = useFocusStore((state) => state.activateFocused);
  const focusedId = useFocusStore((state) => state.focusedId);
  const getFocusedNode = useFocusStore((state) => state.getFocusedNode);

  // Help overlay visibility
  const [showHelp, setShowHelp] = useState(false);

  // Command palette visibility
  const [showCommandPalette, setShowCommandPalette] = useState(false);

  // Debug console (Ctrl+` to toggle)
  const debugConsole = useDebugConsole();

  // Toast notification system
  const { toasts, addToast, removeToast } = useToast();
  const toast = createToastHelpers(addToast);

  const [settings, setSettings] = useState<TuiSettings>({
    theme: 'dark',
    autoConnect: true,
    logLevelFilter: 'INFO',
    defaultAutoScroll: true,
    timestampFormat: 'relative',
  });

  const [currentTheme, setCurrentTheme] = useState<Theme>('dark');
  const colors = colorPalette[currentTheme];

  const [viewState, dispatch] = useViewState();

  // Use real client from runtime context if available
  const {
    connected,
    peers,
    metrics,
    loading,
    addPeer,
    removePeer,
    isRealClient,
    sendMessage,
    publishMessage,
  } = useCinderlinkClient(realClient);

  // Real logging from client events
  const { logs, addLog, clearLogs, exportLogs } = useLogs(realClient, {
    minLevel: settings.logLevelFilter as 'DEBUG' | 'INFO' | 'WARN' | 'ERROR',
  });

  // App lifecycle management for proper cleanup on exit
  const { exit } = useAppLifecycle();

  // Input mode for text vs command shortcuts
  const { isTextMode } = useInputMode();

  // Real database from client (with fallback to demo data)
  const { nodes: databaseNodes, stats: dbStats, refresh: refreshDatabase, isRealDatabase } = useDatabase(realClient);

  useEffect(() => {
    settingsService.load().then(loadedSettings => {
      setSettings(loadedSettings);
      setCurrentTheme(loadedSettings.theme);

      addLog('INFO', `Settings loaded. Theme: ${loadedSettings.theme}`, 'system');
    });
  }, [addLog]);

  // Log real client info on connect
  useEffect(() => {
    if (isRealClient && realClient) {
      addLog('INFO', `Client mode: Real client`, 'system');
      addLog('INFO', `DID: ${metrics.didId || 'N/A'}`, 'client');
      addLog('INFO', `Peer ID: ${metrics.peerId || 'N/A'}`, 'client');
      addLog('INFO', `Address: ${metrics.address || 'N/A'}`, 'client');
    } else {
      addLog('INFO', `Client mode: Demo (mock data)`, 'system');
    }
  }, [isRealClient, realClient, metrics.didId, metrics.peerId, metrics.address, addLog]);

  // System-level keyboard handler (highest priority - always runs)
  useKeyboardHandler('system', 'app-system', useCallback((key) => {
    // Ctrl+C always exits
    if (key.name === 'c' && key.ctrl) {
      exit();
      return true;
    }
    return false;
  }, [exit]), [exit]);

  // Block overlay layer when command palette is visible
  useBlockingLayer('overlay', showCommandPalette || showHelp);

  // Overlay keyboard handler (for command palette and help)
  useKeyboardHandler('overlay', 'app-overlay', useCallback((key) => {
    // Command palette shortcuts
    if (showCommandPalette) {
      if (key.name === 'escape') {
        setShowCommandPalette(false);
        return true;
      }
      return false; // Let command palette handle other keys
    }

    // Help overlay shortcuts
    if (showHelp) {
      if (key.name === 'escape') {
        setShowHelp(false);
        return true;
      }
      return false;
    }

    // Toggle command palette with Ctrl+P
    if (key.ctrl && key.name === 'p') {
      setShowCommandPalette(prev => !prev);
      return true;
    }

    // Toggle help overlay with ?
    if (key.name === '?' || (key.shift && key.name === '/')) {
      setShowHelp(prev => !prev);
      return true;
    }

    return false;
  }, [showCommandPalette, showHelp]), [showCommandPalette, showHelp]);

  // Global keyboard handler (view switching, quit, focus navigation)
  useKeyboardHandler('global', 'app-global', useCallback((key) => {
    // Check if focused element is a text input - if so, don't intercept most keys
    const focusedNode = getFocusedNode();
    const isInTextInput = isTextMode || focusedNode?.isTextInput;

    // Quit with q (only when not in text input)
    if (key.name === 'q' && !isInTextInput) {
      exit();
      return true;
    }

    // Element-level focus navigation with Tab/Shift+Tab
    if (key.name === 'tab') {
      if (key.shift) {
        focusPrevious();
      } else {
        focusNext();
      }
      return true;
    }

    // Activate focused element with Enter or Space (only when not in text input)
    if ((key.name === 'return' || key.name === 'space') && !isInTextInput) {
      activateFocused();
      return true;
    }

    // View switching with number keys (only when not in text input)
    if (!isInTextInput) {
      if (key.name === '1') { dispatch({ type: 'SET_VIEW', payload: 'dashboard' }); return true; }
      if (key.name === '2') { dispatch({ type: 'SET_VIEW', payload: 'peers' }); return true; }
      if (key.name === '3') { dispatch({ type: 'SET_VIEW', payload: 'logs' }); return true; }
      if (key.name === '4') { dispatch({ type: 'SET_VIEW', payload: 'database' }); return true; }
      if (key.name === '5') { dispatch({ type: 'SET_VIEW', payload: 'settings' }); return true; }
      if (key.name === '6') { dispatch({ type: 'SET_VIEW', payload: 'messaging' }); return true; }
    }

    return false;
  }, [isTextMode, exit, focusNext, focusPrevious, activateFocused, getFocusedNode, dispatch]),
  [isTextMode, exit, focusNext, focusPrevious, activateFocused, getFocusedNode, dispatch]);

  const handleUpdateSettings = (newSettings: TuiSettings) => {
    setSettings(newSettings);
    setCurrentTheme(newSettings.theme);
    settingsService.save(newSettings);
    addLog('INFO', `Settings updated`, 'system');
    toast.success('Settings saved');
  };

  const handleExportLogs = () => {
    const logContent = exportLogs();
    // In a real implementation, would write to file
    // For now, copy to clipboard or show in log
    addLog('INFO', `Exported ${logs.length} log entries`, 'system');
    console.log('\n--- Exported Logs ---\n' + logContent + '\n--- End Logs ---\n');
    toast.info(`Exported ${logs.length} log entries`);
  };

  const handleClearLogs = () => {
    clearLogs();
    toast.info('Logs cleared');
  };

  // Create command palette commands (must be after handler definitions)
  const commands = useMemo(() => createDefaultCommands(
    dispatch,
    {
      toggleHelp: () => setShowHelp(prev => !prev),
      clearLogs: handleClearLogs,
      exportLogs: handleExportLogs,
    }
  ), [dispatch, handleClearLogs, handleExportLogs]);

  return (
    <box style={{ flexDirection: 'column', height: '100%', width: '100%' }}>
        {/* Header */}
        <box style={{ height: 3, border: true, borderColor: colors.border, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 1 }}>
          <box style={{ flexDirection: 'row', alignItems: 'center' }}>
            <text fg={colors.accentBlue}><b>Cinderlink</b></text>
            <Separator color={colors.textSecondary} />
            <ConnectionIndicator
              colors={colors}
              connected={connected}
              connecting={loading.connecting}
            />
            <Separator color={colors.textSecondary} />
            <text fg={isRealClient ? 'cyan' : colors.accentYellow}>
              {isRealClient ? 'Live' : 'Demo'}
            </text>
            <Separator color={colors.textSecondary} />
            <PeerCountIndicator
              colors={colors}
              count={metrics.peerCount}
              connected={connected}
            />
            <Separator color={colors.textSecondary} />
            <NetworkActivity
              colors={colors}
              sending={loading.sendingMessage || loading.publishing}
              receiving={false}
            />
            {(loading.addingPeer || loading.removingPeer) && (
              <box style={{ flexDirection: 'row' }}>
                <Separator color={colors.textSecondary} />
                {loading.addingPeer && <LoadingSpinner colors={colors} message="Adding peer..." />}
                {loading.removingPeer && <LoadingSpinner colors={colors} message="Removing peer..." />}
              </box>
            )}
          </box>
          {metrics.peerId && (
            <text fg={colors.textSecondary}>ID: {metrics.peerId.slice(0, 16)}...</text>
          )}
        </box>

        {/* Tab Navigation */}
        <box style={{ height: 3, border: true, borderColor: colors.border, padding: 1 }}>
          <TabBar
            tabs={viewTabs}
            activeTab={viewState.currentView}
            onTabChange={(tabId) => dispatch({ type: 'SET_VIEW', payload: tabId as ViewType })}
            colors={colors}
            zone="tabs"
            orderStart={10}
          />
        </box>

        {/* Main Content */}
        <box style={{ flexGrow: 1, border: true, borderColor: colors.border }}>
          {viewState.currentView === 'dashboard' && (
            <DashboardView
              colors={colors}
              peerCount={metrics.peerCount}
              dbSize={formatBytes(metrics.databaseStats.totalSize)}
              uptime={formatUptime(metrics.uptimeSeconds)}
              connected={connected}
              connecting={loading.connecting}
              peerStats={{
                total: peers.length,
                connected: peers.filter(p => p.connected).length,
                direct: peers.filter(p => p.connectionType === 'direct' && p.connected).length,
                relayed: peers.filter(p => p.connectionType === 'relayed' && p.connected).length,
              }}
              databaseStats={{
                size: formatBytes(metrics.databaseStats.totalSize),
                nodeCount: isRealDatabase ? dbStats.totalRecords : metrics.databaseStats.nodeCount,
                syncStatus: metrics.databaseStats.syncStatus,
                schemaCount: dbStats.schemaCount,
                tableCount: dbStats.tableCount,
              }}
              recentActivity={logs.slice(0, 5).map(log => ({
                id: log.id,
                type: log.level,
                message: log.message,
                timestamp: log.timestamp,
              }))}
              isRealClient={isRealClient}
            />
          )}

          {viewState.currentView === 'peers' && (
            <PeersView
              colors={colors}
              peers={peers.map(p => ({
                id: p.id,
                connected: p.connected,
                type: p.connectionType,
                lastSeen: p.lastSeen ? new Date(p.lastSeen).toLocaleTimeString() : 'unknown'
              }))}
              loading={loading}
              onAddPeer={addPeer}
              onDisconnectPeer={removePeer}
              onToast={(message, type) => {
                if (type === 'success') toast.success(message);
                else if (type === 'error') toast.error(message);
                else toast.info(message);
              }}
            />
          )}

          {viewState.currentView === 'logs' && (
            <LogsView
              colors={colors}
              logs={logs}
              onClearLogs={handleClearLogs}
              onExportLogs={handleExportLogs}
            />
          )}

          {viewState.currentView === 'database' && (
            <DatabaseView
              colors={colors}
              nodes={databaseNodes}
              currentPath="/"
              onNavigate={(path) => addLog('DEBUG', `Navigate to: ${path}`, 'database')}
              onExport={() => addLog('INFO', 'Database export requested', 'database')}
            />
          )}

          {viewState.currentView === 'settings' && (
            <SettingsView
              colors={colors}
              settings={settings}
              onUpdateSettings={handleUpdateSettings}
            />
          )}

          {viewState.currentView === 'messaging' && (
            <MessagingView
              colors={colors}
              peers={peers}
              onSendP2P={sendMessage}
              onPublishPubsub={publishMessage}
              isRealClient={isRealClient}
              loading={{ sendingMessage: loading.sendingMessage, publishing: loading.publishing }}
            />
          )}
        </box>

        {/* Status Bar */}
        <box style={{ height: 3, border: true, borderColor: colors.border, flexDirection: 'row', alignItems: 'center', paddingLeft: 1 }}>
          <text fg={colors.textSecondary}>
            [Tab] Focus | [1-6] Views | [Ctrl+P] Commands | [?] Help | [Ctrl+`] Debug | [q] Quit
          </text>
          {focusedId && <text fg={colors.accentBlue}> | Focus: {focusedId}</text>}
        </box>

        {/* Help Overlay */}
        <HelpOverlay
          colors={colors}
          visible={showHelp}
          onClose={() => setShowHelp(false)}
        />

        {/* Command Palette */}
        <CommandPalette
          colors={colors}
          visible={showCommandPalette}
          onClose={() => setShowCommandPalette(false)}
          commands={commands}
        />

        {/* Toast Notifications */}
        <ToastContainer
          colors={colors}
          toasts={toasts}
          onDismiss={removeToast}
        />

        {/* Debug Console (Ctrl+` to toggle) */}
        <DebugConsole
          colors={colors}
          visible={debugConsole.visible}
          onClose={debugConsole.hide}
        />
    </box>
  );
}
