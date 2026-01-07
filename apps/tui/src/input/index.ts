/**
 * Input Module Exports
 *
 * Focus management and input handling for the TUI.
 */

export {
  useFocusStore,
  focusStore,
  type FocusNode,
  type FocusReason,
  type FocusState,
  type FocusStore,
} from './focus-store';

export {
  useFocusable,
  focusElement,
  type UseFocusableOptions,
  type UseFocusableReturn,
} from './use-focusable';

export {
  FocusZone,
  ModalFocusZone,
  useFocusZoneContext,
  type FocusZoneProps,
} from './FocusZone';
