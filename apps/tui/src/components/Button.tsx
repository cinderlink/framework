/**
 * Button Component
 *
 * A focusable, clickable button for the TUI.
 * Supports keyboard navigation (Tab) and activation (Enter/Space).
 */

import { useMemo } from 'react';
import { useFocusable } from '../input/use-focusable';
import { useFocusStore } from '../input/focus-store';

export interface ButtonProps {
  /** Unique identifier for focus management */
  id: string;
  /** Button label text */
  label: string;
  /** Click handler */
  onClick?: () => void;
  /** Whether the button is disabled */
  disabled?: boolean;
  /** Focus zone (default: 'content') */
  zone?: string;
  /** Explicit focus order */
  order?: number;
  /** Button variant */
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  /** Color overrides */
  colors?: {
    fg?: string;
    bg?: string;
    focusFg?: string;
    focusBg?: string;
    disabledFg?: string;
  };
}

const defaultColors = {
  fg: '#ffffff',
  bg: undefined,
  focusFg: '#ffffff',
  focusBg: '#3b82f6',
  disabledFg: '#666666',
};

export function Button({
  id,
  label,
  onClick,
  disabled = false,
  zone = 'content',
  order,
  variant = 'secondary',
  colors: colorsProp,
}: ButtonProps) {
  const colors = { ...defaultColors, ...colorsProp };
  const setFocused = useFocusStore((state) => state.setFocused);

  const { focused } = useFocusable({
    id,
    zone,
    order,
    enabled: !disabled,
    onActivate: () => {
      if (!disabled && onClick) {
        onClick();
      }
    },
  });

  // Handle mouse click - set focus and trigger action
  const handleClick = useMemo(() => () => {
    if (disabled) return;
    setFocused(id, 'mouse');
    onClick?.();
  }, [id, disabled, onClick, setFocused]);

  // Determine colors based on state
  const fgColor = disabled
    ? colors.disabledFg
    : focused
      ? colors.focusFg
      : colors.fg;

  const bgColor = focused && !disabled ? colors.focusBg : colors.bg;

  // Variant-specific styling
  const variantColors = useMemo(() => {
    if (disabled) return { fg: colors.disabledFg, bg: undefined };

    switch (variant) {
      case 'primary':
        return {
          fg: focused ? '#ffffff' : '#3b82f6',
          bg: focused ? '#3b82f6' : undefined,
        };
      case 'danger':
        return {
          fg: focused ? '#ffffff' : '#ef4444',
          bg: focused ? '#ef4444' : undefined,
        };
      case 'ghost':
        return {
          fg: focused ? '#ffffff' : '#888888',
          bg: focused ? '#333333' : undefined,
        };
      case 'secondary':
      default:
        return {
          fg: fgColor,
          bg: bgColor,
        };
    }
  }, [variant, focused, disabled, fgColor, bgColor, colors.disabledFg]);

  // Focus indicator
  const focusIndicator = focused && !disabled ? '>' : ' ';

  return (
    <box
      style={{
        flexDirection: 'row',
        paddingLeft: 1,
        paddingRight: 2,
        marginRight: 1,
        backgroundColor: variantColors.bg,
      }}
      onClick={handleClick}
    >
      <text fg={focused ? '#3b82f6' : '#333333'}>{focusIndicator}</text>
      <text fg={variantColors.fg}>
        {disabled ? `[${label}]` : `[${label}]`}
      </text>
    </box>
  );
}

/**
 * Simple text button without box wrapper
 */
export function TextButton({
  id,
  label,
  onClick,
  disabled = false,
  zone = 'content',
  order,
  fg = '#3b82f6',
  focusFg = '#ffffff',
  disabledFg = '#666666',
}: {
  id: string;
  label: string;
  onClick?: () => void;
  disabled?: boolean;
  zone?: string;
  order?: number;
  fg?: string;
  focusFg?: string;
  disabledFg?: string;
}) {
  const setFocused = useFocusStore((state) => state.setFocused);

  const { focused } = useFocusable({
    id,
    zone,
    order,
    enabled: !disabled,
    onActivate: () => {
      if (!disabled && onClick) {
        onClick();
      }
    },
  });

  const handleClick = useMemo(() => () => {
    if (disabled) return;
    setFocused(id, 'mouse');
    onClick?.();
  }, [id, disabled, onClick, setFocused]);

  const textColor = disabled ? disabledFg : focused ? focusFg : fg;
  const indicator = focused && !disabled ? '>' : ' ';

  return (
    <box style={{ flexDirection: 'row' }} onClick={handleClick}>
      <text fg={focused ? '#3b82f6' : 'transparent'}>{indicator}</text>
      <text fg={textColor}>{label}</text>
    </box>
  );
}
