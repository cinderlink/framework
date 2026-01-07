/**
 * Vibes Plugin for Opencode
 * Provides file tracking and context preservation
 */
import type { Plugin } from "@opencode-ai/plugin"
import { spawn } from 'child_process'

async function vibes(...args: string[]): Promise<string> {
  return new Promise((resolve, reject) => {
    const proc = spawn('bun vibes'.split(' ')[0], [
      ...('bun vibes'.split(' ').slice(1)),
      ...args
    ])
    let stdout = ''
    let stderr = ''
    proc.stdout?.on('data', (d) => stdout += d)
    proc.stderr?.on('data', (d) => stderr += d)
    proc.on('close', (code) => {
      if (code === 0) resolve(stdout.trim())
      else reject(new Error(stderr || `Exit code: ${code}`))
    })
    proc.on('error', reject)
  })
}

export default async function({ project, directory }): Promise<Plugin> {
  return {
    "tool.execute.after": async ({ tool, result }) => {
      const toolLower = tool.toLowerCase()
      if (['read', 'write', 'edit'].includes(toolLower) && result?.filePath) {
        try {
          await vibes('mcp', 'external', '--action', 'file-access-track',
            '--filePath', result.filePath,
            '--operation', toolLower === 'read' ? 'read' : 'edit',
            '--toolName', tool
          )
        } catch { /* ignore */ }
      }
    },

    event: async ({ event }) => {
      if (event.type === 'session.idle') {
        try {
          const summary = await vibes('mcp', 'external', '--action', 'context-summary', '--format', 'markdown')
          return { additionalContext: summary }
        } catch { return {} }
      }
    }
  }
}
