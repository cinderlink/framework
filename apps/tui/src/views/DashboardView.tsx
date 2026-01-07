import { useMemo } from 'react';
import { PanelContainer } from '../components/Layout/PanelContainer';
import { useResponsiveLayout } from '../hooks/useResponsiveLayout';
import { ConnectionIndicator, NetworkActivity } from '../components/ConnectionIndicator';
import { Separator } from '../components/Separator';
import { Button } from '../components/Button';
import { FocusZone } from '../input';

interface PeerStats {
  total: number;
  connected: number;
  direct: number;
  relayed: number;
}

interface DatabaseStats {
  size: string;
  nodeCount: number;
  syncStatus: 'synced' | 'syncing' | 'pending';
  schemaCount?: number;
  tableCount?: number;
}

interface DashboardViewProps {
  colors: typeof import('../theme/colors').colors.dark;
  peerCount: number;
  dbSize: string;
  uptime: string;
  connected?: boolean;
  connecting?: boolean;
  peerStats?: PeerStats;
  databaseStats?: DatabaseStats;
  recentActivity?: Array<{ id: string; type: string; message: string; timestamp: string }>;
  isRealClient?: boolean;
}

export function DashboardView({
  colors,
  peerCount,
  dbSize,
  uptime,
  connected = true,
  connecting = false,
  peerStats,
  databaseStats,
  recentActivity = [],
  isRealClient = false,
}: DashboardViewProps) {
  const { isCompact, isNarrow, optimalPanelCount } = useResponsiveLayout();

  // Adjust layout based on terminal size
  const showCompactView = isCompact;
  const panelsPerRow = isCompact ? 1 : isNarrow ? 2 : 3;

  // Calculate peer breakdown (use provided stats or derive from peerCount)
  const peers = useMemo(() => peerStats || {
    total: peerCount,
    connected: peerCount,
    direct: Math.floor(peerCount * 0.7),
    relayed: Math.ceil(peerCount * 0.3),
  }, [peerStats, peerCount]);

  // Database stats (use provided or defaults)
  const dbStats = useMemo(() => databaseStats || {
    size: dbSize,
    nodeCount: 0,
    syncStatus: 'synced' as const,
  }, [databaseStats, dbSize]);

  // Sync status color
  const getSyncColor = (status: string) => {
    switch (status) {
      case 'synced': return colors.accentGreen;
      case 'syncing': return colors.accentYellow;
      case 'pending': return colors.textSecondary;
      default: return colors.textSecondary;
    }
  };

  return (
    <box style={{ flexDirection: 'column', padding: 1, flexGrow: 1 }}>
      {/* Header */}
      <box style={{ height: 2, marginBottom: 1 }}>
        <box style={{ flexDirection: 'row', alignItems: 'center' }}>
          <ConnectionIndicator colors={colors} connected={connected} connecting={connecting} />
          <Separator color={colors.textSecondary} />
          <text fg={colors.textPrimary}><b>System Overview</b></text>
          <Separator color={colors.textSecondary} />
          <text fg={isRealClient ? 'cyan' : colors.accentYellow}>
            {isRealClient ? 'Live Mode' : 'Demo Mode'}
          </text>
          {isCompact && (
            <box style={{ marginLeft: 1 }}>
              <text fg={colors.textSecondary}>(compact)</text>
            </box>
          )}
        </box>
      </box>

      {/* Top Row - Status Cards */}
      <box style={{
        flexDirection: showCompactView ? 'column' : 'row',
        height: showCompactView ? undefined : 10,
        marginBottom: 1
      }}>
        {/* Connection Status */}
        <box style={{
          flexGrow: 1,
          marginRight: showCompactView ? 0 : 1,
          marginBottom: showCompactView ? 1 : 0
        }}>
          <PanelContainer
            title="Network Status"
            colors={colors}
            height={showCompactView ? 6 : 8}
          >
            <box style={{ flexDirection: 'column', padding: 1 }}>
              <box style={{ flexDirection: 'row', marginBottom: 1 }}>
                <ConnectionIndicator colors={colors} connected={connected} connecting={connecting} />
              </box>
              <box style={{ flexDirection: 'row' }}>
                <text fg={colors.textSecondary}>Activity: </text>
                <NetworkActivity colors={colors} sending={false} receiving={false} />
              </box>
              {!showCompactView && (
                <box style={{ marginTop: 1, flexDirection: 'row' }}>
                  <text fg={colors.textSecondary}>Uptime: </text>
                  <text fg={colors.accentGreen}>{uptime}</text>
                </box>
              )}
            </box>
          </PanelContainer>
        </box>

        {/* Peer Network */}
        <box style={{
          flexGrow: 1,
          marginRight: (showCompactView || panelsPerRow < 3) ? 0 : 1,
          marginBottom: showCompactView ? 1 : 0
        }}>
          <PanelContainer
            title="Peer Network"
            colors={colors}
            height={showCompactView ? 6 : 8}
          >
            <box style={{ flexDirection: 'column', padding: 1 }}>
              <box style={{ flexDirection: 'row', marginBottom: 1 }}>
                <text fg={colors.accentGreen}><b>{peers.connected}</b></text>
                <text fg={colors.textSecondary}> connected</text>
              </box>
              <box style={{ flexDirection: 'row' }}>
                <text fg={colors.accentBlue}>{peers.direct}</text>
                <text fg={colors.textSecondary}> direct | </text>
                <text fg={colors.accentYellow}>{peers.relayed}</text>
                <text fg={colors.textSecondary}> relayed</text>
              </box>
              {!showCompactView && peers.total > peers.connected && (
                <box style={{ marginTop: 1 }}>
                  <text fg={colors.textSecondary}>
                    {peers.total - peers.connected} disconnected
                  </text>
                </box>
              )}
            </box>
          </PanelContainer>
        </box>

        {/* Database - Show in same row on wide screens */}
        {panelsPerRow >= 3 && (
          <box style={{ flexGrow: 1 }}>
            <PanelContainer title="Database" colors={colors} height={8}>
              <box style={{ flexDirection: 'column', padding: 1 }}>
                <box style={{ flexDirection: 'row', marginBottom: 1 }}>
                  <text fg={colors.accentBlue}><b>{dbStats.size}</b></text>
                </box>
                <box style={{ flexDirection: 'row' }}>
                  <text fg={getSyncColor(dbStats.syncStatus)}>
                    {dbStats.syncStatus === 'synced' ? '● ' : dbStats.syncStatus === 'syncing' ? '◐ ' : '○ '}
                  </text>
                  <text fg={colors.textSecondary}>{dbStats.syncStatus}</text>
                </box>
                {(dbStats.nodeCount > 0 || dbStats.schemaCount || dbStats.tableCount) && (
                  <box style={{ marginTop: 1, flexDirection: 'column' }}>
                    {dbStats.schemaCount !== undefined && dbStats.tableCount !== undefined && (
                      <text fg={colors.textSecondary}>
                        {dbStats.schemaCount} schemas · {dbStats.tableCount} tables
                      </text>
                    )}
                    {dbStats.nodeCount > 0 && (
                      <text fg={colors.textSecondary}>{dbStats.nodeCount} records</text>
                    )}
                  </box>
                )}
              </box>
            </PanelContainer>
          </box>
        )}
      </box>

      {/* Second Row - Database (if not shown above) and Activity */}
      <box style={{
        flexDirection: showCompactView ? 'column' : 'row',
        flexGrow: 1,
        marginBottom: 1
      }}>
        {/* Database - Show here on narrow screens */}
        {panelsPerRow < 3 && (
          <box style={{
            flexGrow: 1,
            marginRight: showCompactView ? 0 : 1,
            marginBottom: showCompactView ? 1 : 0
          }}>
            <PanelContainer
              title="Database"
              colors={colors}
              height={showCompactView ? 5 : 6}
            >
              <box style={{ flexDirection: 'column', padding: 1 }}>
                <box style={{ flexDirection: 'row' }}>
                  <text fg={colors.accentBlue}><b>{dbStats.size}</b></text>
                  <text fg={colors.textSecondary}> | </text>
                  <text fg={getSyncColor(dbStats.syncStatus)}>{dbStats.syncStatus}</text>
                </box>
              </box>
            </PanelContainer>
          </box>
        )}

        {/* Recent Activity */}
        <box style={{ flexGrow: 1 }}>
          <PanelContainer
            title="Recent Activity"
            colors={colors}
          >
            <scrollbox style={{ flexGrow: 1, flexDirection: 'column' }}>
              {recentActivity.length === 0 ? (
                <box style={{ padding: 1 }}>
                  <text fg={colors.textSecondary}>No recent activity</text>
                </box>
              ) : (
                <box style={{ flexDirection: 'column' }}>
                  {recentActivity.slice(0, 5).map(activity => (
                    <box key={activity.id} style={{ flexDirection: 'row', padding: 1 }}>
                      <text fg={colors.textSecondary}>[{activity.type}] </text>
                      <text fg={colors.textPrimary}>{activity.message}</text>
                    </box>
                  ))}
                </box>
              )}
            </scrollbox>
          </PanelContainer>
        </box>
      </box>

      {/* Quick Actions */}
      <box style={{ height: showCompactView ? 3 : 4, border: true, borderColor: colors.border, padding: 1 }}>
        <box style={{ flexDirection: 'row', alignItems: 'center' }}>
          <text fg={colors.textSecondary}>Quick Actions: </text>
          <FocusZone zone="dashboard-actions" orderStart={100}>
            <box style={{ flexDirection: 'row', marginLeft: 1 }}>
              <Button
                id="btn-refresh"
                label="Refresh"
                onClick={() => console.log('Refresh clicked')}
                zone="dashboard-actions"
                order={100}
              />
              <Button
                id="btn-connect"
                label="Connect"
                onClick={() => console.log('Connect clicked')}
                zone="dashboard-actions"
                order={110}
                variant="primary"
              />
              <Button
                id="btn-settings"
                label="Settings"
                onClick={() => console.log('Settings clicked')}
                zone="dashboard-actions"
                order={120}
              />
            </box>
          </FocusZone>
        </box>
        {!showCompactView && (
          <box style={{ marginTop: 1 }}>
            <text fg={colors.textSecondary}>
              Use [Tab] to navigate buttons, [Enter/Space] to activate
            </text>
          </box>
        )}
      </box>
    </box>
  );
}
