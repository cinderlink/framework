import { z } from 'zod';
import Emittery from 'emittery';
import type { CinderlinkClientInterface } from '../client/interface';
import type { SubLoggerInterface } from '../logger/interface';
import type { PluginEventHandler } from './types';
import type { EncodingOptions } from '../protocol/types';

/**
 * Comprehensive Zod schema definitions for plugin events
 */
export interface ZodEventSchemas {
  send: Record<string, z.ZodTypeAny>;
  receive: Record<string, z.ZodTypeAny>;
  publish: Record<string, z.ZodTypeAny>;
  subscribe: Record<string, z.ZodTypeAny>;
  emit: Record<string, z.ZodTypeAny>;
}

/**
 * Enhanced message type with proper payload typing from schema
 */
export interface TypedIncomingMessage<TPayload = unknown> {
  peer: {
    peerId: string;
    did?: string;
  };
  payload: TPayload;
  encrypted?: boolean;
  timestamp?: number;
}

/**
 * Type-safe event handler that receives fully typed message
 */
export type SchemaBasedEventHandler<
  TSchemas extends ZodEventSchemas,
  TCategory extends keyof TSchemas,
  TEvent extends keyof TSchemas[TCategory]
> = (
  message: TypedIncomingMessage<z.infer<TSchemas[TCategory][TEvent]>>
) => void | Promise<void>;

/**
 * Extract event names with proper typing for each category
 */
export type ZodSendEvents<TSchemas extends ZodEventSchemas> = keyof TSchemas['send'];
export type ZodReceiveEvents<TSchemas extends ZodEventSchemas> = keyof TSchemas['receive'];
export type ZodPublishEvents<TSchemas extends ZodEventSchemas> = keyof TSchemas['publish'];
export type ZodSubscribeEvents<TSchemas extends ZodEventSchemas> = keyof TSchemas['subscribe'];
export type ZodEmitEvents<TSchemas extends ZodEventSchemas> = keyof TSchemas['emit'];

/**
 * Get payload type for a specific event in a category
 */
export type EventPayloadType<
  TSchemas extends ZodEventSchemas,
  TCategory extends keyof TSchemas,
  TEvent extends keyof TSchemas[TCategory]
> = z.output<TSchemas[TCategory][TEvent]>;

/**
 * Type-safe handlers configuration for plugin authors
 */
export interface ZodTypedEventHandlers<TSchemas extends ZodEventSchemas> {
  p2p?: {
    [K in ZodReceiveEvents<TSchemas>]?: SchemaBasedEventHandler<TSchemas, 'receive', K>;
  };
  pubsub?: {
    [K in ZodSubscribeEvents<TSchemas>]?: SchemaBasedEventHandler<TSchemas, 'subscribe', K>;
  };
  pluginEvents?: {
    [K in ZodEmitEvents<TSchemas>]?: SchemaBasedEventHandler<TSchemas, 'emit', K>;
  };
  coreEvents?: Record<string, (data: any) => void | Promise<void>>;
}

/**
 * Complete type-safe Zod-based plugin base class
 */
export abstract class ZodPluginBase<
  TSchemas extends ZodEventSchemas,
  TClient extends CinderlinkClientInterface = CinderlinkClientInterface
> {
  public readonly id: string;
  public readonly schemas: TSchemas;
  public readonly client: TClient;
  public readonly logger: SubLoggerInterface;
  public started = false;
  protected readonly pluginEvents: Emittery<TSchemas['emit']>;

  constructor(
    id: string,
    client: TClient,
    schemas: TSchemas
  ) {
    this.id = id;
    this.client = client;
    this.schemas = schemas;
    this.logger = client.logger.module('plugins').submodule(id);
    this.pluginEvents = new Emittery();
  }

  /**
   * Plugin authors must implement this to define their event handlers
   */
  protected abstract getEventHandlers(): ZodTypedEventHandlers<TSchemas>;

  /**
   * Validate an event payload against its schema
   */
  protected validateEventPayload<
    TCategory extends keyof TSchemas,
    TEvent extends keyof TSchemas[TCategory]
  >(
    category: TCategory,
    event: TEvent,
    payload: unknown
  ): z.infer<TSchemas[TCategory][TEvent]> {
    const categorySchemas = this.schemas[category] as Record<string, z.ZodTypeAny>;
    const schema = categorySchemas?.[event as string];
    
    if (!schema) {
      throw new Error(`No schema defined for ${String(category)}.${String(event)}`);
    }
    
    const result = schema.safeParse(payload);
    if (!result.success) {
      throw new Error(
        `Invalid payload for ${String(category)}.${String(event)}: ${result.error.message}`
      );
    }

    return result.data as z.output<TSchemas[TCategory][TEvent]>;
  }

  /**
   * Type-safe send method with full schema validation and inference
   */
  protected async send<TEvent extends ZodSendEvents<TSchemas>>(
    peerId: string,
    event: TEvent,
    payload: EventPayloadType<TSchemas, 'send', TEvent>,
    encoding?: EncodingOptions
  ): Promise<void> {
    const validated = this.validateEventPayload('send', event, payload);
    await (this.client as any).send(peerId, {
      topic: event,
      payload: validated
    }, encoding);
  }

  /**
   * Type-safe publish method with full schema validation and inference
   */
  protected async publish<TEvent extends ZodPublishEvents<TSchemas>>(
    event: TEvent,
    payload: EventPayloadType<TSchemas, 'publish', TEvent>,
    encoding?: EncodingOptions
  ): Promise<void> {
    const validated = this.validateEventPayload('publish', event, payload);
    await (this.client as any).publish(event, validated, encoding);
  }

  /**
   * Type-safe emit method for plugin events
   */
  public async emit<TEvent extends ZodEmitEvents<TSchemas>>(
    event: TEvent,
    payload: EventPayloadType<TSchemas, 'emit', TEvent>
  ): Promise<void> {
    const validated = this.validateEventPayload('emit', event, payload);
    await this.pluginEvents.emit(event as keyof TSchemas['emit'], validated as TSchemas['emit'][TEvent]);
  }

  /**
   * Create a type-safe handler wrapper
   */
  private createTypedHandler<
    TCategory extends keyof TSchemas,
    TEvent extends keyof TSchemas[TCategory]
  >(
    category: TCategory,
    event: TEvent,
    handler: SchemaBasedEventHandler<TSchemas, TCategory, TEvent>
  ): PluginEventHandler {
    return async (rawMessage: any) => {
      try {
        const validatedPayload = this.validateEventPayload(category, event, rawMessage.payload);
        const typedMessage: TypedIncomingMessage<z.infer<TSchemas[TCategory][TEvent]>> = {
          peer: rawMessage.peer,
          payload: validatedPayload,
          encrypted: rawMessage.encrypted,
          timestamp: rawMessage.timestamp
        };
        await handler(typedMessage);
      } catch (_error) {
        this.logger.error(
          `Error handling ${String(category)}.${String(event)}`,
          { error: _error instanceof Error ? _error.message : String(_error) }
        );
        throw _error;
      }
    };
  }

  /**
   * Get event handlers with automatic type-safe validation
   */
  protected getValidatedHandlers(): {
    p2p?: Record<string, PluginEventHandler>;
    pubsub?: Record<string, PluginEventHandler>;
    coreEvents?: Record<string, PluginEventHandler>;
    pluginEvents?: Record<string, PluginEventHandler>;
  } {
    const handlers = this.getEventHandlers();
    const result: {
      p2p?: Record<string, PluginEventHandler>;
      pubsub?: Record<string, PluginEventHandler>;
      coreEvents?: Record<string, PluginEventHandler>;
      pluginEvents?: Record<string, PluginEventHandler>;
    } = {};

    // Register P2P handlers with type safety
    if (handlers.p2p) {
      result.p2p = {};
      for (const [event, handler] of Object.entries(handlers.p2p)) {
        if (handler) {
          result.p2p[event] = this.createTypedHandler('receive', event as any, handler);
        }
      }
    }

    // Register pubsub handlers with type safety
    if (handlers.pubsub) {
      result.pubsub = {};
      for (const [event, handler] of Object.entries(handlers.pubsub)) {
        if (handler) {
          result.pubsub[event] = this.createTypedHandler('subscribe', event as any, handler);
        }
      }
    }

    // Register plugin event handlers with type safety
    if (handlers.pluginEvents) {
      result.pluginEvents = {};
      for (const [event, handler] of Object.entries(handlers.pluginEvents)) {
        if (handler) {
          result.pluginEvents[event] = this.createTypedHandler('emit', event as any, handler);
        }
      }
    }

    // Register core event handlers (no schema validation needed)
    if (handlers.coreEvents) {
      result.coreEvents = handlers.coreEvents as Record<string, PluginEventHandler>;
    }

    return result;
  }

  /**
   * Initialize the plugin with type-safe handlers
   */
  protected async initializeHandlers(): Promise<void> {
    const handlers = this.getValidatedHandlers();

    // Register P2P handlers
    if (handlers.p2p) {
      for (const [event, handler] of Object.entries(handlers.p2p)) {
        (this.client as any).on(event, handler);
      }
    }

    // Register pubsub handlers  
    if (handlers.pubsub) {
      for (const [event, handler] of Object.entries(handlers.pubsub)) {
        (this.client as any).subscribe(event, handler);
      }
    }

    // Register plugin event handlers
    if (handlers.pluginEvents) {
      for (const [event, handler] of Object.entries(handlers.pluginEvents)) {
        (this.client as any).on(event, handler);
      }
    }

    // Register core event handlers
    if (handlers.coreEvents) {
      for (const [event, handler] of Object.entries(handlers.coreEvents)) {
        (this.client as any).on(event, handler);
      }
    }
  }

  /**
   * Start the plugin - must be implemented by plugin authors
   */
  abstract start(): Promise<void>;

  /**
   * Stop the plugin - must be implemented by plugin authors
   */
  abstract stop(): Promise<void>;
}

/**
 * Helper to create a typed plugin schema definition
 */
export function definePluginSchemas<T extends ZodEventSchemas>(schemas: T): T {
  return schemas;
}

/**
 * Helper to get the inferred type of a schema definition
 */
export type InferPluginTypes<T extends ZodEventSchemas> = {
  send: {
    [K in keyof T['send']]: z.infer<T['send'][K]>;
  };
  receive: {
    [K in keyof T['receive']]: z.infer<T['receive'][K]>;
  };
  publish: {
    [K in keyof T['publish']]: z.infer<T['publish'][K]>;
  };
  subscribe: {
    [K in keyof T['subscribe']]: z.infer<T['subscribe'][K]>;
  };
  emit: {
    [K in keyof T['emit']]: z.infer<T['emit'][K]>;
  };
};

/**
 * Helper to create a Zod-based plugin with inferred types (legacy compatibility)
 */
export function createZodPlugin<
  TSchemas extends ZodEventSchemas,
  TClient extends CinderlinkClientInterface = CinderlinkClientInterface
>(
  id: string,
  schemas: TSchemas,
  implementation: {
    start: (plugin: ZodPluginBase<TSchemas, TClient>) => Promise<void>;
    stop?: (plugin: ZodPluginBase<TSchemas, TClient>) => Promise<void>;
    handlers?: ZodTypedEventHandlers<TSchemas>;
  }
): new (client: TClient) => ZodPluginBase<TSchemas, TClient> {
  return class extends ZodPluginBase<TSchemas, TClient> {
    constructor(client: TClient) {
      super(id, client, schemas);
    }
    
    protected getEventHandlers(): ZodTypedEventHandlers<TSchemas> {
      return implementation.handlers || {};
    }
    
    async start(): Promise<void> {
      await this.initializeHandlers();
      await implementation.start(this);
      this.started = true;
    }
    
    async stop(): Promise<void> {
      if (implementation.stop) {
        await implementation.stop(this);
      }
      this.started = false;
    }
  };
}