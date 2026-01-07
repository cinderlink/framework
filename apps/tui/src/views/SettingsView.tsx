import { useState } from 'react';
import { PanelContainer } from '../components/Layout/PanelContainer';
import { useKeyboard } from '@opentui/react';

interface TuiSettings {
  theme: 'dark' | 'light';
  autoConnect: boolean;
  logLevelFilter: 'ERROR' | 'WARN' | 'INFO' | 'DEBUG';
  defaultAutoScroll: boolean;
  timestampFormat: 'ISO' | 'relative' | 'local';
}

interface SettingsViewProps {
  colors: typeof import('../theme/colors').colors.dark;
  settings: TuiSettings;
  onUpdateSettings: (settings: TuiSettings) => void;
}

const themeOptions = [
  { name: 'Dark', description: 'Dark theme', value: 'dark' },
  { name: 'Light', description: 'Light theme', value: 'light' },
];

const logLevelOptions = [
  { name: 'Debug', description: 'Show all logs', value: 'DEBUG' },
  { name: 'Info', description: 'Show info and above', value: 'INFO' },
  { name: 'Warning', description: 'Show warnings and errors', value: 'WARN' },
  { name: 'Error', description: 'Show errors only', value: 'ERROR' },
];

const timestampOptions = [
  { name: 'Relative', description: 'e.g., 5m ago', value: 'relative' },
  { name: 'Local Time', description: 'Local timezone', value: 'local' },
  { name: 'ISO 8601', description: 'Standard format', value: 'ISO' },
];

export function SettingsView({
  colors,
  settings,
  onUpdateSettings,
}: SettingsViewProps) {
  const [localSettings, setLocalSettings] = useState(settings);
  const [focusedSetting, setFocusedSetting] = useState<string | null>(null);

  useKeyboard((...args: unknown[]) => {
    const key = (args[1] || args[0]) as { name?: string } | undefined;
    if (!key) return;

    // Escape exits focus
    if (key.name === 'escape') {
      setFocusedSetting(null);
      return;
    }

    // Global shortcuts (when not focused)
    if (!focusedSetting) {
      if (key.name === 's') onUpdateSettings(localSettings);
      if (key.name === 'r') setLocalSettings(settings);
      if (key.name === 't') setFocusedSetting('theme');
      if (key.name === 'l') setFocusedSetting('logLevel');
      if (key.name === 'f') setFocusedSetting('timestamp');
      if (key.name === 'a') {
        setLocalSettings(prev => ({ ...prev, autoConnect: !prev.autoConnect }));
      }
    }
  });

  const handleThemeChange = (value: string) => {
    setLocalSettings(prev => ({ ...prev, theme: value as 'dark' | 'light' }));
    setFocusedSetting(null);
  };

  const handleLogLevelChange = (value: string) => {
    setLocalSettings(prev => ({ ...prev, logLevelFilter: value as TuiSettings['logLevelFilter'] }));
    setFocusedSetting(null);
  };

  const handleTimestampChange = (value: string) => {
    setLocalSettings(prev => ({ ...prev, timestampFormat: value as TuiSettings['timestampFormat'] }));
    setFocusedSetting(null);
  };

  return (
    <box style={{ flexDirection: 'column', padding: 1, flexGrow: 1 }}>
      <box style={{ height: 1, marginBottom: 1 }}>
        <text fg={colors.accentPurple}>● </text>
        <text fg={colors.textPrimary}><b>Settings</b></text>
      </box>
      <scrollbox style={{ flexGrow: 1, flexDirection: 'column' }}>
        {/* Theme Selection */}
        <PanelContainer title="Appearance [t]" colors={colors} height={6}>
          <box style={{ flexDirection: 'row', alignItems: 'center' }}>
            <box style={{ marginRight: 2 }}>
              <text fg={colors.textSecondary}>Theme:</text>
            </box>
            {focusedSetting === 'theme' ? (
              <select
                options={themeOptions}
                onChange={(_, option) => option && handleThemeChange(option.value)}
                focused={focusedSetting === 'theme'}
                showScrollIndicator
              />
            ) : (
              <text fg={colors.textPrimary}>{localSettings.theme}</text>
            )}
          </box>
          {focusedSetting === 'theme' && (
            <box style={{ marginTop: 1 }}>
              <text fg={colors.textSecondary}>[↑↓] Select [Enter] Confirm [ESC] Cancel</text>
            </box>
          )}
        </PanelContainer>

        {/* Auto-Connect Toggle */}
        <PanelContainer title="Connection [a]" colors={colors} height={5}>
          <box style={{ flexDirection: 'row' }}>
            <text fg={localSettings.autoConnect ? colors.accentGreen : colors.textSecondary}>
              [ {localSettings.autoConnect ? 'x' : ' '} ] Auto-connect on startup
            </text>
          </box>
          <text fg={colors.textSecondary}>
            Press [a] to toggle
          </text>
        </PanelContainer>

        {/* Log Level Selection */}
        <PanelContainer title="Log Level [l]" colors={colors} height={6}>
          <box style={{ flexDirection: 'row', alignItems: 'center' }}>
            <box style={{ marginRight: 2 }}>
              <text fg={colors.textSecondary}>Level:</text>
            </box>
            {focusedSetting === 'logLevel' ? (
              <select
                options={logLevelOptions}
                onChange={(_, option) => option && handleLogLevelChange(option.value)}
                focused={focusedSetting === 'logLevel'}
                showScrollIndicator
              />
            ) : (
              <text fg={colors.textPrimary}>{localSettings.logLevelFilter}</text>
            )}
          </box>
          {focusedSetting === 'logLevel' && (
            <box style={{ marginTop: 1 }}>
              <text fg={colors.textSecondary}>[↑↓] Select [Enter] Confirm [ESC] Cancel</text>
            </box>
          )}
        </PanelContainer>

        {/* Timestamp Format Selection */}
        <PanelContainer title="Timestamp Format [f]" colors={colors} height={6}>
          <box style={{ flexDirection: 'row', alignItems: 'center' }}>
            <box style={{ marginRight: 2 }}>
              <text fg={colors.textSecondary}>Format:</text>
            </box>
            {focusedSetting === 'timestamp' ? (
              <select
                options={timestampOptions}
                onChange={(_, option) => option && handleTimestampChange(option.value)}
                focused={focusedSetting === 'timestamp'}
                showScrollIndicator
              />
            ) : (
              <text fg={colors.textPrimary}>{localSettings.timestampFormat}</text>
            )}
          </box>
          {focusedSetting === 'timestamp' && (
            <box style={{ marginTop: 1 }}>
              <text fg={colors.textSecondary}>[↑↓] Select [Enter] Confirm [ESC] Cancel</text>
            </box>
          )}
        </PanelContainer>

        {/* Actions */}
        <PanelContainer title="Actions" colors={colors} height={4}>
          <box style={{ flexDirection: 'row' }}>
            <text fg={colors.accentGreen}>[s] Save Settings</text>
            <text fg={colors.textSecondary}>   </text>
            <text fg={colors.accentYellow}>[r] Reset</text>
          </box>
        </PanelContainer>

        {/* About */}
        <PanelContainer title="About" colors={colors} height={6}>
          <text>Cinderlink TUI v0.1.0</text>
          <text fg={colors.textSecondary}>Built with OpenTUI</text>
          <text fg={colors.textSecondary}>[1-6] Switch Views | [q] Quit</text>
        </PanelContainer>
      </scrollbox>
    </box>
  );
}
