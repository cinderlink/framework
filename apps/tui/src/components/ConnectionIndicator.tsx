/**
 * Connection Indicator Component
 *
 * Animated indicators for showing connection status with visual feedback.
 */

import { useState, useEffect } from 'react';

interface ConnectionIndicatorProps {
  colors: typeof import('../theme/colors').colors.dark;
  connected: boolean;
  connecting?: boolean;
  label?: string;
}

// Pulsing dot frames for connected state
const PULSE_FRAMES = ['●', '◉', '○', '◉'];
const PULSE_INTERVAL = 500; // ms

// Connecting animation frames
const CONNECTING_FRAMES = ['◐', '◓', '◑', '◒'];
const CONNECTING_INTERVAL = 150; // ms

/**
 * Animated connection status indicator
 */
export function ConnectionIndicator({
  colors,
  connected,
  connecting = false,
  label,
}: ConnectionIndicatorProps) {
  const [frameIndex, setFrameIndex] = useState(0);

  useEffect(() => {
    if (connecting) {
      // Fast animation when connecting
      const interval = setInterval(() => {
        setFrameIndex(prev => (prev + 1) % CONNECTING_FRAMES.length);
      }, CONNECTING_INTERVAL);
      return () => clearInterval(interval);
    } else if (connected) {
      // Slow pulse when connected
      const interval = setInterval(() => {
        setFrameIndex(prev => (prev + 1) % PULSE_FRAMES.length);
      }, PULSE_INTERVAL);
      return () => clearInterval(interval);
    } else {
      // No animation when disconnected
      setFrameIndex(0);
    }
  }, [connected, connecting]);

  const getIndicator = () => {
    if (connecting) {
      return {
        symbol: CONNECTING_FRAMES[frameIndex],
        color: colors.accentYellow,
        text: label || 'Connecting',
      };
    }
    if (connected) {
      return {
        symbol: PULSE_FRAMES[frameIndex],
        color: colors.accentGreen,
        text: label || 'Online',
      };
    }
    return {
      symbol: '○',
      color: colors.accentRed,
      text: label || 'Offline',
    };
  };

  const indicator = getIndicator();

  return (
    <box style={{ flexDirection: 'row', alignItems: 'center' }}>
      <text fg={indicator.color}>{indicator.symbol}</text>
      {indicator.text && (
        <box style={{ marginLeft: 1 }}>
          <text fg={indicator.color}>{indicator.text}</text>
        </box>
      )}
    </box>
  );
}

/**
 * Compact connection dot (no label)
 */
export function ConnectionDot({
  colors,
  connected,
  connecting = false,
}: Omit<ConnectionIndicatorProps, 'label'>) {
  const [frameIndex, setFrameIndex] = useState(0);

  useEffect(() => {
    if (connecting) {
      const interval = setInterval(() => {
        setFrameIndex(prev => (prev + 1) % CONNECTING_FRAMES.length);
      }, CONNECTING_INTERVAL);
      return () => clearInterval(interval);
    } else if (connected) {
      const interval = setInterval(() => {
        setFrameIndex(prev => (prev + 1) % PULSE_FRAMES.length);
      }, PULSE_INTERVAL);
      return () => clearInterval(interval);
    } else {
      setFrameIndex(0);
    }
  }, [connected, connecting]);

  if (connecting) {
    return <text fg={colors.accentYellow}>{CONNECTING_FRAMES[frameIndex]}</text>;
  }
  if (connected) {
    return <text fg={colors.accentGreen}>{PULSE_FRAMES[frameIndex]}</text>;
  }
  return <text fg={colors.accentRed}>○</text>;
}

/**
 * Network activity indicator
 */
interface NetworkActivityProps {
  colors: typeof import('../theme/colors').colors.dark;
  sending?: boolean;
  receiving?: boolean;
}

const ACTIVITY_FRAMES = ['▁', '▂', '▃', '▄', '▅', '▆', '▇', '█', '▇', '▆', '▅', '▄', '▃', '▂'];
const ACTIVITY_INTERVAL = 80;

export function NetworkActivity({ colors, sending, receiving }: NetworkActivityProps) {
  const [frameIndex, setFrameIndex] = useState(0);
  const isActive = sending || receiving;

  useEffect(() => {
    if (isActive) {
      const interval = setInterval(() => {
        setFrameIndex(prev => (prev + 1) % ACTIVITY_FRAMES.length);
      }, ACTIVITY_INTERVAL);
      return () => clearInterval(interval);
    } else {
      setFrameIndex(0);
    }
  }, [isActive]);

  if (!isActive) {
    return <text fg={colors.textSecondary}>▁</text>;
  }

  const color = sending && receiving
    ? colors.accentBlue
    : sending
      ? colors.accentYellow
      : colors.accentGreen;

  return <text fg={color}>{ACTIVITY_FRAMES[frameIndex]}</text>;
}

/**
 * Peer connection status with count
 */
interface PeerCountIndicatorProps {
  colors: typeof import('../theme/colors').colors.dark;
  count: number;
  connected: boolean;
}

export function PeerCountIndicator({ colors, count, connected }: PeerCountIndicatorProps) {
  const [frameIndex, setFrameIndex] = useState(0);

  useEffect(() => {
    if (connected && count > 0) {
      const interval = setInterval(() => {
        setFrameIndex(prev => (prev + 1) % PULSE_FRAMES.length);
      }, PULSE_INTERVAL);
      return () => clearInterval(interval);
    }
  }, [connected, count]);

  const dotColor = connected && count > 0 ? colors.accentGreen : colors.textSecondary;

  return (
    <box style={{ flexDirection: 'row', alignItems: 'center' }}>
      <text fg={dotColor}>
        {connected && count > 0 ? PULSE_FRAMES[frameIndex] : '○'}
      </text>
      <box style={{ marginLeft: 1 }}>
        <text fg={count > 0 ? colors.textPrimary : colors.textSecondary}>
          {count} peer{count !== 1 ? 's' : ''}
        </text>
      </box>
    </box>
  );
}
