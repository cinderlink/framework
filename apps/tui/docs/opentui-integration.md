# OpenTUI Integration Guide

This document provides comprehensive guidance for using **@opentui/react** and **@opentui/core** in the Cinderlink TUI application.

## Overview

OpenTUI is a TypeScript library for building terminal user interfaces (TUIs) with a dual-language architecture:
- **TypeScript** - Developer-facing API and framework integrations
- **Zig** - Performance-critical rendering via FFI (Foreign Function Interface)

This achieves sub-millisecond frame times and 60+ FPS rendering for complex UIs.

## Installation

```bash
bun add @opentui/core @opentui/react
```

## Architecture

### Three-Tier Design

```
Application Layer    <- User TUI applications, React components
Framework Layer      <- React reconciler translating JSX to renderables
Core Layer (TS)      <- CliRenderer, renderables, layout engine, input system
FFI Boundary         <- RenderLib bridging TypeScript and Zig via Bun.dlopen()
Native Layer (Zig)   <- Frame diffing, ANSI generation, text buffers
```

### Rendering Pipeline (9 stages)

1. **Request** - `requestRender()` marks components dirty
2. **Loop** - FPS-capped event loop (default 30 FPS)
3. **Layout** - `yoga.Node.calculateLayout()` computes flexbox positions
4. **Render** - Each component draws to `OptimizedBuffer`
5. **Hit Grid** - Maps screen coordinates to renderable IDs for mouse events
6. **Diff** - Frame diffing compares previous vs current cell arrays
7. **ANSI** - Run-length encoding minimizes escape sequences
8. **Output** - Buffered stdout write
9. **Swap** - Buffer exchange for double-buffering

## Entry Point

```typescript
import { createCliRenderer } from "@opentui/core"
import { createRoot } from "@opentui/react"
import { App } from "./App"

const main = async () => {
  const renderer = await createCliRenderer({
    exitOnCtrlC: false, // Handle manually for cleanup
  })

  const root = createRoot(renderer)
  root.render(<App />)
}

main()
```

## Core Components

### Layout Elements

| Component | Purpose | Key Props |
|-----------|---------|-----------|
| `<box>` | Flexbox container | `flexDirection`, `padding`, `margin`, `border`, `borderColor`, `borderStyle`, `bg` |
| `<text>` | Text display | `content`, `fg`, `bg`, `bold`, `italic`, `underline` |
| `<scrollbox>` | Scrollable container | `scrollY`, `scrollX`, viewport clipping |

### Input Components

| Component | Purpose | Key Props |
|-----------|---------|-----------|
| `<input>` | Single-line text field | `placeholder`, `value`, `onChange` |
| `<textarea>` | Multi-line text editor | Full editing with undo/redo, word navigation |
| `<select>` | Dropdown selection | Options list, navigation |
| `<tab-select>` | Horizontal tabs | Scroll arrows support |

### Code Display

| Component | Purpose |
|-----------|---------|
| `<code>` | Syntax-highlighted code blocks (tree-sitter) |
| `<line-number>` | Code with line numbers and diagnostics |
| `<diff>` | Unified/split diff viewer with highlighting |

### Text Modifiers (nest inside `<text>`)

- `<span>` - Generic styled span
- `<strong>` / `<b>` - Bold text
- `<em>` / `<i>` - Italic text
- `<u>` - Underlined text
- `<br>` - Line break

### Special Components

| Component | Purpose |
|-----------|---------|
| `<ascii-font>` | ASCII art text with various fonts |

## Hooks

### useRenderer()

Access the OpenTUI renderer instance for console and terminal control.

```typescript
import { useRenderer } from '@opentui/react'

function MyComponent() {
  const renderer = useRenderer()

  // Show built-in console
  renderer.console.show()

  // Log to console
  renderer.console.log('Debug message')
}
```

### useKeyboard(handler, options?)

Captures keyboard input with support for press, repeat, and release events.

```typescript
import { useKeyboard } from '@opentui/react'

function MyComponent() {
  useKeyboard((event, key) => {
    if (key?.name === 'q') {
      process.exit(0)
    }
    if (key?.ctrl && key?.name === 's') {
      // Handle Ctrl+S
    }
  })
}
```

Key event properties:
- `key.name` - Key name (e.g., 'a', 'enter', 'escape', 'up', 'down')
- `key.ctrl` - Control key modifier
- `key.shift` - Shift key modifier
- `key.meta` - Meta/Command key modifier
- `key.sequence` - Raw key sequence

### useOnResize(callback)

Monitor terminal dimension changes.

```typescript
import { useOnResize } from '@opentui/react'

function MyComponent() {
  useOnResize(({ width, height }) => {
    console.log(`Terminal resized to ${width}x${height}`)
  })
}
```

### useTerminalDimensions()

Get current terminal dimensions with auto-updates.

```typescript
import { useTerminalDimensions } from '@opentui/react'

function MyComponent() {
  const { width, height } = useTerminalDimensions()
  return <text>Terminal: {width}x{height}</text>
}
```

### useTimeline(options?)

Manage animations through OpenTUI's timeline system.

```typescript
import { useTimeline } from '@opentui/react'

function MyComponent() {
  const timeline = useTimeline({
    duration: 1000,
    loop: true,
    autoplay: true,
    onComplete: () => console.log('Animation done')
  })

  // Control methods
  timeline.play()
  timeline.pause()
  timeline.restart()
}
```

## Styling

### Direct Props

```tsx
<box
  backgroundColor="blue"
  padding={2}
  flexDirection="column"
  width="100%"
  height="100%"
>
  <text fg="green" bold>Hello</text>
</box>
```

### Style Object

```tsx
<box style={{
  backgroundColor: 'blue',
  padding: 2,
  flexDirection: 'column'
}}>
  <text style={{ fg: 'green' }}>Hello</text>
</box>
```

### Available Style Properties

**Layout (Yoga Flexbox):**
- `width`, `height` - Dimensions (number, percentage string, or 'auto')
- `minWidth`, `maxWidth`, `minHeight`, `maxHeight`
- `padding`, `paddingTop`, `paddingRight`, `paddingBottom`, `paddingLeft`
- `margin`, `marginTop`, `marginRight`, `marginBottom`, `marginLeft`
- `flexDirection` - 'row' | 'column' | 'row-reverse' | 'column-reverse'
- `flexGrow`, `flexShrink`, `flexBasis`
- `justifyContent` - 'flex-start' | 'center' | 'flex-end' | 'space-between' | 'space-around'
- `alignItems`, `alignSelf` - 'flex-start' | 'center' | 'flex-end' | 'stretch'
- `position` - 'relative' | 'absolute'
- `top`, `right`, `bottom`, `left`

**Colors:**
- `fg` / `color` - Foreground color (hex or named)
- `bg` / `backgroundColor` - Background color

**Text:**
- `bold` - Boolean
- `italic` - Boolean
- `underline` - Boolean

**Borders:**
- `border` - Boolean to enable border
- `borderStyle` - 'single' | 'double' | 'round' | 'bold' | 'classic'
- `borderColor` - Color for border
- `title` - Title text for box border

## Focus Management

Components receive keyboard input when focused. The focus system routes input to the active component.

```typescript
// Input components automatically handle focus
<input
  placeholder="Type here..."
  onFocus={() => console.log('Focused')}
  onBlur={() => console.log('Blurred')}
/>
```

For custom focus management, use `TabSelectRenderable` or implement focus zones.

## Scrolling

`<scrollbox>` provides viewport clipping and scroll control:

```tsx
<scrollbox
  width="100%"
  height={20}
  scrollY={scrollPosition}
>
  {/* Long content here */}
</scrollbox>
```

Features:
- **Viewport clipping** - Scissors mask restricts visible region
- **Culling optimization** - Only renders visible children
- **Hit detection** - Adjusted for scroll offset in mouse handling

## Built-in Console

OpenTUI includes a debugging console that captures `console.log`, `console.warn`, and `console.error`:

- Toggle with backtick (`) key
- Text selection and scrolling
- Multiple positioning modes (TOP/BOTTOM/LEFT/RIGHT)

```typescript
const renderer = useRenderer()
renderer.console.show()
renderer.console.hide()
renderer.console.log('Debug info')
```

## Input Handling

### Keyboard

The input system processes raw terminal bytes supporting:
- Traditional ANSI sequences
- Kitty keyboard protocol
- SGR mouse encoding

Input flow:
1. `StdinBuffer` chunks raw bytes
2. `parseKeypress()` decodes ANSI/Kitty protocols
3. `KeyHandler` routes events to focused components
4. Component keybindings trigger actions

### Mouse

Mouse events are handled via hit grid mapping:

```typescript
component.on('mousedown', (event) => {
  const { x, y, button } = event
  // Handle click
})
```

## Text Editing (Textarea)

`<textarea>` provides full editing capabilities:

- **Keybindings:**
  - `Ctrl+A` - Select all
  - `Ctrl+Z` - Undo
  - `Ctrl+Shift+Z` - Redo
  - `Ctrl+Left/Right` - Word navigation
  - `Ctrl+U` - Delete line

- **Native Performance:** Uses Zig rope data structure for efficient manipulation

## Syntax Highlighting (Code)

`<code>` uses tree-sitter in a worker thread:

```tsx
<code
  language="typescript"
  content={sourceCode}
/>
```

Supported via `web-tree-sitter@0.25.10` - non-blocking rendering.

## TypeScript JSX Types

For proper TypeScript support, create `opentui.d.ts`:

```typescript
/// <reference types="@opentui/react/jsx-namespace" />
```

Or manually declare intrinsics:

```typescript
declare global {
  namespace JSX {
    interface IntrinsicElements {
      box: BoxProps;
      text: TextProps;
      scrollbox: ScrollBoxProps;
      input: InputProps;
      textarea: TextareaProps;
      select: SelectProps;
      'tab-select': TabSelectProps;
      code: CodeProps;
      diff: DiffProps;
      'line-number': LineNumberProps;
      'ascii-font': AsciiFontProps;
      span: SpanProps;
      b: SpanProps;
      i: SpanProps;
      u: SpanProps;
      strong: SpanProps;
      em: SpanProps;
      br: object;
    }
  }
}
```

## Component Extension

Register custom components:

```typescript
import { extend } from '@opentui/react'

class MyCustomRenderable extends BaseRenderable {
  // Implementation
}

extend({ 'my-custom': MyCustomRenderable })

// Now usable in JSX:
<my-custom prop="value" />
```

## Development Workflow

```bash
# Development with watch
bun run dev

# Build for production
bun run build

# Compile to standalone binary
bun run build:bin
```

## Platform Support

Pre-built binaries for:
- macOS (x64, arm64)
- Linux (x64, arm64)
- Windows (x64, arm64)

Runtime selection via `Bun.dlopen()` based on platform and architecture.

## Dependencies

**Core:**
- `yoga-layout@3.2.1` - Flexbox engine
- `diff@8.0.2` - Text diffing
- `jimp@1.6.0` - Image processing
- `web-tree-sitter@0.25.10` - Syntax highlighting (peer)

**Optional:**
- `@dimforge/rapier2d-simd-compat` - 2D physics
- `three@0.177.0` - 3D graphics

## Resources

- GitHub: https://github.com/sst/opentui
- NPM Core: https://www.npmjs.com/package/@opentui/core
- NPM React: https://www.npmjs.com/package/@opentui/react
- DeepWiki: https://deepwiki.com/sst/opentui
