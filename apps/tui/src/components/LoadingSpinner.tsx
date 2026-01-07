/**
 * Loading Spinner Component
 *
 * A simple animated spinner for indicating loading states.
 */

import { useState, useEffect, useRef } from 'react';
import { useRenderer } from '@opentui/react';

interface LoadingSpinnerProps {
  colors: typeof import('../theme/colors').colors.dark;
  message?: string;
  size?: 'small' | 'medium' | 'large';
}

const SPINNER_FRAMES = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
const SPINNER_INTERVAL = 80; // ms

// Spinner variants for different use cases
const SPINNER_VARIANTS = {
  dots: ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'],
  line: ['|', '/', '-', '\\'],
  circle: ['◐', '◓', '◑', '◒'],
  bounce: ['⠁', '⠂', '⠄', '⠂'],
  pulse: ['○', '◔', '◑', '◕', '●', '◕', '◑', '◔'],
};

export function LoadingSpinner({ 
  colors, 
  message, 
  size = 'medium',
  variant = 'dots',
}: LoadingSpinnerProps & { variant?: keyof typeof SPINNER_VARIANTS }) {
  const [frameIndex, setFrameIndex] = useState(0);
  const renderer = useRenderer();
  const frameRef = useRef(0);
  
  const frames = SPINNER_VARIANTS[variant] || SPINNER_FRAMES;

  useEffect(() => {
    // Use renderer's animation frame when available, fallback to interval
    let cleanup: (() => void) | undefined;
    
    const animate = () => {
      frameRef.current = (frameRef.current + 1) % frames.length;
      setFrameIndex(frameRef.current);
    };

    // Use interval-based animation (OpenTUI handles efficient re-renders)
    const interval = setInterval(animate, SPINNER_INTERVAL);
    cleanup = () => clearInterval(interval);
    
    // Request initial render
    renderer?.requestRender?.();

    return () => cleanup?.();
  }, [frames.length, renderer]);

  const frame = frames[frameIndex];

  return (
    <box style={{ flexDirection: 'row', alignItems: 'center' }}>
      <text fg={colors.accentBlue}>{frame}</text>
      {message && (
        <box style={{ marginLeft: 1 }}>
          <text fg={colors.textSecondary}>{message}</text>
        </box>
      )}
    </box>
  );
}

/**
 * Loading Overlay Component
 *
 * A full-screen loading overlay for major operations.
 */
interface LoadingOverlayProps {
  colors: typeof import('../theme/colors').colors.dark;
  visible: boolean;
  message?: string;
}

export function LoadingOverlay({ colors, visible, message = 'Loading...' }: LoadingOverlayProps) {
  if (!visible) return null;

  return (
    <box
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        justifyContent: 'center',
        alignItems: 'center',
        flexDirection: 'column',
      }}
    >
      <box
        style={{
          border: true,
          borderColor: colors.accentBlue,
          padding: 2,
          flexDirection: 'column',
          alignItems: 'center',
        }}
      >
        <LoadingSpinner colors={colors} size="large" />
        <box style={{ marginTop: 1 }}>
          <text fg={colors.textPrimary}>{message}</text>
        </box>
      </box>
    </box>
  );
}

/**
 * Inline loading indicator
 */
interface InlineLoadingProps {
  colors: typeof import('../theme/colors').colors.dark;
  loading: boolean;
  children: React.ReactNode;
  loadingMessage?: string;
}

export function InlineLoading({ colors, loading, children, loadingMessage }: InlineLoadingProps) {
  if (loading) {
    return <LoadingSpinner colors={colors} message={loadingMessage} />;
  }

  return <box>{children}</box>;
}
