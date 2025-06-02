import { vi } from 'vitest'
import { EventEmitter } from 'events'

// Polyfill for libp2p compatibility in Node.js test environment
if (typeof globalThis.addEventListener === 'undefined') {
  const events = new EventEmitter()
  globalThis.addEventListener = (event: string, handler: any) => events.on(event, handler)
  globalThis.removeEventListener = (event: string, handler: any) => events.off(event, handler)
  globalThis.dispatchEvent = (event: any) => {
    events.emit(event.type, event)
    return true
  }
}

// Mock crypto.randomUUID if not available
if (!globalThis.crypto?.randomUUID) {
  globalThis.crypto = {
    ...globalThis.crypto,
    randomUUID: () => {
      return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        const r = Math.random() * 16 | 0
        const v = c == 'x' ? r : (r & 0x3 | 0x8)
        return v.toString(16)
      })
    }
  } as any
}

// Increase test timeout for integration tests
vi.setConfig({ testTimeout: 30000 })
