/**
 * Focus Zone Management Hook
 *
 * Provides focus zone navigation for keyboard-driven UI.
 * Allows Tab/Shift+Tab navigation between major UI sections.
 */

import { useState, useCallback, useMemo, createContext, useContext } from 'react';

export type FocusZone = string;

export interface FocusZoneConfig {
  id: string;
  label: string;
  order: number;
}

export interface FocusZoneState {
  currentZone: FocusZone | null;
  zones: FocusZoneConfig[];
}

export interface FocusZoneActions {
  /** Move focus to the next zone */
  focusNext: () => void;
  /** Move focus to the previous zone */
  focusPrev: () => void;
  /** Set focus to a specific zone */
  setFocus: (zone: FocusZone | null) => void;
  /** Check if a zone is currently focused */
  isFocused: (zone: FocusZone) => boolean;
  /** Register a new zone */
  registerZone: (config: FocusZoneConfig) => void;
  /** Unregister a zone */
  unregisterZone: (id: string) => void;
}

export type FocusZoneContext = FocusZoneState & FocusZoneActions;

/**
 * Create a focus zone manager
 * @param initialZones - Array of focus zone configurations
 * @param initialZone - Optional initial zone ID (defaults to 'main' if available, otherwise first zone)
 */
export function useFocusZone(
  initialZones: FocusZoneConfig[] = [],
  initialZone?: FocusZone
): FocusZoneContext {
  const [zones, setZones] = useState<FocusZoneConfig[]>(initialZones);

  // Determine initial focus: use provided initialZone, or 'main' if it exists, or first zone
  const getInitialZone = (): FocusZone | null => {
    if (initialZones.length === 0) return null;
    if (initialZone && initialZones.some(z => z.id === initialZone)) return initialZone;
    // Default to 'main' if available, since it's the primary interaction area
    const mainZone = initialZones.find(z => z.id === 'main');
    if (mainZone) return mainZone.id;
    return initialZones[0].id;
  };

  const [currentZone, setCurrentZone] = useState<FocusZone | null>(getInitialZone());

  const sortedZones = useMemo(
    () => [...zones].sort((a, b) => a.order - b.order),
    [zones]
  );

  const focusNext = useCallback(() => {
    if (sortedZones.length === 0) return;

    setCurrentZone((current) => {
      if (!current) return sortedZones[0].id;

      const currentIndex = sortedZones.findIndex((z) => z.id === current);
      const nextIndex = (currentIndex + 1) % sortedZones.length;
      return sortedZones[nextIndex].id;
    });
  }, [sortedZones]);

  const focusPrev = useCallback(() => {
    if (sortedZones.length === 0) return;

    setCurrentZone((current) => {
      if (!current) return sortedZones[sortedZones.length - 1].id;

      const currentIndex = sortedZones.findIndex((z) => z.id === current);
      const prevIndex = currentIndex === 0 ? sortedZones.length - 1 : currentIndex - 1;
      return sortedZones[prevIndex].id;
    });
  }, [sortedZones]);

  const setFocus = useCallback((zone: FocusZone | null) => {
    setCurrentZone(zone);
  }, []);

  const isFocused = useCallback(
    (zone: FocusZone) => currentZone === zone,
    [currentZone]
  );

  const registerZone = useCallback((config: FocusZoneConfig) => {
    setZones((prev) => {
      if (prev.some((z) => z.id === config.id)) return prev;
      return [...prev, config];
    });
  }, []);

  const unregisterZone = useCallback((id: string) => {
    setZones((prev) => prev.filter((z) => z.id !== id));
    setCurrentZone((current) => (current === id ? null : current));
  }, []);

  return {
    currentZone,
    zones: sortedZones,
    focusNext,
    focusPrev,
    setFocus,
    isFocused,
    registerZone,
    unregisterZone,
  };
}

/**
 * React Context for focus zone management
 */
export const FocusZoneContext = createContext<FocusZoneContext | null>(null);

/**
 * Hook to access focus zone context
 */
export function useFocusZoneContext(): FocusZoneContext {
  const context = useContext(FocusZoneContext);
  if (!context) {
    throw new Error('useFocusZoneContext must be used within FocusZoneProvider');
  }
  return context;
}

/**
 * Default focus zones for the Cinderlink TUI
 */
export const defaultFocusZones: FocusZoneConfig[] = [
  { id: 'header', label: 'Header', order: 0 },
  { id: 'tabs', label: 'Tab Navigation', order: 1 },
  { id: 'main', label: 'Main Content', order: 2 },
  { id: 'status', label: 'Status Bar', order: 3 },
];

/**
 * Focus indicator component styles
 */
export function getFocusStyles(isFocused: boolean, colors: { accentBlue: string; border: string }) {
  return {
    borderColor: isFocused ? colors.accentBlue : colors.border,
    // Additional visual cue could be added here
  };
}
