#!/bin/bash
# Claude Code Stop Hook - Brain Debrief (End-of-Turn Reflection)
#
# This hook fires at the end of each assistant turn to:
# - Evaluate turn success based on stop reason
# - Update brain state (coherence, confidence, motivation)

set -euo pipefail

VIBES_PATH="${VIBES_PATH:-bun vibes}"

# Get stop reason from environment
STOP_REASON="${STOP_REASON:-end_turn}"

# Determine success based on stop reason
case "$STOP_REASON" in
  end_turn|stop_sequence|tool_use)
    SUCCESS="true"
    ;;
  error|max_tokens|timeout|cancelled)
    SUCCESS="false"
    ;;
  *)
    SUCCESS="true"
    ;;
esac

# Run brain debrief
$VIBES_PATH brain debrief --stop-reason "$STOP_REASON" --success "$SUCCESS" --output json 2>/dev/null || true
