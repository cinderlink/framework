/**
 * TabBar Component
 *
 * A focusable tab navigation bar that integrates with the focus system.
 */

import { useFocusable } from '../input/use-focusable';
import { useFocusStore } from '../input/focus-store';

export interface Tab {
  id: string;
  label: string;
  shortcut?: string;
}

export interface TabBarProps {
  tabs: Tab[];
  activeTab: string;
  onTabChange: (tabId: string) => void;
  colors: {
    textPrimary: string;
    textSecondary: string;
    accentBlue: string;
    border: string;
  };
  zone?: string;
  orderStart?: number;
}

interface TabButtonProps {
  tab: Tab;
  isActive: boolean;
  onClick: () => void;
  colors: TabBarProps['colors'];
  zone: string;
  order: number;
}

function TabButton({ tab, isActive, onClick, colors, zone, order }: TabButtonProps) {
  const setFocused = useFocusStore((state) => state.setFocused);

  const { focused } = useFocusable({
    id: `tab-${tab.id}`,
    zone,
    order,
    onActivate: onClick,
  });

  const handleClick = () => {
    setFocused(`tab-${tab.id}`, 'mouse');
    onClick();
  };

  // Determine styling
  const textColor = isActive
    ? colors.accentBlue
    : focused
      ? colors.textPrimary
      : colors.textSecondary;

  const focusIndicator = focused ? '>' : ' ';
  const activeIndicator = isActive ? '*' : ' ';

  return (
    <box
      style={{
        flexDirection: 'row',
        paddingLeft: 1,
        paddingRight: 1,
        backgroundColor: focused ? '#1a1a2e' : undefined,
      }}
      onClick={handleClick}
    >
      <text fg={focused ? colors.accentBlue : 'transparent'}>{focusIndicator}</text>
      <text fg={textColor}>
        {tab.shortcut ? `[${tab.shortcut}] ` : ''}{tab.label}
      </text>
      <text fg={isActive ? colors.accentBlue : 'transparent'}>{activeIndicator}</text>
    </box>
  );
}

export function TabBar({
  tabs,
  activeTab,
  onTabChange,
  colors,
  zone = 'tabs',
  orderStart = 0,
}: TabBarProps) {
  return (
    <box style={{ flexDirection: 'row', alignItems: 'center', height: '100%' }}>
      {tabs.map((tab, index) => (
        <TabButton
          key={tab.id}
          tab={tab}
          isActive={activeTab === tab.id}
          onClick={() => onTabChange(tab.id)}
          colors={colors}
          zone={zone}
          order={orderStart + index * 10}
        />
      ))}
    </box>
  );
}
