import { vi } from "vitest";
import type { IPFSWithLibP2P, SchemaRegistryInterface } from "@cinderlink/core-types";
import { createEd25519PeerId } from "@libp2p/peer-id-factory";
import { EventEmitter } from "events";

/**
 * Test fixtures for common mocking scenarios
 */
export class TestFixtures {
  /**
   * Create a mock IPFS instance with libp2p
   */
  static async createMockIPFS(): Promise<IPFSWithLibP2P> {
    const peerId = await createEd25519PeerId();
    const mockPubsub = new EventEmitter();
    
    return {
      libp2p: {
        peerId,
        services: {
          pubsub: {
            subscribe: vi.fn(),
            unsubscribe: vi.fn(),
            publish: vi.fn(),
            getTopics: vi.fn(() => []),
            getSubscribers: vi.fn(() => []),
            addEventListener: vi.fn(),
            removeEventListener: vi.fn(),
            dispatchEvent: vi.fn()
          } as any,
          identify: {
            getIdentifyData: vi.fn(() => ({
              protocols: ['/cinderlink/1.0.0'],
              agentVersion: 'test/1.0.0'
            }))
          } as any
        },
        getConnections: vi.fn(() => []),
        dial: vi.fn(),
        dialProtocol: vi.fn(() => ({
          stream: {
            sink: vi.fn(),
            source: (async function* () {})()
          }
        })),
        handle: vi.fn(),
        unhandle: vi.fn(),
        getProtocols: vi.fn(() => []),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn()
      },
      dag: {
        put: vi.fn(),
        get: vi.fn(),
        resolve: vi.fn()
      },
      block: {
        put: vi.fn(),
        get: vi.fn(),
        rm: vi.fn(),
        stat: vi.fn()
      },
      pin: {
        add: vi.fn(),
        rm: vi.fn(),
        ls: vi.fn()
      },
      id: vi.fn(async () => ({
        id: peerId,
        addresses: ['/ip4/127.0.0.1/tcp/4001']
      })),
      start: vi.fn(),
      stop: vi.fn()
    } as any;
  }
  
  /**
   * Create a mock schema registry
   */
  static createMockSchemaRegistry(): SchemaRegistryInterface {
    const schemas = new Map<string, any>();
    
    return {
      registerSchema: vi.fn((schemaId, version, schema) => {
        schemas.set(`${schemaId}:${version}`, schema);
        return { schemaId, version, schema };
      }),
      
      registerMigration: vi.fn(),
      
      getSchema: vi.fn((schemaId, version) => {
        return schemas.get(`${schemaId}:${version}`);
      }),
      
      hasSchema: vi.fn((schemaId, version) => {
        return schemas.has(`${schemaId}:${version || 1}`);
      }),
      
      validate: vi.fn((schemaId, version, data) => {
        // Always return success in tests unless specifically mocked
        return { success: true, data };
      }),
      
      migrateData: vi.fn((data) => {
        return { success: true, data };
      }),
      
      getSupportedVersions: vi.fn(() => [1]),
      
      getLatestVersion: vi.fn(() => 1),
      
      getAllSchemas: vi.fn(() => schemas)
    } as any;
  }
  
  /**
   * Create mock libp2p services
   */
  static createMockLibp2pServices() {
    return {
      dht: {
        findPeer: vi.fn(),
        findProviders: vi.fn(),
        provide: vi.fn(),
        put: vi.fn(),
        get: vi.fn()
      },
      pubsub: {
        subscribe: vi.fn(),
        unsubscribe: vi.fn(),
        publish: vi.fn(),
        getTopics: vi.fn(() => []),
        getSubscribers: vi.fn(() => []),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn()
      },
      identify: {
        getIdentifyData: vi.fn()
      },
      ping: {
        ping: vi.fn()
      },
      fetch: {
        fetch: vi.fn()
      }
    };
  }
  
  /**
   * Create a mock logger that captures logs
   */
  static createMockLogger() {
    const logs: Array<{
      module: string;
      severity: string;
      message: string;
      data?: any;
    }> = [];
    
    const logger = {
      clear: vi.fn((module?: string) => {
        if (module) {
          logs.splice(0, logs.length, ...logs.filter(l => l.module !== module));
        } else {
          logs.length = 0;
        }
      }),
      
      debug: vi.fn((module, message, data) => {
        logs.push({ module, severity: 'debug', message, data });
      }),
      
      error: vi.fn((module, message, data) => {
        logs.push({ module, severity: 'error', message, data });
      }),
      
      info: vi.fn((module, message, data) => {
        logs.push({ module, severity: 'info', message, data });
      }),
      
      warn: vi.fn((module, message, data) => {
        logs.push({ module, severity: 'warn', message, data });
      }),
      
      trace: vi.fn((module, message, data) => {
        logs.push({ module, severity: 'trace', message, data });
      }),
      
      log: vi.fn((module, severity, message, data) => {
        logs.push({ module, severity, message, data });
      }),
      
      getLogCount: vi.fn((module?: string) => {
        return module 
          ? logs.filter(l => l.module === module).length
          : logs.length;
      }),
      
      getLogs: vi.fn((module?: string) => {
        return module
          ? logs.filter(l => l.module === module)
          : logs;
      }),
      
      module: vi.fn((id: string) => ({
        clear: () => logger.clear(id),
        debug: (message: string, data?: any) => logger.debug(id, message, data),
        error: (message: string, data?: any) => logger.error(id, message, data),
        info: (message: string, data?: any) => logger.info(id, message, data),
        warn: (message: string, data?: any) => logger.warn(id, message, data),
        trace: (message: string, data?: any) => logger.trace(id, message, data),
        log: (severity: string, message: string, data?: any) => 
          logger.log(id, severity, message, data),
        getLogCount: () => logger.getLogCount(id),
        getLogs: () => logger.getLogs(id),
        submodule: (sub: string) => logger.module(`${id}:${sub}`)
      }))
    };
    
    return { logger, logs };
  }
  
  /**
   * Create a mock DID object
   */
  static createMockDID(id = 'did:test:12345') {
    return {
      id,
      did: id,
      parent: id,
      controller: id,
      authenticate: vi.fn(),
      createJWS: vi.fn(async (payload) => ({
        payload,
        signatures: [{ protected: 'mock', signature: 'mock' }],
        link: 'mock'
      })),
      verifyJWS: vi.fn(async () => ({ 
        didResolutionResult: { didDocument: {} },
        payload: {}
      })),
      createDagJWE: vi.fn(),
      decryptDagJWE: vi.fn(),
      _client: {
        didMethods: {},
        resolver: {
          resolve: vi.fn()
        }
      }
    };
  }
  
  /**
   * Create network delay simulator
   */
  static createNetworkDelaySimulator(baseDelay = 50, jitter = 20) {
    return {
      delay: async () => {
        const actualDelay = baseDelay + (Math.random() * jitter * 2 - jitter);
        await new Promise(resolve => setTimeout(resolve, actualDelay));
      },
      
      simulateTimeout: async (timeout: number) => {
        return new Promise((_, reject) => {
          setTimeout(() => reject(new Error('Network timeout')), timeout);
        });
      },
      
      simulatePacketLoss: (lossRate = 0.1) => {
        if (Math.random() < lossRate) {
          throw new Error('Packet lost');
        }
      }
    };
  }
  
  /**
   * Create test timers that can be controlled
   */
  static createControllableTimers() {
    const timers: Array<{
      id: number;
      callback: Function;
      delay: number;
      type: 'timeout' | 'interval';
      createdAt: number;
    }> = [];
    
    let currentTime = 0;
    let nextId = 1;
    
    return {
      setTimeout: vi.fn((callback: Function, delay: number) => {
        const id = nextId++;
        timers.push({
          id,
          callback,
          delay,
          type: 'timeout',
          createdAt: currentTime
        });
        return id;
      }),
      
      setInterval: vi.fn((callback: Function, delay: number) => {
        const id = nextId++;
        timers.push({
          id,
          callback,
          delay,
          type: 'interval',
          createdAt: currentTime
        });
        return id;
      }),
      
      clearTimeout: vi.fn((id: number) => {
        const index = timers.findIndex(t => t.id === id);
        if (index >= 0) timers.splice(index, 1);
      }),
      
      clearInterval: vi.fn((id: number) => {
        const index = timers.findIndex(t => t.id === id);
        if (index >= 0) timers.splice(index, 1);
      }),
      
      advance: (ms: number) => {
        const targetTime = currentTime + ms;
        
        while (currentTime < targetTime) {
          const ready = timers.filter(t => 
            currentTime - t.createdAt >= t.delay
          );
          
          if (ready.length === 0) {
            currentTime = targetTime;
            break;
          }
          
          for (const timer of ready) {
            timer.callback();
            
            if (timer.type === 'timeout') {
              const index = timers.indexOf(timer);
              timers.splice(index, 1);
            } else {
              timer.createdAt = currentTime;
            }
          }
          
          currentTime++;
        }
      },
      
      reset: () => {
        timers.length = 0;
        currentTime = 0;
        nextId = 1;
      },
      
      getActiveTimers: () => [...timers],
      getCurrentTime: () => currentTime
    };
  }
}