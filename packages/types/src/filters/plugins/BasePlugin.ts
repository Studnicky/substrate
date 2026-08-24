/**
 * Base plugin interface for FilterEngine plugins
 * All plugins must be idiomatic Node.js classes that accept constructor configs
 * and support field-level configuration through context.options
 */

import type { FilterValue } from '../types.js';

// Context passed to plugin operators with field-level options
export interface PluginContext {
  // Additional context data
  'condition'?: unknown;
  'data'?: unknown;
  // Field-level configuration that overrides plugin defaults
  'options'?: Record<string, unknown>;
}

// Enhanced function signatures that accept context
export type ContextualOperatorFunction = (
  value: FilterValue,
  filterValue: FilterValue,
  context?: PluginContext
) => boolean;

export type ContextualComparatorFunction = (
  value1: FilterValue,
  value2: FilterValue,
  context?: PluginContext
) => number;

export type ContextualLogicGateFunction = (
  results: boolean[],
  context?: PluginContext
) => boolean;

export type ContextualArrayLogicFunction = (
  results: boolean[],
  context?: PluginContext
) => boolean;

export interface BasePlugin {
  /**
   * Optional array logic functions provided by this plugin
   * Keys become available as PluginClassName:LOGIC_NAME
   * Support field-level configuration via context.options
   */
  'arrayLogic'?: Record<string, ContextualArrayLogicFunction>;

  /**
   * Optional comparators provided by this plugin
   * Keys become available as PluginClassName:COMPARATOR_NAME
   * Support field-level configuration via context.options
   */
  'comparators'?: Record<string, ContextualComparatorFunction>;

  /**
   * Optional logic gates provided by this plugin
   * Keys become available as PluginClassName:GATE_NAME
   * Support field-level configuration via context.options
   */
  'gates'?: Record<string, ContextualLogicGateFunction>;

  /**
   * Optional operators provided by this plugin
   * Keys become available as PluginClassName:OPERATOR_NAME
   * Support field-level configuration via context.options
   */
  'operators'?: Record<string, ContextualOperatorFunction>;
}

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
export abstract class Plugin implements BasePlugin {
  public arrayLogic?: Record<string, ContextualArrayLogicFunction>;
  public comparators?: Record<string, ContextualComparatorFunction>;
  protected defaultConfig: Record<string, unknown>;
  public gates?: Record<string, ContextualLogicGateFunction>;

  public operators?: Record<string, ContextualOperatorFunction>;

  constructor(config: Record<string, unknown> = {}) {
    this.defaultConfig = config;
  }

  /**
   * Helper method to get configuration value with field-level override
   * @param key - Configuration key
   * @param context - Plugin context with potential field-level options
   * @param defaultValue - Fallback value if not found
   */
  protected getConfig<T>(key: string, context?: PluginContext, defaultValue?: T): T | undefined {
    // Priority: context.options > defaultConfig > defaultValue
    return (context?.options?.[key] as T) ?? (this.defaultConfig[key] as T) ?? defaultValue;
  }

  /**
   * Get the plugin namespace (class name)
   * Used internally by FilterEngine for registration
   */
  getNamespace(): string {
    return this.constructor.name;
  }
}
