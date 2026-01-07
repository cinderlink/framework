# Cinderlink TUI Best Practices

This document captures best practices for developing the Cinderlink TUI with OpenTUI.

## Table of Contents

1. [Component Patterns](#component-patterns)
2. [Styling Guidelines](#styling-guidelines)
3. [Input Handling](#input-handling)
4. [State Management](#state-management)
5. [Performance](#performance)
6. [Testing](#testing)

---

## Component Patterns

### Use Native OpenTUI Elements

**Prefer native components over custom wrappers:**

```tsx
// GOOD - Native text modifiers
<text fg="green">
  <b>Bold text</b> and <i>italic</i>
</text>

// AVOID - Custom wrapper components
<Text color="green" bold>Bold text</Text>
```

### Component Composition

**Keep components small and focused:**

```tsx
// GOOD - Single responsibility
function PeerListItem({ peer }: { peer: Peer }) {
  return (
    <box flexDirection="row" padding={1}>
      <text fg={peer.connected ? 'green' : 'gray'}>
        {peer.id.slice(0, 8)}...
      </text>
    </box>
  )
}

// AVOID - Monolithic components
function PeerList({ peers, onSelect, onDelete, filter, sort, ... }) {
  // 200+ lines of mixed concerns
}
```

### Box Layout Patterns

**Use semantic container structure:**

```tsx
// Panel with header
<box border borderColor="blue" flexDirection="column">
  <box borderBottom padding={1}>
    <text><b>Panel Title</b></text>
  </box>
  <box flexGrow={1} padding={1}>
    {/* Content */}
  </box>
</box>
```

---

## Styling Guidelines

### Color Usage

**Use semantic color names from theme:**

```tsx
import { colors } from '../theme'

// GOOD - Semantic colors
<text fg={colors.success}>Connected</text>
<text fg={colors.error}>Failed</text>
<text fg={colors.warning}>Reconnecting</text>
<text fg={colors.muted}>Inactive</text>

// AVOID - Hardcoded hex values
<text fg="#00ff00">Connected</text>
```

### Responsive Layouts

**Use useTerminalDimensions for adaptive UI:**

```tsx
import { useTerminalDimensions } from '@opentui/react'

function Dashboard() {
  const { width, height } = useTerminalDimensions()
  const isCompact = width < 80

  return (
    <box flexDirection={isCompact ? 'column' : 'row'}>
      <Sidebar width={isCompact ? '100%' : '30%'} />
      <MainContent flexGrow={1} />
    </box>
  )
}
```

### Border Styles

**Use consistent border patterns:**

```tsx
// Primary panels - single border
<box border borderStyle="single" borderColor="blue">

// Selected/focused - double border
<box border borderStyle="double" borderColor="cyan">

// Subtle containers - round border
<box border borderStyle="round" borderColor="gray">

// Use title prop for labeled sections
<box border title="Peers" borderColor="blue">
```

---

## Input Handling

### Keyboard Navigation

**Implement focus zones:**

```tsx
function App() {
  const [focusZone, setFocusZone] = useState<'sidebar' | 'main' | 'status'>('main')

  useKeyboard((_, key) => {
    if (key?.name === 'tab') {
      setFocusZone(prev => {
        const zones = ['sidebar', 'main', 'status'] as const
        const idx = zones.indexOf(prev)
        return zones[(idx + 1) % zones.length]
      })
    }
  })

  return (
    <box>
      <Sidebar focused={focusZone === 'sidebar'} />
      <Main focused={focusZone === 'main'} />
      <StatusBar focused={focusZone === 'status'} />
    </box>
  )
}
```

### Input Components

**Use native input elements:**

```tsx
// Single-line input
<input
  placeholder="Enter peer address..."
  value={address}
  onChange={setAddress}
/>

// Multi-line text
<textarea
  value={message}
  onChange={setMessage}
/>

// Selection
<select
  options={themes}
  value={selectedTheme}
  onChange={setSelectedTheme}
/>
```

### Keyboard Shortcuts

**Document all shortcuts in status bar:**

```tsx
function StatusBar() {
  return (
    <box borderTop padding={1}>
      <text fg="gray">
        [1-6] Views  [Tab] Focus  [/] Search  [q] Quit
      </text>
    </box>
  )
}
```

### Focus Zone Management

**Use the FocusZone system for Tab navigation between UI sections:**

```tsx
import { useFocusZone, FocusZoneContext, defaultFocusZones, getFocusStyles } from './hooks/useFocusZone';

function App() {
  const focusZone = useFocusZone(defaultFocusZones);
  const colors = colorPalette[theme];

  // Get focus-dependent border colors
  const headerStyles = getFocusStyles(focusZone.isFocused('header'), colors);
  const mainStyles = getFocusStyles(focusZone.isFocused('main'), colors);

  useKeyboard((_, key) => {
    if (key?.name === 'tab') {
      key.shift ? focusZone.focusPrev() : focusZone.focusNext();
    }
  });

  return (
    <FocusZoneContext.Provider value={focusZone}>
      <box borderColor={headerStyles.borderColor}>
        <Header />
      </box>
      <box borderColor={mainStyles.borderColor}>
        <MainContent />
      </box>
    </FocusZoneContext.Provider>
  );
}
```

**Child components can access focus context:**

```tsx
function MainContent() {
  const { isFocused, currentZone } = useFocusZoneContext();

  // Only process keyboard shortcuts when this zone is focused
  useKeyboard((_, key) => {
    if (!isFocused('main')) return;

    // Handle zone-specific shortcuts
    if (key?.name === 'enter') {
      handleAction();
    }
  });

  return (
    <box>
      {isFocused('main') && <text fg="blue">[Active]</text>}
      {/* content */}
    </box>
  );
}
```

---

## State Management

### Local vs Global State

**Use React state for component-local data:**

```tsx
// Local UI state
const [isExpanded, setIsExpanded] = useState(false)
const [searchQuery, setSearchQuery] = useState('')
```

**Use context/store for shared state:**

```tsx
// Global app state (consider Zustand)
const useStore = create((set) => ({
  peers: [],
  addPeer: (peer) => set((s) => ({ peers: [...s.peers, peer] })),
  removePeer: (id) => set((s) => ({ peers: s.peers.filter(p => p.id !== id) })),
}))
```

### Async Data

**Handle loading and error states:**

```tsx
function PeerList() {
  const { peers, loading, error } = useCinderlinkClient()

  if (loading) {
    return <text fg="gray">Loading peers...</text>
  }

  if (error) {
    return <text fg="red">Error: {error.message}</text>
  }

  return (
    <scrollbox>
      {peers.map(peer => <PeerItem key={peer.id} peer={peer} />)}
    </scrollbox>
  )
}
```

---

## Performance

### Minimize Re-renders

**Memoize expensive computations:**

```tsx
const filteredLogs = useMemo(() => {
  return logs.filter(log => log.level >= minLevel)
}, [logs, minLevel])
```

**Memoize callbacks:**

```tsx
const handleKeyPress = useCallback((_, key) => {
  if (key?.name === 'enter') {
    submitMessage()
  }
}, [submitMessage])

useKeyboard(handleKeyPress)
```

### Scrolling Performance

**Use virtualization for long lists:**

```tsx
// Only render visible items in scrollbox
<scrollbox height={20}>
  {visibleItems.map(item => (
    <ListItem key={item.id} item={item} />
  ))}
</scrollbox>
```

### Avoid Layout Thrashing

**Batch state updates:**

```tsx
// GOOD - Single state update
setState({ peers: newPeers, loading: false, error: null })

// AVOID - Multiple updates
setPeers(newPeers)
setLoading(false)
setError(null)
```

---

## Testing

### Component Testing

**Test components in isolation:**

```tsx
// Use OpenTUI test renderer (when available)
import { render } from '@opentui/react/test'

test('PeerItem displays peer ID', () => {
  const peer = { id: 'abc123', connected: true }
  const { getByText } = render(<PeerItem peer={peer} />)
  expect(getByText('abc123')).toBeTruthy()
})
```

### Hook Testing

**Test custom hooks separately:**

```tsx
import { renderHook } from '@testing-library/react-hooks'

test('useLogs filters by level', () => {
  const { result } = renderHook(() => useLogs())

  act(() => {
    result.current.setMinLevel('warn')
  })

  expect(result.current.filteredLogs.every(l => l.level >= 'warn')).toBe(true)
})
```

---

## Learnings Log

*This section captures lessons learned during development.*

### 2025-01-05: OpenTUI API Discovery

- OpenTUI uses Zig for rendering performance (sub-ms frame times)
- Native components: `<text>`, `<box>`, `<scrollbox>`, `<input>`, `<textarea>`, `<select>`, `<tab-select>`, `<code>`, `<diff>`
- Text modifiers must be nested inside `<text>`: `<b>`, `<i>`, `<u>`, `<span>`
- Use `fg` for foreground color, `bg` for background (not `color`)
- Built-in console accessible via `useRenderer().console`
- `useTimeline()` available for animations
- `useTerminalDimensions()` for responsive layouts
- Syntax highlighting via tree-sitter in worker thread

### 2025-01-05: Component Refactoring

**Completed refactoring to native OpenTUI components:**

1. **Removed custom Text wrapper** - All views now use native `<text>` with `fg` prop and `<b>` modifiers
2. **Added input components:**
   - `<input>` for single-line text (topic, peer address, search)
   - `<textarea>` for multi-line text (JSON payload editing)
   - `<select>` for dropdowns (theme, log level, timestamp format)
   - `<tab-select>` for view navigation tabs
3. **Focus management pattern:**
   - Use state to track focused input: `useState<'none' | 'topic' | 'payload'>('none')`
   - ESC key exits focus mode
   - Conditionally render input vs display based on focus state

**Example pattern for focusable input:**
```tsx
const [focusedInput, setFocusedInput] = useState<'none' | 'topic'>('none');

// In keyboard handler
if (key.name === 'escape') setFocusedInput('none');
if (key.name === 't' && focusedInput === 'none') setFocusedInput('topic');

// In render
{focusedInput === 'topic' ? (
  <input value={topic} onChange={setTopic} />
) : (
  <text>{topic}</text>
)}
```

### 2026-01-05: Focus Zone System Implementation

**Created a reusable focus zone management system for keyboard navigation:**

1. **useFocusZone hook** (`src/hooks/useFocusZone.ts`):
   - Manages active focus zone state
   - `focusNext()`/`focusPrev()` for Tab/Shift+Tab cycling
   - Zone registration/unregistration for dynamic zones
   - React Context provider for child component access

2. **Default zones**: header, tabs, main, status (ordered by visual position)

3. **Visual indicators**:
   - Border color changes based on focus state
   - Optional zone label display in focused sections
   - Status bar shows current zone

4. **Keyboard handling integration**:
   - Tab/Shift+Tab cycles through zones at App level
   - View shortcuts only active when appropriate zone is focused
   - Zone-specific shortcuts in child components

**Key implementation pattern:**
```tsx
// Parent: Provide context and handle Tab navigation
const focusZone = useFocusZone(defaultFocusZones);
useKeyboard((_, key) => {
  if (key?.name === 'tab') {
    key.shift ? focusZone.focusPrev() : focusZone.focusNext();
  }
});

// Visual feedback
const styles = getFocusStyles(focusZone.isFocused('main'), colors);
<box borderColor={styles.borderColor}>...</box>
```

### Connection Indicators

**Use animated connection indicators for visual feedback:**

```tsx
import { ConnectionIndicator, ConnectionDot, PeerCountIndicator, NetworkActivity } from './components/ConnectionIndicator';

// Full indicator with label
<ConnectionIndicator
  colors={colors}
  connected={isConnected}
  connecting={isConnecting}
  label="Server"  // Optional custom label
/>

// Compact dot (no label)
<ConnectionDot colors={colors} connected={peer.connected} />

// Peer count with animated dot
<PeerCountIndicator
  colors={colors}
  count={peerCount}
  connected={isConnected}
/>

// Network activity indicator (shows sending/receiving)
<NetworkActivity
  colors={colors}
  sending={loading.sendingMessage}
  receiving={false}
/>
```

**Animation patterns:**
- Connected: Slow pulsing dot (●→◉→○→◉)
- Connecting: Fast spinner (◐→◓→◑→◒)
- Disconnected: Static empty dot (○)
- Network activity: Vertical bar animation (▁→▂→▃→▄→▅→▆→▇→█)

### Toast Notifications

**Use the toast system for user feedback:**

```tsx
import { useToast, createToastHelpers } from './hooks/useToast';

function App() {
  const { toasts, addToast, removeToast } = useToast();
  const toast = createToastHelpers(addToast);

  const handleSave = () => {
    saveData();
    toast.success('Data saved successfully');
  };

  const handleError = (error: Error) => {
    toast.error(`Failed: ${error.message}`);
  };

  return (
    <>
      {/* ... app content ... */}
      <ToastContainer
        colors={colors}
        toasts={toasts}
        onDismiss={removeToast}
      />
    </>
  );
}
```

**Toast types:** `info`, `success`, `warning`, `error`

**Custom duration:**
```tsx
toast.info('Processing...', 5000); // 5 seconds
addToast('Persistent message', { type: 'warning', duration: 0 }); // Won't auto-dismiss
```

### OpenTUI Component Limitations

1. **`<tab-select>` is uncontrolled** - It doesn't support a `value` prop for controlled selection. Use keyboard shortcuts (1-6) for programmatic view switching in addition to click handling via `onChange`.

2. **Border direction props** - `borderTop`, `borderBottom`, `borderLeft`, `borderRight` are not supported. Use `border: true` with `borderColor` for full borders only.

### Command Palette

**Implement a searchable command palette for quick actions:**

```tsx
import { CommandPalette, createDefaultCommands } from './components/CommandPalette';

function App() {
  const [showCommandPalette, setShowCommandPalette] = useState(false);

  // Create commands
  const commands = useMemo(() => createDefaultCommands(
    dispatch,
    {
      toggleHelp: () => setShowHelp(prev => !prev),
      clearLogs: handleClearLogs,
      exportLogs: handleExportLogs,
    }
  ), [dispatch, handleClearLogs, handleExportLogs]);

  useKeyboard((_, key) => {
    // Toggle with Ctrl+P
    if (key?.ctrl && key?.name === 'p') {
      setShowCommandPalette(prev => !prev);
    }
  });

  return (
    <>
      {/* ... */}
      <CommandPalette
        colors={colors}
        visible={showCommandPalette}
        onClose={() => setShowCommandPalette(false)}
        commands={commands}
      />
    </>
  );
}
```

**Command categories:** `navigation`, `action`, `setting`

**Custom commands:**
```tsx
const customCommands: Command[] = [
  {
    id: 'custom-action',
    label: 'My Custom Action',
    description: 'Does something useful',
    shortcut: 'x',
    category: 'action',
    action: () => doSomething(),
  },
];
```

### Common Mistakes to Avoid

1. Using `color` prop instead of `fg`
2. Not nesting text modifiers inside `<text>`
3. Hardcoding dimensions instead of using responsive hooks
4. **Using `style` prop on `<text>` elements** - `<text>` only supports `fg` and `bg` props. For spacing/layout, wrap in a `<box>`:
   ```tsx
   // WRONG - text doesn't support style prop
   <text fg={colors.textSecondary} style={{ marginLeft: 1 }}>Hello</text>

   // CORRECT - use box for layout
   <box style={{ marginLeft: 1 }}>
     <text fg={colors.textSecondary}>Hello</text>
   </box>
   ```
5. **Nesting `<text>` inside `<text>`** - Only text modifiers (`<b>`, `<i>`, `<u>`, `<span>`) can be nested inside `<text>`:
   ```tsx
   // WRONG - nested text elements
   <text fg={colors.textSecondary}>
     Uptime: <text fg={colors.accentGreen}>{uptime}</text>
   </text>

   // CORRECT - use separate text elements in a row box
   <box style={{ flexDirection: 'row' }}>
     <text fg={colors.textSecondary}>Uptime: </text>
     <text fg={colors.accentGreen}>{uptime}</text>
   </box>
   ```
6. Creating custom wrappers when native components exist
7. Forgetting to handle keyboard focus zones
8. Not providing ESC key to exit input focus mode
9. Processing keyboard shortcuts while in input mode (always check focus state first)
10. Not wrapping App with FocusZoneContext.Provider when using focus zones
11. Forgetting to conditionally handle shortcuts based on active focus zone
12. Trying to use `value` prop on `<tab-select>` (it's uncontrolled)
13. Using inline text spaces for separators (e.g., `" | "`) between box elements - use the Separator component instead

### Separator Component

**Use the Separator component for consistent spacing between inline elements:**

```tsx
import { Separator, Spacer } from '../components/Separator';

// Vertical separator with box-drawing character
<box style={{ flexDirection: 'row', alignItems: 'center' }}>
  <text>Item 1</text>
  <Separator color={colors.textSecondary} />
  <text>Item 2</text>
  <Separator color={colors.textSecondary} />
  <text>Item 3</text>
</box>

// Simple horizontal spacer
<box style={{ flexDirection: 'row' }}>
  <text>Left</text>
  <Spacer width={2} />
  <text>Right</text>
</box>
```

**Why use Separator instead of inline text spaces:**
- Inline spaces in `<text>` don't render predictably next to `<box>` elements
- Box-based margins provide consistent spacing in flex layouts
- Uses proper box-drawing character `│` instead of pipe `|` for cleaner appearance

### Mouse Support

**Current Status:** Mouse support is not currently implemented in the TUI.

OpenTUI may support mouse events through component-level handlers, but the current implementation relies entirely on keyboard navigation:
- Tab/Shift+Tab cycles focus zones
- Number keys 1-6 switch views (works globally)
- Arrow keys navigate within views
- Shortcut keys for common actions

If mouse support is added in the future, consider:
1. Click handlers on interactive elements (`onPress`, `onClick`)
2. Mouse-over highlighting for selectable items
3. Scrollbox mouse wheel support
4. Click-to-focus for input fields

### 2026-01-06: Polish Pass Improvements

1. **Number key navigation now global** - View switching (1-6) works regardless of focus zone
2. **Initial focus zone set to 'main'** - More intuitive starting point for keyboard navigation
3. **Separator component added** - Consistent spacing in flex row layouts
4. **Header layouts improved** - Using box-based margins instead of inline text spaces

### 2026-01-06: OpenTUI API Alignment

Comprehensive audit against official OpenTUI documentation revealed several API corrections:

#### Input Component
```tsx
// CORRECT - use onInput (not onChange) for value updates
<input
  placeholder="Type here..."
  value={value}
  onInput={setValue}
  onSubmit={() => handleSubmit()}  // Called when Enter pressed
  focused={isFocused}  // Automatic focus management
/>

// WRONG - onChange is not the correct prop
<input value={value} onChange={setValue} />
```

#### Select Component
```tsx
// CORRECT - options use { name, description, value } format
const options = [
  { name: 'Option 1', description: 'Description', value: 'opt1' },
  { name: 'Option 2', description: 'Description', value: 'opt2' },
];

<select
  options={options}
  onChange={(index, option) => handleChange(option?.value)}
  focused={isFocused}
  showScrollIndicator  // Shows scroll arrows
/>
```

#### Textarea Component
```tsx
// Uses ref pattern for accessing content
const textareaRef = useRef<TextareaRenderable>(null);

<textarea
  ref={textareaRef}
  initialValue="Initial text"
  placeholder="Type here..."
  focused={isFocused}
/>

// Access content via ref
const content = textareaRef.current?.plainText;
```

#### Available Hooks
```tsx
import {
  useRenderer,           // Access renderer instance
  useKeyboard,           // Keyboard event handler
  useOnResize,           // Terminal resize callback
  useTerminalDimensions, // { width, height } with auto-update
  useTimeline,           // Animation system (for tweening)
} from '@opentui/react';
```

#### useTimeline vs setInterval
- **useTimeline**: Best for smooth value transitions (progress bars, size animations)
- **setInterval**: Best for frame-based animations (character cycling, spinners)

```tsx
// useTimeline for smooth transitions
const timeline = useTimeline({ duration: 2000, loop: false });
timeline.add(
  { width: 0 },
  { width: 100, ease: 'linear', onUpdate: (a) => setWidth(a.targets[0].width) }
);

// setInterval for character animations (our connection indicators)
useEffect(() => {
  const interval = setInterval(() => {
    setFrame(prev => (prev + 1) % FRAMES.length);
  }, 150);
  return () => clearInterval(interval);
}, []);
```

#### Box gap Prop
```tsx
// Use gap for consistent child spacing
<box style={{ flexDirection: 'column', gap: 1 }}>
  <text>Item 1</text>
  <text>Item 2</text>
  <text>Item 3</text>
</box>

// Equivalent to marginBottom on each child
```

#### Text Modifiers (Correct List)
```tsx
<text>
  <span fg="red">Colored span</span>
  <strong>Bold (same as b)</strong>
  <em>Italic (same as i)</em>
  <b>Bold</b>
  <i>Italic</i>
  <u>Underlined</u>
  <br />  {/* Line break */}
</text>
```

#### Sources
- [GitHub: sst/opentui](https://github.com/sst/opentui)
- [npm: @opentui/react](https://www.npmjs.com/package/@opentui/react)
- [DeepWiki: React Integration](https://deepwiki.com/sst/opentui/5.1-example-framework)
