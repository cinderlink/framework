/**
 * App Providers
 *
 * Wraps the application with all necessary context providers.
 */

import type { ReactNode } from 'react';
import { KeyboardProvider, InputModeProvider } from './context';
import { FocusStoreProvider } from './components/Focusable';

interface AppProvidersProps {
  children: ReactNode;
}

export function AppProviders({ children }: AppProvidersProps) {
  return (
    <KeyboardProvider>
      <InputModeProvider>
        <FocusStoreProvider>
          {children}
        </FocusStoreProvider>
      </InputModeProvider>
    </KeyboardProvider>
  );
}
