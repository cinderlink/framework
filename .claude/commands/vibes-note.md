---
description: Read or write scratchpad notes
arguments:
  - name: action
    description: Action (read, write, list, search)
    required: false
    default: list
  - name: key
    description: Note key for read/write
    required: false
  - name: content
    description: Note content for write
    required: false
---

# Vibes Scratchpad Notes

Quick access to session scratchpad for persistent notes.

## Action: {{action}}

{{#if (eq action "write")}}
Use `session-scratchpad { action: "write", key, content, contentType }`:
- key: "{{key}}"
- content: "{{content}}"
- contentType: "markdown" (or "json", "code" based on content)

{{else if (eq action "read")}}
Use `session-scratchpad { action: "read", key: "{{key}}" }`

{{else if (eq action "search")}}
Use `session-scratchpad { action: "search", query: "{{key}}" }`

{{else}}
Use `session-scratchpad { action: "list" }` to show all notes.
Display key, content type, and preview of each.
{{/if}}
