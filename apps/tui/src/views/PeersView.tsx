import { useState, useCallback, useMemo } from 'react';
import { PanelContainer } from '../components/Layout/PanelContainer';
import { useKeyboard } from '@opentui/react';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { ConnectionDot } from '../components/ConnectionIndicator';
import { Separator } from '../components/Separator';
import { FocusZone } from '../input';
import { Button } from '../components/Button';

interface Peer {
  id: string;
  connected: boolean;
  type: 'direct' | 'relayed';
  lastSeen: string;
}

interface LoadingStates {
  addingPeer: boolean;
  removingPeer: boolean;
}

interface PeersViewProps {
  colors: typeof import('../theme/colors').colors.dark;
  peers: Peer[];
  loading?: LoadingStates;
  onAddPeer: (peerId: string) => Promise<void>;
  onDisconnectPeer: (peerId: string) => Promise<void>;
  onToast?: (message: string, type: 'success' | 'error' | 'info') => void;
}

type ViewMode = 'list' | 'grid';

export function PeersView({
  colors,
  peers,
  loading = { addingPeer: false, removingPeer: false },
  onAddPeer,
  onDisconnectPeer,
  onToast,
}: PeersViewProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [peerAddress, setPeerAddress] = useState('');
  const [focusedInput, setFocusedInput] = useState<'none' | 'search' | 'add'>('none');
  const [selectedPeerIndex, setSelectedPeerIndex] = useState(0);
  const [actionError, setActionError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [showDetails, setShowDetails] = useState(false);

  const filteredPeers = useMemo(() =>
    peers.filter(peer =>
      peer.id.toLowerCase().includes(searchTerm.toLowerCase())
    ),
    [peers, searchTerm]
  );

  // Convert peers to select options format
  const peerOptions = useMemo(() =>
    filteredPeers.map(peer => ({
      name: peer.id.slice(0, 16) + '...',
      description: `${peer.connected ? '●' : '○'} ${peer.type} | ${peer.lastSeen}`,
      peer,
    })),
    [filteredPeers]
  );

  // Stats
  const stats = useMemo(() => ({
    total: peers.length,
    connected: peers.filter(p => p.connected).length,
    direct: peers.filter(p => p.type === 'direct' && p.connected).length,
    relayed: peers.filter(p => p.type === 'relayed' && p.connected).length,
  }), [peers]);

  const selectedPeer = filteredPeers[selectedPeerIndex];

  const handleAddPeer = useCallback(async () => {
    if (!peerAddress.trim()) return;

    setActionError(null);
    try {
      await onAddPeer(peerAddress.trim());
      setPeerAddress('');
      setFocusedInput('none');
      onToast?.('Peer added successfully', 'success');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to add peer';
      setActionError(message);
      onToast?.(message, 'error');
    }
  }, [peerAddress, onAddPeer, onToast]);

  const handleDisconnectPeer = useCallback(async (peerId: string) => {
    setActionError(null);
    try {
      await onDisconnectPeer(peerId);
      onToast?.('Peer disconnected', 'info');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to disconnect peer';
      setActionError(message);
      onToast?.(message, 'error');
    }
  }, [onDisconnectPeer, onToast]);

  useKeyboard((...args: unknown[]) => {
    const key = (args[1] || args[0]) as { name?: string } | undefined;
    if (!key) return;

    // Clear error on any key press
    if (actionError) setActionError(null);

    // Escape exits input mode or closes details
    if (key.name === 'escape') {
      if (showDetails) {
        setShowDetails(false);
      } else {
        setFocusedInput('none');
      }
      return;
    }

    // Only process these when not in input mode
    if (focusedInput !== 'none') {
      // Enter in add mode adds the peer
      if (key.name === 'return' && focusedInput === 'add' && peerAddress.trim() && !loading.addingPeer) {
        handleAddPeer();
      }
      return;
    }

    // Focus search
    if (key.name === '/') {
      setFocusedInput('search');
    }

    // Focus add peer
    if (key.name === 'a') {
      setFocusedInput('add');
    }

    // Toggle view mode
    if (key.name === 'v') {
      setViewMode(prev => prev === 'list' ? 'grid' : 'list');
    }

    // Navigate peers
    if (key.name === 'up') {
      setSelectedPeerIndex(prev => Math.max(0, prev - 1));
    }
    if (key.name === 'down') {
      setSelectedPeerIndex(prev => Math.min(filteredPeers.length - 1, prev + 1));
    }

    // Show peer details
    if (key.name === 'return' && selectedPeer) {
      setShowDetails(prev => !prev);
    }

    // Disconnect selected peer
    if (key.name === 'd' && selectedPeer?.connected && !loading.removingPeer) {
      handleDisconnectPeer(selectedPeer.id);
    }

    // Reconnect peer
    if (key.name === 'r' && selectedPeer && !selectedPeer.connected && !loading.addingPeer) {
      onAddPeer(selectedPeer.id);
    }
  });

  return (
    <box style={{ flexDirection: 'column', padding: 1, flexGrow: 1 }}>
      {/* Header with stats */}
      <box style={{ height: 2, marginBottom: 1 }}>
        <box style={{ flexDirection: 'row', alignItems: 'center' }}>
          <text fg={colors.accentRed}>●</text>
          <box style={{ marginLeft: 1 }}>
            <text fg={colors.textPrimary}><b>Peer Connections</b></text>
          </box>
          <Separator color={colors.textSecondary} />
          <text fg={colors.accentGreen}>{stats.connected} connected</text>
          <box style={{ marginLeft: 1 }}>
            <text fg={colors.textSecondary}>(</text>
          </box>
          <text fg={colors.accentBlue}>{stats.direct} direct</text>
          <text fg={colors.textSecondary}>, </text>
          <text fg={colors.accentYellow}>{stats.relayed} relayed</text>
          <text fg={colors.textSecondary}>)</text>
          <Separator color={colors.textSecondary} />
          <text fg={viewMode === 'list' ? colors.accentBlue : colors.textSecondary}>
            [v] {viewMode}
          </text>
        </box>
        {actionError && (
          <box style={{ marginTop: 1 }}>
            <text fg={colors.accentRed}>Error: {actionError}</text>
          </box>
        )}
      </box>

      {/* Main content area - split view */}
      <box style={{ flexGrow: 1, flexDirection: 'row' }}>
        {/* Left panel - Controls and List */}
        <box style={{ width: showDetails ? '50%' : '100%', flexDirection: 'column' }}>
          {/* Search */}
          <PanelContainer title="Search Peers [/]" colors={colors} height={4}>
            <box
              style={{
                border: focusedInput === 'search',
                borderColor: focusedInput === 'search' ? colors.accentGreen : colors.border,
              }}
            >
              {focusedInput === 'search' ? (
                <input
                  placeholder="Search by peer ID..."
                  value={searchTerm}
                  onInput={(value: string) => setSearchTerm(value)}
                  focused={focusedInput === 'search'}
                />
              ) : (
                <text fg={searchTerm ? colors.textPrimary : colors.textSecondary}>
                  {searchTerm || 'Press [/] to search...'}
                </text>
              )}
            </box>
          </PanelContainer>

          {/* Add Peer */}
          <PanelContainer title="Add Peer [a]" colors={colors} height={5}>
            <box style={{ flexDirection: 'column' }}>
              <box
                style={{
                  border: focusedInput === 'add',
                  borderColor: focusedInput === 'add' ? colors.accentGreen : colors.border,
                }}
              >
                {loading.addingPeer ? (
                  <LoadingSpinner colors={colors} message="Adding peer..." variant="dots" />
                ) : focusedInput === 'add' ? (
                  <input
                    placeholder="Enter peer multiaddr or ID..."
                    value={peerAddress}
                    onInput={(value: string) => setPeerAddress(value)}
                    onSubmit={handleAddPeer}
                    focused={focusedInput === 'add'}
                  />
                ) : (
                  <text fg={colors.textSecondary}>Press [a] to add peer...</text>
                )}
              </box>
              {focusedInput === 'add' && !loading.addingPeer && (
                <text fg={colors.textSecondary}>[Enter] Add [ESC] Cancel</text>
              )}
            </box>
          </PanelContainer>

          {/* Peer List with select component */}
          <box style={{ flexGrow: 1, marginTop: 1 }}>
            <PanelContainer
              title={`Peers (${filteredPeers.length})`}
              colors={colors}
              actions={
                <FocusZone zone="peer-actions" orderStart={400}>
                  <box style={{ flexDirection: 'row' }}>
                    {selectedPeer?.connected && (
                      <Button
                        id="btn-disconnect"
                        label="Disconnect"
                        onClick={() => selectedPeer && handleDisconnectPeer(selectedPeer.id)}
                        zone="peer-actions"
                        order={400}
                        variant="danger"
                        disabled={loading.removingPeer}
                      />
                    )}
                    {selectedPeer && !selectedPeer.connected && (
                      <Button
                        id="btn-reconnect"
                        label="Reconnect"
                        onClick={() => selectedPeer && onAddPeer(selectedPeer.id)}
                        zone="peer-actions"
                        order={410}
                        variant="primary"
                        disabled={loading.addingPeer}
                      />
                    )}
                  </box>
                </FocusZone>
              }
            >
              {viewMode === 'list' ? (
                <scrollbox style={{ flexGrow: 1, flexDirection: 'column' }} showScrollIndicator={true}>
                  {filteredPeers.length === 0 ? (
                    <box style={{ justifyContent: 'center', padding: 1 }}>
                      <text fg={colors.textSecondary}>
                        {searchTerm ? 'No peers match your search.' : 'No peers connected.'}
                      </text>
                    </box>
                  ) : (
                    <box style={{ flexDirection: 'column' }}>
                      {filteredPeers.map((peer, idx) => (
                        <PeerItem
                          key={peer.id}
                          peer={peer}
                          colors={colors}
                          isSelected={idx === selectedPeerIndex}
                          onDisconnect={() => handleDisconnectPeer(peer.id)}
                          loading={loading}
                        />
                      ))}
                    </box>
                  )}
                </scrollbox>
              ) : (
                /* Grid view using select component */
                <select
                  options={peerOptions}
                  wrapSelection={true}
                  showScrollIndicator={true}
                  onChange={(index) => setSelectedPeerIndex(index)}
                />
              )}
            </PanelContainer>
          </box>
        </box>

        {/* Right panel - Peer Details */}
        {showDetails && selectedPeer && (
          <box style={{ flexGrow: 1, marginLeft: 1 }}>
            <PanelContainer title="Peer Details" colors={colors}>
              <scrollbox style={{ flexGrow: 1, flexDirection: 'column' }} showScrollIndicator={true}>
                <PeerDetails peer={selectedPeer} colors={colors} />
              </scrollbox>
            </PanelContainer>
          </box>
        )}
      </box>

      {/* Footer with keyboard hints */}
      <box style={{ height: 2, marginTop: 1 }}>
        <text fg={colors.textSecondary}>
          [Up/Down] Navigate | [Enter] Details | [d] Disconnect | [r] Reconnect | [/] Search | [a] Add | [v] View
        </text>
      </box>
    </box>
  );
}

interface PeerItemProps {
  peer: Peer;
  colors: typeof import('../theme/colors').colors.dark;
  isSelected: boolean;
  onDisconnect: () => void;
  loading: LoadingStates;
}

function PeerItem({ peer, colors, isSelected, loading }: PeerItemProps) {
  return (
    <box
      style={{
        flexDirection: 'row',
        justifyContent: 'space-between',
        padding: 1,
        border: true,
        borderColor: isSelected ? colors.accentBlue : colors.border,
        marginBottom: 1,
        backgroundColor: isSelected ? colors.panelBackground : undefined,
      }}
    >
      <box style={{ flexDirection: 'column' }}>
        <box style={{ flexDirection: 'row' }}>
          {isSelected && <text fg={colors.accentBlue}>{'> '}</text>}
          <ConnectionDot colors={colors} connected={peer.connected} />
          <box style={{ marginLeft: 1 }}>
            <text fg={peer.connected ? colors.accentGreen : colors.textSecondary}>
              <b>{peer.id}</b>
            </text>
          </box>
        </box>
        <box style={{ flexDirection: 'row', marginTop: 1 }}>
          <text fg={peer.connected ? colors.accentGreen : colors.textSecondary}>
            {peer.connected ? 'Connected' : 'Disconnected'}
          </text>
          <text fg={colors.textSecondary}> | </text>
          <text fg={peer.type === 'direct' ? colors.accentBlue : colors.accentYellow}>
            {peer.type === 'direct' ? '⚡ direct' : '🔄 relayed'}
          </text>
          <text fg={colors.textSecondary}> | {peer.lastSeen}</text>
        </box>
      </box>
      <box style={{ flexDirection: 'row', alignItems: 'center' }}>
        {loading.removingPeer && isSelected && (
          <LoadingSpinner colors={colors} variant="dots" />
        )}
        {peer.connected && isSelected && !loading.removingPeer && (
          <text fg={colors.accentRed}>[d]</text>
        )}
        {!peer.connected && isSelected && !loading.addingPeer && (
          <text fg={colors.accentGreen}>[r]</text>
        )}
      </box>
    </box>
  );
}

/**
 * Detailed peer information panel
 */
function PeerDetails({
  peer,
  colors,
}: {
  peer: Peer;
  colors: typeof import('../theme/colors').colors.dark;
}) {
  return (
    <box style={{ flexDirection: 'column', padding: 1 }}>
      {/* Status header */}
      <box style={{ flexDirection: 'row', marginBottom: 2 }}>
        <ConnectionDot colors={colors} connected={peer.connected} />
        <box style={{ marginLeft: 1 }}>
          <text fg={peer.connected ? colors.accentGreen : colors.accentRed}>
            <b>{peer.connected ? 'CONNECTED' : 'DISCONNECTED'}</b>
          </text>
        </box>
      </box>

      {/* Peer ID */}
      <box style={{ flexDirection: 'column', marginBottom: 2 }}>
        <text fg={colors.textSecondary}>Peer ID:</text>
        <box style={{ marginTop: 1 }}>
          <code language="text" content={peer.id} />
        </box>
      </box>

      {/* Connection type */}
      <box style={{ flexDirection: 'row', marginBottom: 1 }}>
        <text fg={colors.textSecondary}>Connection Type: </text>
        <text fg={peer.type === 'direct' ? colors.accentBlue : colors.accentYellow}>
          {peer.type === 'direct' ? '⚡ Direct' : '🔄 Relayed'}
        </text>
      </box>

      {/* Last seen */}
      <box style={{ flexDirection: 'row', marginBottom: 1 }}>
        <text fg={colors.textSecondary}>Last Seen: </text>
        <text fg={colors.textPrimary}>{peer.lastSeen}</text>
      </box>

      {/* Connection quality indicator */}
      <box style={{ flexDirection: 'column', marginTop: 2 }}>
        <text fg={colors.textSecondary}>Connection Quality:</text>
        <box style={{ marginTop: 1, flexDirection: 'row' }}>
          {peer.connected ? (
            <box style={{ flexDirection: 'row' }}>
              <text fg={colors.accentGreen}>████████</text>
              <text fg={colors.textSecondary}>██</text>
              <text fg={colors.textSecondary}> Good</text>
            </box>
          ) : (
            <box style={{ flexDirection: 'row' }}>
              <text fg={colors.accentRed}>██████████</text>
              <text fg={colors.textSecondary}> N/A</text>
            </box>
          )}
        </box>
      </box>

      {/* Actions hint */}
      <box style={{ marginTop: 2 }}>
        <text fg={colors.textSecondary}>
          <i>Press [ESC] to close details</i>
        </text>
      </box>
    </box>
  );
}
