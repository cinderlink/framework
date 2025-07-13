import { z } from 'zod';
import type { EncodingOptions, ProtocolPayload } from '../protocol/types';

// Base schema for any plugin event payload
export const PluginEventPayloadSchema = z.record(z.string(), z.unknown());

// Schema for a complete plugin event definition
export const PluginEventDefSchema = z.object({
  send: PluginEventPayloadSchema,
  receive: PluginEventPayloadSchema,
  publish: PluginEventPayloadSchema,
  subscribe: PluginEventPayloadSchema,
  emit: PluginEventPayloadSchema,
});

// Infer the base type
export type ZodPluginEventDef = z.infer<typeof PluginEventDefSchema>;

// Helper to create typed event definitions with proper constraints
export function createPluginEventDef<T extends ZodPluginEventDef>(def: T): T {
  return def;
}

// Helper to create a typed event payload with Zod schema
export function createZodEventPayload<
  TData extends z.ZodTypeAny
>(
  _dataSchema: TData,
  encoding?: EncodingOptions
): ProtocolPayload<z.infer<TData>> {
  return {
    _data: {} as z.infer<TData>,
    _encoding: encoding || ({} as EncodingOptions),
  } as ProtocolPayload<z.infer<TData>>;
}

// Type-safe event handler
export type TypedEventHandler<TSchema extends z.ZodTypeAny> = (
  payload: z.infer<TSchema>
) => void | Promise<void>;

// Type-safe event handlers collection
export type TypedEventHandlers<TEvents extends Record<string, z.ZodTypeAny>> = {
  [K in keyof TEvents]: TypedEventHandler<TEvents[K]>;
};