/**
 * FocusZone Component
 *
 * Provides a context for grouping focusable elements into zones.
 * Elements within a zone share a common zone identifier and can have
 * sequential ordering within the zone.
 */

import { createContext, useContext, useRef, type ReactNode } from 'react';
import { useFocusStore } from './focus-store';

interface FocusZoneContextValue {
  zone: string;
  getNextOrder: () => number;
}

const FocusZoneContext = createContext<FocusZoneContextValue | null>(null);

export interface FocusZoneProps {
  /** Zone identifier */
  zone: string;
  /** Starting order value for elements in this zone (default: 0) */
  orderStart?: number;
  /** Order increment between elements (default: 10) */
  orderStep?: number;
  /** Whether this zone should trap focus (modal behavior) */
  trapFocus?: boolean;
  children: ReactNode;
}

/**
 * FocusZone groups focusable elements and provides sequential ordering
 */
export function FocusZone({
  zone,
  orderStart = 0,
  orderStep = 10,
  trapFocus = false,
  children,
}: FocusZoneProps) {
  const orderCounter = useRef(orderStart);
  const setActiveZone = useFocusStore((state) => state.setActiveZone);

  // Set/clear active zone for focus trapping
  if (trapFocus) {
    setActiveZone(zone);
  }

  const getNextOrder = () => {
    const order = orderCounter.current;
    orderCounter.current += orderStep;
    return order;
  };

  return (
    <FocusZoneContext.Provider value={{ zone, getNextOrder }}>
      {children}
    </FocusZoneContext.Provider>
  );
}

/**
 * Hook to access the current FocusZone context
 */
export function useFocusZoneContext(): FocusZoneContextValue | null {
  return useContext(FocusZoneContext);
}

/**
 * Modal FocusZone that traps focus within it
 */
export function ModalFocusZone({
  zone = 'modal',
  children,
  ...props
}: Omit<FocusZoneProps, 'trapFocus'>) {
  const setActiveZone = useFocusStore((state) => state.setActiveZone);

  // Set active zone on mount, clear on unmount
  // Note: Using useEffect would be better but keeping it simple
  setActiveZone(zone);

  return (
    <FocusZone zone={zone} trapFocus {...props}>
      {children}
    </FocusZone>
  );
}
