/**
 * @module PluginError
 * @description Error thrown when plugin operations fail
 */

import { FilterError } from './FilterError.js';

/**
 * Details for PluginError
 */
export interface PluginErrorDetails {
  'availableItems'?: string[];
  'name'?: string;
  'namespace'?: string;
  'pluginType'?: string;
}

/**
 * Error thrown when plugin operations fail
 */
export class PluginError extends FilterError {
  public readonly availableItems: string[] | null;
  public readonly context: PluginErrorDetails;
  public readonly details: PluginErrorDetails;
  public readonly itemName: string | null;
  public readonly namespace: string | null;
  public readonly pluginType: string | null;

  /**
   * Create a PluginError
   */
  constructor(message: string, code: string, details: PluginErrorDetails = {}, cause?: Error) {
    super(message, code, cause);

    // Set the name to the constructor name for proper inheritance
    this.name = this.constructor?.name || 'PluginError';

    // Store context (alias for details) - use the passed object directly
    this.context = details ?? {};

    // Add details property
    this.details = this.context;

    // Initialize all properties unconditionally for V8 optimization (maintaining hidden classes)
    this.pluginType = (details && 'pluginType' in details) ? (details.pluginType || null) : null;
    this.itemName = (details && 'name' in details) ? (details.name || null) : null;
    this.namespace = (details && 'namespace' in details) ? (details.namespace || null) : null;
    this.availableItems = (details && 'availableItems' in details) ? (details.availableItems || null) : null;
  }

  static {
    // Ensure proper prototype chain
    this.prototype.constructor = this;
  }
}
