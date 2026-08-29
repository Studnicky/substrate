/**
 * Base plugin class for FilterEngine plugins
 * All plugins must be idiomatic Node.js classes that accept constructor configs
 * and support field-level configuration through context.options
 */

import type { BasePluginInterface } from './BasePluginInterface.js';
import type { ContextualArrayLogicFunctionInterface } from './ContextualArrayLogicFunctionInterface.js';
import type { ContextualComparatorFunctionInterface } from './ContextualComparatorFunctionInterface.js';
import type { ContextualLogicGateFunctionInterface } from './ContextualLogicGateFunctionInterface.js';
import type { ContextualOperatorFunctionInterface } from './ContextualOperatorFunctionInterface.js';
import type { PluginContextInterface } from './PluginContextInterface.js';

/**
 * Abstract base class that plugins can extend (optional)
 * Provides common functionality and enforces the interface
 *
 * ETL Pipeline Usage:
 * - Constructor accepts default configuration
 * - Individual conditions can override settings via context.options
 *
 * Example:
 * ```
 * class MyPlugin extends Plugin {
 *   constructor(config = { threshold: 0.5 }) {
 *     super();
 *     this.defaultConfig = config;
 *     this.operators = {
 *       'FUZZY_MATCH': (value, filterValue, context) => {
 *         const threshold = context?.options?.threshold || this.defaultConfig.threshold;
 *         return similarity(value, filterValue) >= threshold;
 *       }
 *     };
 *   }
 * }
 * ```
 */
export abstract class Plugin implements BasePluginInterface {
  public arrayLogic?: Record<string, ContextualArrayLogicFunctionInterface>;
  public comparators?: Record<string, ContextualComparatorFunctionInterface>;
  protected defaultConfig: Record<string, unknown>;
  public gates?: Record<string, ContextualLogicGateFunctionInterface>;

  public operators?: Record<string, ContextualOperatorFunctionInterface>;

  constructor(config: Record<string, unknown> = {}) {
    this.defaultConfig = config;
  }

  /**
   * Helper method to get configuration value with field-level override
   * Priority: context.options > defaultConfig > options.defaultValue
   */
  protected getConfig(key: string, options: { 'context'?: PluginContextInterface; 'defaultValue'?: unknown } = {}): unknown {
    const result = options.context?.options?.[key] ?? this.defaultConfig[key] ?? options.defaultValue;

    return result;
  }

  /**
   * Get the plugin namespace (class name)
   * Used internally by FilterEngine for registration
   */
  getNamespace(): string {
    const result = this.constructor.name;

    return result;
  }
}
