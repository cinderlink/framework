# Cinderlink TUI - Development Plan

## Current State Assessment

### What Exists
- Basic OpenTUI React app structure
- 5 views: Dashboard, Peers, Logs, Database, Settings
- Mock Cinderlink client hook
- Settings service with file persistence
- Theme system (colors only)
- Keyboard navigation (view switching)

### Issues Found

1. **TypeScript/OpenTUI Type Mismatch**
   - Code uses `color` and `bold` props on `<text>` which don't exist
   - Should use `fg` for color, `style` prop, or `content` attribute
   - JSX declarations using `any` bypasses type safety

2. **Missing Module**
   - `useTheme.ts` imports from non-existent `../theme/styles`

3. **Type Error**
   - `useCinderlinkClient.ts:129` passes array instead of updater function

4. **Vibes MCP Session**
   - Session tools require initialization via `session { action: "init" }`
   - This is expected behavior, not a bug

## Architecture Reference (from exemplar)

The exemplar vibes CLI/TUI uses:
- **CLI App Class** (`VibesCLIApp`) - Commander.js based plugin host
- **Plugin System** - Features register as plugins with commands
- **Studio Plugin** - TUI as a CLI subcommand
- **Page Registry** - Dynamic page registration with routing
- **Widget System** - Tool output visualization
- **Store System** - Zustand-like state management
- **Context System** - Runtime context propagation
- **Focus Management** - Keyboard navigation zones
- **Theme System** - Semantic colors (primary, secondary, etc.)
- **Custom Components** - Wrappers around OpenTUI primitives

## Recommended Architecture for Cinderlink TUI

```
@cinderlink/tui/
├── src/
│   ├── bin/
│   │   └── cli.ts              # CLI entry point
│   ├── cli/
│   │   ├── app.ts              # CLI app class
│   │   ├── plugin.ts           # Plugin base/registry
│   │   └── plugins/
│   │       ├── server.ts       # Server management commands
│   │       ├── network.ts      # P2P network commands
│   │       ├── db.ts           # Database commands
│   │       └── tui.ts          # TUI launcher plugin
│   ├── tui/
│   │   ├── index.tsx           # TUI entry/renderer
│   │   ├── app.tsx             # Main TUI component
│   │   ├── context/            # React contexts
│   │   ├── pages/              # Full-screen views
│   │   ├── components/         # Reusable UI components
│   │   ├── hooks/              # React hooks
│   │   ├── stores/             # State management
│   │   └── theme/              # Colors and styles
│   ├── services/               # Shared services
│   └── types/                  # Shared types
├── package.json
└── tsconfig.json
```

## Implementation Phases

### Phase 1: Foundation Cleanup (Current)
- [ ] Fix OpenTUI type declarations
- [ ] Update components to use correct OpenTUI API
- [ ] Fix TypeScript errors
- [ ] Remove unused imports/code
- [ ] Establish proper project structure

### Phase 2: CLI Framework
- [ ] Create CLI app class (inspired by exemplar)
- [ ] Implement plugin registry
- [ ] Add basic commands (version, help)
- [ ] Integrate TUI as CLI subcommand

### Phase 3: TUI Core
- [ ] Implement page router
- [ ] Create focus management system
- [ ] Build base component library
- [ ] Implement theme system with semantic colors
- [ ] Add keyboard shortcut manager

### Phase 4: Cinderlink Integration
- [ ] Real client connection (not mock)
- [ ] Server management UI
- [ ] Peer discovery/management
- [ ] Database browser
- [ ] Log streaming

### Phase 5: Advanced Features
- [ ] Chat interface (social plugin)
- [ ] Identity management
- [ ] Plugin configuration UI
- [ ] Export/import functionality

## OpenTUI API Reference

### Correct Text Usage
```tsx
// Wrong (current code)
<text color="green" bold>Hello</text>

// Correct options:
<text content="Hello" style={{ fg: 'green' }} />
<text fg="green">Hello</text>
<text style={{ fg: 'green' }}>Hello</text>
```

### Style vs Props
OpenTUI components accept either direct props or a `style` object:
- `fg` - foreground color
- `bg` - background color
- `border` - boolean for border
- `borderColor` - border color
- Layout props: `width`, `height`, `padding`, `margin`, `flexGrow`, etc.

## Binary Compilation

For deploying as a compiled binary:
```bash
bun build src/bin/cli.ts --compile --outfile=cinderlink
```

## Next Steps

1. Fix immediate TypeScript errors
2. Restructure to separate CLI from TUI
3. Copy/adapt useful patterns from exemplar
4. Build incrementally with real Cinderlink integration


## Session Summary (Completed)

### Issues Fixed

1. **TypeScript JSX Types**: Updated `src/opentui.d.ts` to use proper `/// <reference types="@opentui/react/jsx-namespace" />` instead of generic `any` types.

2. **OpenTUI API Usage**: Created `src/components/Text.tsx` wrapper component that translates common props (`color`, `bold`) to OpenTUI's API (`fg`, `<b>` wrappers).

3. **Missing Module**: Created `src/theme/styles.ts` with `getStyles()` function.

4. **Type Error in Hook**: Fixed `useCinderlinkClient.ts` - passing array to `updatePeerList` now uses arrow function.

5. **All Views Updated**: Updated all view components to use:
   - `<Text>` component for styled text
   - `style={{}}` prop pattern for box layouts
   - Proper OpenTUI API conventions

### Files Modified
- `src/opentui.d.ts` - Proper JSX types
- `src/components/Text.tsx` - NEW: Text wrapper component
- `src/components/Layout/PanelContainer.tsx` - Updated to use Text component
- `src/theme/styles.ts` - NEW: getStyles function
- `src/theme/index.ts` - Export styles
- `src/hooks/useCinderlinkClient.ts` - Fixed type error
- `src/App.tsx` - Updated to use Text component and style prop
- `src/views/DashboardView.tsx` - Updated
- `src/views/PeersView.tsx` - Updated
- `src/views/LogsView.tsx` - Updated
- `src/views/DatabaseView.tsx` - Updated
- `src/views/SettingsView.tsx` - Updated

### Vibes MCP Findings

1. **Working directory sandbox**: The vibes MCP tools (`fs-read`, `fs-list`, etc.) are sandboxed to the current working directory. Cannot access files outside (like the exemplar project). Use native Claude Code tools (Read, Glob) for external files.

2. **Session required**: Session tools (`session-todo`, `session-scratchpad`) require explicit session initialization via `session { action: "init" }`. This is expected behavior.

### What Works Now

```bash
# Build the TUI
bun run build

# Run in development
bun run dev

# Build compiled binary
bun run build:bin
```

### Next Steps for Development

1. **Test the TUI** - Run `bun run dev` to verify it renders (Note: run in a separate terminal)

2. **Add CLI structure** - Create `src/bin/cli.ts` with Commander.js for CLI subcommands

3. **Real Cinderlink integration** - Replace mock `useCinderlinkClient` with actual `@cinderlink/client`

4. **Focus management** - Add keyboard navigation zones like exemplar's `FocusZone`

5. **Router** - Add page routing for more complex navigation

6. **Input components** - Add text input, select, etc. for interactive forms
