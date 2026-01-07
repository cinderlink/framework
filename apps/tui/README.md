# Cinderlink TUI

Terminal User Interface for the Cinderlink framework.

## Features

- Node status monitoring
- Network node management
- Real-time logging
- Interactive dashboard

## Visual Layout

The TUI follows a structured layout with:

1. **Header** - Application title and version
2. **Navigation Bar** - Quick access to different views (Dashboard, Nodes, Logs, Settings)
3. **Main Content Area** - View-specific information and controls
4. **Footer** - Status information and instructions

## Getting Started

```bash
# Run the TUI application
bun run src/index.ts

# Build for production
bun build src/index.ts --outdir=dist --target=node --format=esm

# Create standalone binary
bun build src/index.ts --outdir=dist --target=node --format=esm --compile
```

## Commands

- `Ctrl+C` - Quit the application
- Navigation bar buttons - Switch between views (simulated in this example)

## Architecture

This TUI application is built using:
- TypeScript for type safety
- Node.js readline module for terminal interaction
- Standard ANSI terminal styling for layout

The structure is designed to be modular and extensible, following the same patterns as the rest of the Cinderlink framework.
