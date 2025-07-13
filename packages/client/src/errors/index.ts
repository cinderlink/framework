/**
 * Standardized error handling for Cinderlink client
 */

/**
 * Base error class for all Cinderlink errors
 */
export class CinderlinkError extends Error {
  constructor(
    message: string,
    public code: string,
    public context?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'CinderlinkError';
  }
}

/**
 * Network-related errors
 */
export class NetworkError extends CinderlinkError {
  constructor(message: string, context?: Record<string, unknown>) {
    super(message, 'NETWORK_ERROR', context);
    this.name = 'NetworkError';
  }
}

/**
 * Protocol-related errors
 */
export class ProtocolError extends CinderlinkError {
  constructor(message: string, context?: Record<string, unknown>) {
    super(message, 'PROTOCOL_ERROR', context);
    this.name = 'ProtocolError';
  }
}

/**
 * Plugin-related errors
 */
export class PluginError extends CinderlinkError {
  constructor(message: string, pluginId: string, context?: Record<string, unknown>) {
    super(message, 'PLUGIN_ERROR', { pluginId, ...context });
    this.name = 'PluginError';
  }
}

/**
 * Identity/DID-related errors
 */
export class IdentityError extends CinderlinkError {
  constructor(message: string, context?: Record<string, unknown>) {
    super(message, 'IDENTITY_ERROR', context);
    this.name = 'IdentityError';
  }
}

/**
 * Service availability errors
 */
export class ServiceNotAvailableError extends CinderlinkError {
  constructor(serviceName: string) {
    super(`${serviceName} service is not available`, 'SERVICE_NOT_AVAILABLE', { serviceName });
    this.name = 'ServiceNotAvailableError';
  }
}

/**
 * Validation errors
 */
export class ValidationError extends CinderlinkError {
  constructor(message: string, field?: string, context?: Record<string, unknown>) {
    super(message, 'VALIDATION_ERROR', { field, ...context });
    this.name = 'ValidationError';
  }
}

/**
 * Type guard to check if error is a Cinderlink error
 */
export function isCinderlinkError(error: unknown): error is CinderlinkError {
  return error instanceof CinderlinkError;
}

/**
 * Helper to create consistent error context
 */
export function createErrorContext(
  operation: string,
  additionalContext?: Record<string, unknown>
): Record<string, unknown> {
  return {
    operation,
    timestamp: Date.now(),
    ...additionalContext,
  };
}