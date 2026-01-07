/**
 * Responsive Layout Hook
 *
 * Provides responsive layout utilities based on terminal dimensions.
 * Uses OpenTUI's native useTerminalDimensions for automatic updates.
 */

import { useMemo } from 'react';
import { useTerminalDimensions } from '@opentui/react';

export interface TerminalDimensions {
  width: number;
  height: number;
}

export interface LayoutBreakpoints {
  isCompact: boolean;      // < 80 columns
  isNarrow: boolean;       // < 100 columns
  isShort: boolean;        // < 30 rows
  isTall: boolean;         // > 50 rows
}

export interface ResponsiveLayout extends TerminalDimensions, LayoutBreakpoints {
  // Panel sizing helpers
  sidebarWidth: string | number;
  mainWidth: string | number;

  // Layout direction
  flexDirection: 'row' | 'column';

  // Optimal panel count for current width
  optimalPanelCount: number;
}

/**
 * Hook to get terminal dimensions with auto-update on resize
 * Uses OpenTUI's native useTerminalDimensions hook
 */
export function useTerminalSize(): TerminalDimensions {
  return useTerminalDimensions();
}

/**
 * Hook providing responsive layout utilities
 */
export function useResponsiveLayout(): ResponsiveLayout {
  const { width, height } = useTerminalSize();

  return useMemo(() => {
    const isCompact = width < 80;
    const isNarrow = width < 100;
    const isShort = height < 30;
    const isTall = height > 50;

    // Calculate sidebar width based on available space
    let sidebarWidth: string | number;
    if (isCompact) {
      sidebarWidth = '100%'; // Full width in compact mode
    } else if (isNarrow) {
      sidebarWidth = '35%';
    } else {
      sidebarWidth = '25%';
    }

    // Main content takes remaining space
    const mainWidth = isCompact ? '100%' : '1'; // flexGrow: 1

    // Use column layout in compact mode
    const flexDirection = isCompact ? 'column' : 'row';

    // Calculate optimal panel count
    let optimalPanelCount: number;
    if (width < 60) {
      optimalPanelCount = 1;
    } else if (width < 100) {
      optimalPanelCount = 2;
    } else if (width < 150) {
      optimalPanelCount = 3;
    } else {
      optimalPanelCount = 4;
    }

    return {
      width,
      height,
      isCompact,
      isNarrow,
      isShort,
      isTall,
      sidebarWidth,
      mainWidth,
      flexDirection,
      optimalPanelCount,
    };
  }, [width, height]);
}

/**
 * Calculate optimal height for a panel given available space
 */
export function calculatePanelHeight(
  availableHeight: number,
  panelCount: number,
  minHeight = 5
): number {
  const height = Math.floor(availableHeight / panelCount);
  return Math.max(height, minHeight);
}

/**
 * Calculate optimal width for side-by-side panels
 */
export function calculatePanelWidth(
  availableWidth: number,
  panelCount: number,
  gap = 1
): number {
  const totalGaps = (panelCount - 1) * gap;
  return Math.floor((availableWidth - totalGaps) / panelCount);
}
