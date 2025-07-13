/**
 * Simplified plugin base using improved type patterns
 */

import { BasePlugin, TypedPluginEventDef, EmptyPluginEventDef, ExtractEventTypes, BaseEventPayload, TypedEventPayload, SubLoggerInterface, CinderlinkClientInterface } from "@cinderlink/core-types";

/**
 * Enhanced plugin interface with simplified event handling
 */
export interface SimplifiedPlugin<TEventDef extends TypedPluginEventDef = EmptyPluginEventDef> 
  extends BasePlugin {
  readonly eventTypes: ExtractEventTypes<TEventDef>;
  
  // Simplified event handlers
  handleEvent?<TType extends keyof TEventDef['receive']>(
    type: TType,
    payload: TEventDef['receive'][TType]
  ): Promise<void> | void;
  
  // Simplified event emission
  emit<TType extends keyof TEventDef['emit']>(
    type: TType,
    payload: TEventDef['emit'][TType]
  ): Promise<void>;
}

/**
 * Base plugin implementation using simplified patterns
 */
export abstract class BaseSimplifiedPlugin<TEventDef extends TypedPluginEventDef = EmptyPluginEventDef> 
  implements SimplifiedPlugin<TEventDef> {
  
  public started = false;
  
  constructor(
    public readonly id: string,
    public readonly logger: SubLoggerInterface,
    protected readonly client: CinderlinkClientInterface
  ) {}
  
  abstract readonly eventTypes: ExtractEventTypes<TEventDef>;
  
  async start(): Promise<void> {
    if (this.started) return;
    this.logger.info(`Starting plugin: ${this.id}`);
    await this.onStart();
    this.started = true;
    this.logger.info(`Plugin started: ${this.id}`);
  }
  
  async stop(): Promise<void> {
    if (!this.started) return;
    this.logger.info(`Stopping plugin: ${this.id}`);
    await this.onStop();
    this.started = false;
    this.logger.info(`Plugin stopped: ${this.id}`);
  }
  
  protected abstract onStart(): Promise<void>;
  protected abstract onStop(): Promise<void>;
  
  async emit<TType extends keyof TEventDef['emit']>(
    type: TType,
    payload: TEventDef['emit'][TType]
  ): Promise<void> {
    // Simplified emit - delegates to client's event system
    await (this.client as any).emit(type, payload);
  }
  
  // Helper to create typed event payloads
  protected createEvent<TType extends string, TData>(
    type: TType,
    data: TData
  ): TypedEventPayload<TType, TData> {
    return { type, data } as const;
  }
}

/**
 * Factory function to create plugin event definitions
 */
export function definePluginEvents<T extends TypedPluginEventDef>(events: T): T {
  return events;
}

/**
 * Helper to register event handlers with type safety
 */
export function registerEventHandler<TEventDef extends TypedPluginEventDef, TType extends keyof TEventDef['receive']>(
  plugin: SimplifiedPlugin<TEventDef>,
  type: TType,
  handler: (payload: TEventDef['receive'][TType]) => Promise<void> | void
): void {
  // Implementation would connect to the client's event system
  // For now, simplified to reduce complexity
}