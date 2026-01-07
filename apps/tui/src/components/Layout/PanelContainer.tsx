import type { ReactNode } from 'react';

interface PanelContainerProps {
  title: string;
  children: ReactNode;
  colors: typeof import('../../theme/colors').colors.dark;
  actions?: ReactNode;
  height?: number;
}

export function PanelContainer({ title, children, colors, actions, height }: PanelContainerProps) {
  return (
    <box
      style={{
        flexDirection: 'column',
        border: true,
        borderColor: colors.border,
        backgroundColor: colors.panelBackground,
        padding: 1,
        height,
      }}
    >
      <box
        style={{
          height: 1,
          width: '100%',
          justifyContent: 'space-between',
        }}
      >
        <text fg={colors.textPrimary}><b>{title}</b></text>
        {actions && <box>{actions}</box>}
      </box>
      <box style={{ flexDirection: 'column', flexGrow: 1, marginTop: 1 }}>
        {children}
      </box>
    </box>
  );
}
