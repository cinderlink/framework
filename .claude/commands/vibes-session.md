---
description: Manage vibes session - init, status, context, archive
arguments:
  - name: action
    description: Action to perform (init, status, context, archive)
    required: false
    default: status
---

# Vibes Session Management

Perform the requested session action using vibes MCP tools.

## Available Actions

- **init** - Initialize a new session for the current workspace
- **status** - Show current session status with todos and notes
- **context** - Get comprehensive session context (todos, scratchpad, files)
- **archive** - Archive the current session

## Action: {{action}}

{{#if (eq action "init")}}
Use `session { action: "init", workspacePath, description }` to create a new session:
- Set workspacePath to the current project directory
- Include a descriptive description based on the current task

{{else if (eq action "status")}}
Use `session { action: "status" }` to get:
- Active session info
- Todo summary (pending, in_progress, completed counts)
- Recent scratchpad entries

{{else if (eq action "context")}}
Use `session { action: "context" }` to get full context including:
- All active todos with their status
- Recent scratchpad notes
- Tracked file access history

{{else if (eq action "archive")}}
Use `session { action: "archive" }` to archive the current session.
Confirm with user before archiving.

{{else}}
Show session status by default using `session { action: "status" }`.
{{/if}}
