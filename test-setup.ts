import { vi } from 'vitest'
import { EventEmitter } from 'events'
import { TextEncoder, TextDecoder } from 'util'

// Polyfill TextEncoder/TextDecoder for jsdom
if (!global.TextEncoder) {
  global.TextEncoder = TextEncoder
}
if (!global.TextDecoder) {
  global.TextDecoder = TextDecoder as any
}

// Enhanced EventTarget polyfill for libp2p compatibility
class EventTargetPolyfill extends EventEmitter {
  addEventListener(type: string, listener: any, options?: any) {
    this.on(type, listener)
  }
  
  removeEventListener(type: string, listener: any) {
    this.off(type, listener)
  }
  
  dispatchEvent(event: any) {
    this.emit(event.type, event)
    return true
  }
}

// Mock DOM APIs that aren't available in jsdom
if (!global.addEventListener) {
  global.addEventListener = vi.fn()
  global.removeEventListener = vi.fn()
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

// Add process polyfill for browser environment
if (!globalThis.process) {
  globalThis.process = {
    env: {},
    nextTick: (fn: Function) => setTimeout(fn, 0),
    hrtime: { bigint: () => BigInt(Date.now() * 1000000) },
    versions: { node: '18.0.0' }
  } as any
}

// Increase test timeout for integration tests
vi.setConfig({ testTimeout: 30000 })
