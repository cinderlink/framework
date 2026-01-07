/**
 * Focus Store
 *
 * Zustand-based focus management for element-level focus tracking.
 * Supports Tab navigation, Enter/Space activation, and mouse click focusing.
 */

import { create } from 'zustand';

export type FocusReason = 'keyboard' | 'mouse' | 'programmatic';

export interface FocusNode {
  id: string;
  zone: string;
  order: number;
  isTextInput?: boolean;
  onActivate?: () => void;
  /** If false, this item is excluded from Tab navigation but can still receive mouse focus */
  tabNavigable?: boolean;
}

export interface FocusState {
  focusedId: string | null;
  reason: FocusReason;
  zones: Map<string, FocusNode[]>;
  items: FocusNode[];
  activeZone: string | null; // Zone that traps focus (e.g., for modals)
}

interface FocusActions {
  register: (node: FocusNode) => () => void;
  unregister: (id: string) => void;
  setFocused: (id: string | null, reason?: FocusReason) => void;
  focusById: (id: string) => boolean;
  clearFocus: () => void;
  focusNext: () => void;
  focusPrevious: () => void;
  activateFocused: () => void;
  setActiveZone: (zone: string | null) => void;
  reset: () => void;
  getFocusedNode: () => FocusNode | null;
}

export type FocusStore = FocusState & FocusActions;

const createInitialState = (): FocusState => ({
  focusedId: null,
  reason: 'programmatic',
  zones: new Map(),
  items: [],
  activeZone: null,
});

const rebuildItems = (zones: Map<string, FocusNode[]>): FocusNode[] => {
  const items: FocusNode[] = [];
  for (const list of zones.values()) {
    items.push(...list);
  }
  items.sort((a, b) => a.order - b.order || a.id.localeCompare(b.id));
  return items;
};

const focusOrder = (state: FocusState): FocusNode[] => {
  const merged: FocusNode[] = [];

  // If there's an active zone (e.g., modal), only include items from that zone
  if (state.activeZone) {
    const activeZoneItems = state.zones.get(state.activeZone);
    if (activeZoneItems) {
      merged.push(...activeZoneItems);
    }
  } else {
    // Otherwise, include all zones
    for (const list of state.zones.values()) {
      merged.push(...list);
    }
  }

  // Filter to only tabNavigable items (default is true if not specified)
  const tabNavigable = merged.filter((n) => n.tabNavigable !== false);
  tabNavigable.sort((a, b) => a.order - b.order || a.id.localeCompare(b.id));
  return tabNavigable;
};

export const useFocusStore = create<FocusStore>((set, get) => ({
  ...createInitialState(),

  register: (node: FocusNode) => {
    set((state) => {
      const zoneNodes = new Map(state.zones);
      const existing = zoneNodes.get(node.zone) ?? [];
      const filtered = existing.filter((n) => n.id !== node.id);
      filtered.push(node);
      filtered.sort((a, b) => a.order - b.order || a.id.localeCompare(b.id));
      zoneNodes.set(node.zone, filtered);

      return { zones: zoneNodes, items: rebuildItems(zoneNodes) };
    });

    // Return unregister function
    return () => {
      set((state) => {
        const zoneNodes = new Map(state.zones);
        const existing = zoneNodes.get(node.zone) ?? [];
        zoneNodes.set(node.zone, existing.filter((n) => n.id !== node.id));
        const focusedId = state.focusedId === node.id ? null : state.focusedId;

        return { focusedId, zones: zoneNodes, items: rebuildItems(zoneNodes) };
      });
    };
  },

  unregister: (id: string) => {
    set((state) => {
      const zoneNodes = new Map(state.zones);
      for (const [zone, nodes] of zoneNodes.entries()) {
        zoneNodes.set(zone, nodes.filter((n) => n.id !== id));
      }
      const focusedId = state.focusedId === id ? null : state.focusedId;

      return { focusedId, zones: zoneNodes, items: rebuildItems(zoneNodes) };
    });
  },

  setFocused: (id: string | null, reason: FocusReason = 'programmatic') => {
    set({ focusedId: id, reason });
  },

  focusById: (id: string): boolean => {
    const state = get();
    // Check if element exists in any zone
    for (const list of state.zones.values()) {
      if (list.some((n) => n.id === id)) {
        set({ focusedId: id, reason: 'programmatic' });
        return true;
      }
    }
    return false;
  },

  clearFocus: () => {
    set({ focusedId: null, reason: 'programmatic' });
  },

  focusNext: () => {
    const state = get();
    const order = focusOrder(state);
    if (!order.length) return;

    const index = state.focusedId ? order.findIndex((n) => n.id === state.focusedId) : -1;

    // Wrap around to beginning
    if (index >= order.length - 1) {
      const next = order[0];
      set({ focusedId: next.id, reason: 'keyboard' });
      return;
    }

    const nextIndex = index + 1;
    const next = order[nextIndex];
    set({ focusedId: next.id, reason: 'keyboard' });
  },

  focusPrevious: () => {
    const state = get();
    const order = focusOrder(state);
    if (!order.length) return;

    const index = state.focusedId ? order.findIndex((n) => n.id === state.focusedId) : 0;

    // Wrap around to end
    if (index <= 0) {
      const prev = order[order.length - 1];
      set({ focusedId: prev.id, reason: 'keyboard' });
      return;
    }

    const prevIndex = index - 1;
    const prev = order[prevIndex];
    set({ focusedId: prev.id, reason: 'keyboard' });
  },

  activateFocused: () => {
    const state = get();
    if (!state.focusedId) return;
    for (const list of state.zones.values()) {
      const node = list.find((n) => n.id === state.focusedId);
      if (node?.onActivate) {
        node.onActivate();
        break;
      }
    }
  },

  setActiveZone: (zone: string | null) => {
    set({ activeZone: zone });
  },

  reset: () => {
    set(createInitialState());
  },

  getFocusedNode: () => {
    const state = get();
    if (!state.focusedId) return null;
    for (const list of state.zones.values()) {
      const node = list.find((n) => n.id === state.focusedId);
      if (node) return node;
    }
    return null;
  },
}));

// Convenience function to get store state outside React
export const focusStore = {
  getState: () => useFocusStore.getState(),
  subscribe: useFocusStore.subscribe,
  focusNext: () => useFocusStore.getState().focusNext(),
  focusPrevious: () => useFocusStore.getState().focusPrevious(),
  activateFocused: () => useFocusStore.getState().activateFocused(),
  setFocused: (id: string | null, reason?: FocusReason) => useFocusStore.getState().setFocused(id, reason),
  clearFocus: () => useFocusStore.getState().clearFocus(),
  setActiveZone: (zone: string | null) => useFocusStore.getState().setActiveZone(zone),
};
