import { useState, useCallback, useMemo } from 'react';
import { PanelContainer } from '../components/Layout/PanelContainer';
import { useKeyboard } from '@opentui/react';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { ConnectionDot } from '../components/ConnectionIndicator';

interface MessageHistoryEntry {
  id: string;
  timestamp: string;
  direction: 'sent' | 'received';
  type: 'p2p' | 'pubsub';
  topic: string;
  peerId?: string;
  payload: string;
  status: 'pending' | 'success' | 'error';
  error?: string;
}

type HistoryFilter = 'all' | 'sent' | 'received' | 'errors';

interface MessagingViewProps {
  colors: typeof import('../theme/colors').colors.dark;
  peers: { id: string; connected: boolean }[];
  onSendP2P: (peerId: string, topic: string, payload: unknown) => Promise<void>;
  onPublishPubsub: (topic: string, payload: unknown) => Promise<void>;
  isRealClient: boolean;
  loading?: { sendingMessage: boolean; publishing: boolean };
}

export function MessagingView({
  colors,
  peers,
  onSendP2P,
  onPublishPubsub,
  isRealClient,
  loading = { sendingMessage: false, publishing: false },
}: MessagingViewProps) {
  const [mode, setMode] = useState<'p2p' | 'pubsub'>('pubsub');
  const [selectedPeerIndex, setSelectedPeerIndex] = useState(0);
  const [topic, setTopic] = useState('/cinderlink/test');
  const [payload, setPayload] = useState('{"message": "Hello from TUI"}');
  const [history, setHistory] = useState<MessageHistoryEntry[]>([]);
  const [focusedInput, setFocusedInput] = useState<'none' | 'topic' | 'payload'>('none');
  const [historyFilter, setHistoryFilter] = useState<HistoryFilter>('all');
  const [selectedMessageIndex, setSelectedMessageIndex] = useState(0);
  const [expandedMessageId, setExpandedMessageId] = useState<string | null>(null);

  const connectedPeers = peers.filter((p) => p.connected);
  const isSending = loading.sendingMessage || loading.publishing;

  // Filter history based on current filter
  const filteredHistory = useMemo(() => {
    switch (historyFilter) {
      case 'sent':
        return history.filter(m => m.direction === 'sent');
      case 'received':
        return history.filter(m => m.direction === 'received');
      case 'errors':
        return history.filter(m => m.status === 'error');
      default:
        return history;
    }
  }, [history, historyFilter]);

  // Message stats
  const stats = useMemo(() => ({
    total: history.length,
    sent: history.filter(m => m.direction === 'sent').length,
    received: history.filter(m => m.direction === 'received').length,
    errors: history.filter(m => m.status === 'error').length,
  }), [history]);

  const addToHistory = useCallback(
    (entry: Omit<MessageHistoryEntry, 'id' | 'timestamp'>) => {
      setHistory((prev) => [
        {
          ...entry,
          id: `msg-${Date.now()}-${Math.random().toString(36).slice(2)}`,
          timestamp: new Date().toISOString(),
        },
        ...prev.slice(0, 49), // Keep last 50 messages
      ]);
    },
    []
  );

  const handleSend = useCallback(async () => {
    let parsedPayload: unknown;
    try {
      parsedPayload = JSON.parse(payload);
    } catch {
      addToHistory({
        direction: 'sent',
        type: mode,
        topic,
        peerId: mode === 'p2p' ? connectedPeers[selectedPeerIndex]?.id : undefined,
        payload,
        status: 'error',
        error: 'Invalid JSON payload',
      });
      return;
    }

    const entry: Omit<MessageHistoryEntry, 'id' | 'timestamp'> = {
      direction: 'sent',
      type: mode,
      topic,
      peerId: mode === 'p2p' ? connectedPeers[selectedPeerIndex]?.id : undefined,
      payload,
      status: 'pending',
    };

    try {
      if (mode === 'p2p') {
        const peer = connectedPeers[selectedPeerIndex];
        if (!peer) {
          addToHistory({ ...entry, status: 'error', error: 'No peer selected' });
          return;
        }
        await onSendP2P(peer.id, topic, parsedPayload);
      } else {
        await onPublishPubsub(topic, parsedPayload);
      }
      addToHistory({ ...entry, status: 'success' });
    } catch (error) {
      addToHistory({
        ...entry,
        status: 'error',
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }, [mode, topic, payload, connectedPeers, selectedPeerIndex, onSendP2P, onPublishPubsub, addToHistory]);

  useKeyboard((...args: unknown[]) => {
    const key = (args[1] || args[0]) as { name?: string; shift?: boolean } | undefined;
    if (!key) return;

    // Escape exits input mode
    if (key.name === 'escape' && focusedInput !== 'none') {
      setFocusedInput('none');
      return;
    }

    // Only process these shortcuts when not in input mode
    if (focusedInput !== 'none') return;

    // Mode switching
    if (key.name === 'tab') {
      setMode((prev) => (prev === 'p2p' ? 'pubsub' : 'p2p'));
    }

    // Peer selection (P2P mode)
    if (mode === 'p2p') {
      if (key.name === 'up') {
        setSelectedPeerIndex((prev) => Math.max(0, prev - 1));
      }
      if (key.name === 'down') {
        setSelectedPeerIndex((prev) => Math.min(connectedPeers.length - 1, prev + 1));
      }
    }

    // Focus topic input
    if (key.name === 't') {
      setFocusedInput('topic');
    }

    // Focus payload input
    if (key.name === 'p') {
      setFocusedInput('payload');
    }

    // Send
    if (key.name === 'return' && !isSending) {
      handleSend();
    }

    // Clear history
    if (key.name === 'c') {
      setHistory([]);
    }

    // Cycle history filter
    if (key.name === 'f') {
      const filters: HistoryFilter[] = ['all', 'sent', 'received', 'errors'];
      const currentIdx = filters.indexOf(historyFilter);
      setHistoryFilter(filters[(currentIdx + 1) % filters.length]);
      setSelectedMessageIndex(0);
    }

    // Navigate history with j/k
    if (key.name === 'j') {
      setSelectedMessageIndex(prev => Math.min(filteredHistory.length - 1, prev + 1));
    }
    if (key.name === 'k') {
      setSelectedMessageIndex(prev => Math.max(0, prev - 1));
    }

    // Expand/collapse selected message
    if (key.name === 'e') {
      const selectedMsg = filteredHistory[selectedMessageIndex];
      if (selectedMsg) {
        setExpandedMessageId(prev => prev === selectedMsg.id ? null : selectedMsg.id);
      }
    }
  });

  const formatTime = (iso: string) => {
    const date = new Date(iso);
    return date.toLocaleTimeString();
  };

  return (
    <box style={{ flexDirection: 'column', padding: 1, flexGrow: 1 }}>
      <box style={{ height: 1, marginBottom: 1 }}>
        <text fg={colors.accentBlue}>{'>'} </text>
        <text fg={colors.textPrimary}>
          <b>Message Testing</b>
        </text>
        {!isRealClient && (
          <text fg={colors.accentYellow}> (Demo Mode - messages not sent)</text>
        )}
      </box>
      {/* Mode Toggle */}
      <box style={{ flexDirection: 'row', marginBottom: 1 }}>
        <text fg={colors.textSecondary}>[TAB] Mode: </text>
        <text fg={mode === 'pubsub' ? colors.accentGreen : colors.textSecondary}>
          <b>Pubsub</b>
        </text>
        <text fg={colors.textSecondary}> | </text>
        <text fg={mode === 'p2p' ? colors.accentGreen : colors.textSecondary}>
          <b>P2P</b>
        </text>
      </box>
      <box style={{ flexDirection: 'row', flexGrow: 1 }}>
        {/* Left Panel - Controls */}
        <box style={{ width: '50%', flexDirection: 'column' }}>
          {/* P2P Peer Selection */}
          {mode === 'p2p' && (
            <PanelContainer title="Select Peer [↑↓]" colors={colors} height={8}>
              {connectedPeers.length === 0 ? (
                <text fg={colors.textSecondary}>No connected peers</text>
              ) : (
                <box style={{ flexDirection: 'column' }}>
                  {connectedPeers.map((peer, idx) => (
                    <box key={peer.id} style={{ flexDirection: 'row' }}>
                      <text fg={idx === selectedPeerIndex ? colors.accentGreen : colors.textSecondary}>
                        {idx === selectedPeerIndex ? '> ' : '  '}
                      </text>
                      <text fg={idx === selectedPeerIndex ? colors.textPrimary : colors.textSecondary}>
                        {peer.id.slice(0, 20)}...
                      </text>
                    </box>
                  ))}
                </box>
              )}
            </PanelContainer>
          )}

          {/* Topic Input */}
          <PanelContainer
            title="Topic [t to edit]"
            colors={colors}
            height={4}
          >
            <box
              style={{
                border: focusedInput === 'topic',
                borderColor: focusedInput === 'topic' ? colors.accentGreen : colors.border,
                padding: focusedInput === 'topic' ? 0 : 0,
              }}
            >
              {focusedInput === 'topic' ? (
                <input
                  placeholder="Enter topic..."
                  value={topic}
                  onInput={(value: string) => setTopic(value)}
                  focused={focusedInput === 'topic'}
                />
              ) : (
                <text fg={colors.textPrimary}>{topic}</text>
              )}
            </box>
            {focusedInput === 'topic' && (
              <box style={{ marginTop: 1 }}>
                <text fg={colors.textSecondary}>[ESC] Done</text>
              </box>
            )}
          </PanelContainer>

          {/* Payload Input */}
          <PanelContainer
            title="Payload (JSON) [p to edit]"
            colors={colors}
            height={8}
          >
            <box
              style={{
                border: focusedInput === 'payload',
                borderColor: focusedInput === 'payload' ? colors.accentGreen : colors.border,
                flexGrow: 1,
              }}
            >
              {focusedInput === 'payload' ? (
                <textarea
                  initialValue={payload}
                  placeholder="Enter JSON payload..."
                  focused={focusedInput === 'payload'}
                />
              ) : (
                <text fg={colors.textPrimary}>{payload}</text>
              )}
            </box>
            {focusedInput === 'payload' && (
              <text fg={colors.textSecondary}>[ESC] Done | [Ctrl+Z] Undo</text>
            )}
          </PanelContainer>

          {/* Send Button */}
          <box style={{ marginTop: 1 }}>
            {isSending ? (
              <LoadingSpinner colors={colors} message={mode === 'p2p' ? 'Sending...' : 'Publishing...'} />
            ) : (
              <box style={{ flexDirection: 'row' }}>
                <text fg={colors.accentGreen}>
                  <b>[Enter] Send Message</b>
                </text>
                {focusedInput !== 'none' && (
                  <text fg={colors.textSecondary}> (exit edit mode first)</text>
                )}
              </box>
            )}
          </box>

          {/* Common Topics */}
          <PanelContainer title="Common Topics" colors={colors} height={7}>
            <box style={{ flexDirection: 'column' }}>
              <text fg={colors.textSecondary}>/cinderlink/1.0.0</text>
              <text fg={colors.textSecondary}>/identity/resolve/request</text>
              <text fg={colors.textSecondary}>/peer/announce</text>
              <text fg={colors.textSecondary}>/social/post/publish</text>
            </box>
          </PanelContainer>
        </box>
        {/* Right Panel - History */}
        <box style={{ width: '50%', marginLeft: 1, flexDirection: 'column' }}>
          {/* Stats Row */}
          <box style={{ height: 2, marginBottom: 1 }}>
            <box style={{ flexDirection: 'row' }}>
              <text fg={colors.textSecondary}>Messages: </text>
              <text fg={colors.accentGreen}>{stats.sent} sent</text>
              <text fg={colors.textSecondary}> | </text>
              <text fg={colors.accentBlue}>{stats.received} recv</text>
              <text fg={colors.textSecondary}> | </text>
              <text fg={stats.errors > 0 ? colors.accentRed : colors.textSecondary}>
                {stats.errors} errors
              </text>
            </box>
          </box>
          {/* Filter Row */}
          <box style={{ height: 2, marginBottom: 1 }}>
            <text fg={colors.textSecondary}>[f] Filter: </text>
            <text fg={historyFilter === 'all' ? colors.accentGreen : colors.textSecondary}>ALL</text>
            <text fg={colors.textSecondary}> | </text>
            <text fg={historyFilter === 'sent' ? colors.accentGreen : colors.textSecondary}>SENT</text>
            <text fg={colors.textSecondary}> | </text>
            <text fg={historyFilter === 'received' ? colors.accentGreen : colors.textSecondary}>RECV</text>
            <text fg={colors.textSecondary}> | </text>
            <text fg={historyFilter === 'errors' ? colors.accentGreen : colors.textSecondary}>ERR</text>
          </box>
          <PanelContainer
            title={`History (${filteredHistory.length})`}
            colors={colors}
            actions={
              <box style={{ flexDirection: 'row' }}>
                <text fg={colors.textSecondary}>[j/k] Navigate [e] Expand </text>
                <text fg={colors.accentRed}>[c] Clear</text>
              </box>
            }
          >
            <scrollbox style={{ flexGrow: 1, flexDirection: 'column' }}>
              {filteredHistory.length === 0 ? (
                <text fg={colors.textSecondary}>
                  {history.length === 0 ? 'No messages yet' : 'No messages match filter'}
                </text>
              ) : (
                <box style={{ flexDirection: 'column' }}>
                  {filteredHistory.map((msg, idx) => (
                    <MessageItem
                      key={msg.id}
                      message={msg}
                      colors={colors}
                      isSelected={idx === selectedMessageIndex}
                      isExpanded={msg.id === expandedMessageId}
                      formatTime={formatTime}
                    />
                  ))}
                </box>
              )}
            </scrollbox>
          </PanelContainer>
        </box>
      </box>
    </box>
  );
}

interface MessageItemProps {
  message: MessageHistoryEntry;
  colors: typeof import('../theme/colors').colors.dark;
  isSelected: boolean;
  isExpanded: boolean;
  formatTime: (iso: string) => string;
}

function MessageItem({ message: msg, colors, isSelected, isExpanded, formatTime }: MessageItemProps) {
  const statusColor = msg.status === 'success'
    ? colors.accentGreen
    : msg.status === 'error'
      ? colors.accentRed
      : colors.accentYellow;

  const directionIcon = msg.direction === 'sent' ? '↑' : '↓';
  const directionColor = msg.direction === 'sent' ? colors.accentGreen : colors.accentBlue;

  return (
    <box
      style={{
        marginBottom: 1,
        border: isSelected,
        borderColor: isSelected ? colors.accentBlue : colors.border,
        padding: isSelected ? 1 : 0,
      }}
    >
      <box style={{ flexDirection: 'row' }}>
        {isSelected && <text fg={colors.accentBlue}>{'> '}</text>}
        <text fg={directionColor}>{directionIcon} </text>
        <text fg={colors.textSecondary}>[{formatTime(msg.timestamp)}] </text>
        <text fg={statusColor}>
          {msg.status === 'success' ? 'OK' : msg.status === 'error' ? 'ERR' : '...'}
        </text>
        <text fg={colors.textSecondary}> </text>
        <text fg={colors.accentBlue}>{msg.type.toUpperCase()}</text>
      </box>
      <box style={{ marginLeft: isSelected ? 0 : 2 }}>
        <text fg={colors.textSecondary}>{msg.topic}</text>
      </box>
      {msg.peerId && (
        <box style={{ marginLeft: isSelected ? 0 : 2 }}>
          <text fg={colors.textSecondary}>To: {msg.peerId.slice(0, 20)}...</text>
        </box>
      )}
      {msg.error && (
        <box style={{ marginLeft: isSelected ? 0 : 2 }}>
          <text fg={colors.accentRed}>Error: {msg.error}</text>
        </box>
      )}
      {isExpanded && (
        <box style={{ marginLeft: isSelected ? 0 : 2, marginTop: 1 }}>
          <text fg={colors.textSecondary}>Payload:</text>
          <box style={{ border: true, borderColor: colors.border, padding: 1 }}>
            <text fg={colors.textPrimary}>{msg.payload}</text>
          </box>
        </box>
      )}
    </box>
  );
}
