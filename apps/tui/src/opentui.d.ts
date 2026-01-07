/**
 * OpenTUI JSX Type Declarations
 *
 * Imports JSX namespace from @opentui/react to provide types for
 * custom JSX elements like <box>, <text>, <scrollbox>, etc.
 */

/// <reference types="@opentui/react/jsx-namespace" />

// Extend JSX namespace with additional elements used in this project
declare global {
  namespace JSX {
    interface IntrinsicElements {
      // Text modifiers (used within <text> elements)
      bold: React.PropsWithChildren<Record<string, unknown>>;
      italic: React.PropsWithChildren<Record<string, unknown>>;
      underline: React.PropsWithChildren<Record<string, unknown>>;

      // Code component for syntax highlighting
      code: {
        language?: string;
        content: string;
        theme?: string;
      };

      // Diff component for showing changes
      diff: {
        oldContent: string;
        newContent: string;
        mode?: 'unified' | 'split';
        showLineNumbers?: boolean;
      };

      // Select component for option menus
      select: {
        options: Array<{ name: string; description?: string; [key: string]: unknown }>;
        wrapSelection?: boolean;
        showScrollIndicator?: boolean;
        onChange?: (index: number, option: { name: string; description?: string }) => void;
        focused?: boolean;
      };

      // Scrollbox with scroll indicator support
      scrollbox: React.PropsWithChildren<{
        style?: Record<string, unknown>;
        showScrollIndicator?: boolean;
      }>;
    }
  }
}

export {};
