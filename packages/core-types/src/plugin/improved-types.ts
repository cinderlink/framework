import type { SubLoggerInterface } from "../logger";

/**
 * Base event payload that all plugin events must extend
 */
export interface BaseEventPayload {
  readonly type: string;
  readonly data: unknown;
}

/**
 * Strongly typed event payload with discriminated union support
 */
export interface TypedEventPayload<TType extends string, TData> extends BaseEventPayload {
  readonly type: TType;
  readonly data: TData;
}

/**
 * Event handler function type
 */
export type EventHandler<TPayload extends BaseEventPayload> = (
  payload: TPayload
) => void | Promise<void>;

/**
 * Collection of event handlers keyed by event type
 */
export type EventHandlerMap<TEvents extends Record<string, BaseEventPayload>> = {
  [K in keyof TEvents]: EventHandler<TEvents[K]>;
};

/**
 * Plugin event definition with proper type constraints
 */
export interface TypedPluginEventDef<
  TSend extends Record<string, BaseEventPayload> = Record<string, BaseEventPayload>,
  TReceive extends Record<string, BaseEventPayload> = Record<string, BaseEventPayload>,
  TPublish extends Record<string, BaseEventPayload> = Record<string, BaseEventPayload>,
  TSubscribe extends Record<string, BaseEventPayload> = Record<string, BaseEventPayload>,
  TEmit extends Record<string, BaseEventPayload> = Record<string, BaseEventPayload>
> {
  send: TSend;
  receive: TReceive;
  publish: TPublish;
  subscribe: TSubscribe;
  emit: TEmit;
}

/**
 * Empty event definition for plugins that don't define custom events
 */
export type EmptyPluginEventDef = TypedPluginEventDef<{}, {}, {}, {}, {}>;

/**
 * Base plugin interface with minimal required properties
 */
export interface BasePlugin {
  readonly id: string;
  readonly logger: SubLoggerInterface;
  started: boolean;
  start?(): Promise<void>;
  stop?(): Promise<void>;
}

/**
 * Helper type to extract event types from a plugin event definition
 */
export type ExtractEventTypes<T extends TypedPluginEventDef> = {
  send: keyof T['send'];
  receive: keyof T['receive'];
  publish: keyof T['publish'];
  subscribe: keyof T['subscribe'];
  emit: keyof T['emit'];
};

/**
 * Helper to create a typed event payload
 */
export function createEventPayload<TType extends string, TData>(
  type: TType,
  data: TData
): TypedEventPayload<TType, TData> {
  return { type, data } as const;
}

/**
 * Type guard to check if a value is a valid event payload
 */
export function isEventPayload(value: unknown): value is BaseEventPayload {
  return (
    typeof value === 'object' &&
    value !== null &&
    'type' in value &&
    'data' in value &&
    typeof (value as BaseEventPayload).type === 'string'
  );
}

/**
 * Helper to create a plugin event definition with proper typing
 */
export function definePluginEvents<T extends TypedPluginEventDef>(events: T): T {
  return events;
}