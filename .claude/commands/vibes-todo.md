---
description: Quick todo management - add, list, complete
arguments:
  - name: action
    description: Action (add, list, complete, update)
    required: false
    default: list
  - name: content
    description: Todo content or ID
    required: false
---

# Vibes Todo Management

Quick access to session todo operations.

## Action: {{action}}

{{#if (eq action "add")}}
Use `session-todo { action: "add", content, priority }` to create a new todo:
- content: "{{content}}"
- Set appropriate priority based on context

{{else if (eq action "complete")}}
Use `session-todo { action: "complete", todoId: "{{content}}" }`

{{else if (eq action "update")}}
Use `session-todo { action: "update", todoId, ... }` to modify the todo "{{content}}"

{{else}}
Use `session-todo { action: "list", mine: false }` to show all todos.
Group by status: in_progress first, then pending, then completed.
{{/if}}
