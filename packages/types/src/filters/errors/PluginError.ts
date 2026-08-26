/**
 * @module PluginError
 * @description Error thrown when plugin operations fail
 */

import { FilterError } from './FilterError.js';

/**
 * Details for PluginError
 */
export interface PluginErrorDetailsInterface {
  'availableItems'?: readonly string[];
  'cause'?: Error | undefined;
  'name'?: string;
  'namespace'?: string;
  'pluginType'?: string;
}

/**
 * Error thrown when plugin operations fail
 */
export class PluginError extends FilterError {
  public readonly availableItems: readonly string[] | null;
  public readonly context: PluginErrorDetailsInterface;
  public readonly details: PluginErrorDetailsInterface;
  public readonly itemName: string | null;
  public readonly namespace: string | null;
  public readonly pluginType: string | null;

  /**
   * Create a PluginError
   */
  constructor(message: string, code: string, details: PluginErrorDetailsInterface = {}) {
    super(message, { 'cause': details.cause, 'code': code });

    // Set the name to the constructor name for proper inheritance
    this.name = this.constructor.name !== '' ? this.constructor.name : 'PluginError';

    // Store context (alias for details) - use the passed object directly
    this.context = details;

    // Add details property
    this.details = this.context;

    // Initialize all properties unconditionally for V8 optimization (maintaining hidden classes)
    this.pluginType = ('pluginType' in details && details.pluginType !== undefined && details.pluginType !== '') ? details.pluginType : null;
    this.itemName = ('name' in details && details.name !== undefined && details.name !== '') ? details.name : null;
    this.namespace = ('namespace' in details && details.namespace !== undefined && details.namespace !== '') ? details.namespace : null;
    this.availableItems = ('availableItems' in details && details.availableItems !== undefined) ? details.availableItems : null;
  }

  public override toJSON(): Record<string, unknown> {
    return {
      ...super.toJSON(),
      'availableItems': this.availableItems,
      'context': this.context,
      'details': this.details,
      'itemName': this.itemName,
      'namespace': this.namespace,
      'pluginType': this.pluginType
    };
  }

  static {
    // Ensure proper prototype chain
    PluginError.prototype.constructor = PluginError;
  }
}
