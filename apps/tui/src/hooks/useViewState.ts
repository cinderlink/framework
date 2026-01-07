import { useReducer, useCallback } from 'react';

export type View = 'dashboard' | 'peers' | 'logs' | 'database' | 'settings' | 'messaging';

interface ViewState {
  currentView: View;
  showHelp: boolean;
  showQuitDialog: boolean;
}

export type ViewAction =
  | { type: 'SET_VIEW'; payload: View }
  | { type: 'NEXT_VIEW' }
  | { type: 'PREVIOUS_VIEW' }
  | { type: 'TOGGLE_HELP' }
  | { type: 'SHOW_QUIT_DIALOG' }
  | { type: 'HIDE_QUIT_DIALOG' };

const viewOrder: View[] = ['dashboard', 'peers', 'logs', 'database', 'settings', 'messaging'];

function getNextView(current: View): View {
  const currentIndex = viewOrder.indexOf(current);
  return viewOrder[(currentIndex + 1) % viewOrder.length];
}

function getPreviousView(current: View): View {
  const currentIndex = viewOrder.indexOf(current);
  return viewOrder[(currentIndex - 1 + viewOrder.length) % viewOrder.length];
}

const initialState: ViewState = {
  currentView: 'dashboard',
  showHelp: false,
  showQuitDialog: false,
};

function reducer(state: ViewState, action: ViewAction): ViewState {
  switch (action.type) {
    case 'SET_VIEW':
      return { ...state, currentView: action.payload };
    
    case 'NEXT_VIEW':
      return { ...state, currentView: getNextView(state.currentView) };
    
    case 'PREVIOUS_VIEW':
      return { ...state, currentView: getPreviousView(state.currentView) };
    
    case 'TOGGLE_HELP':
      return { ...state, showHelp: !state.showHelp };
    
    case 'SHOW_QUIT_DIALOG':
      return { ...state, showQuitDialog: true };
    
    case 'HIDE_QUIT_DIALOG':
      return { ...state, showQuitDialog: false };
    
    default:
      return state;
  }
}

export function useViewState(): [ViewState, (action: ViewAction) => void] {
  const [state, dispatch] = useReducer(reducer, initialState);
  
  const dispatchAction = useCallback((action: ViewAction) => {
    dispatch(action);
  }, []);
  
  return [state, dispatchAction];
}