/**
 * Core type definitions for the FilterEngine
 */

import { Guard } from '../guards/Guard.js';

// Basic value types that filters can process
export interface FilterValueRecordInterface {
  readonly [key: string]: FilterValue;
}

export type FilterValue
  = string
  | number
  | boolean
  | Date
  | null
  | undefined
  | FilterValue[]
  | Set<FilterValue>
  | Map<string, FilterValue>
  | FilterValueRecordInterface;

// Operator function signature - third parameter is the condition object for configuration
export type OperatorFunction = (
  value: FilterValue,
  filterValue: FilterValue,
  condition?: FilterCondition,
  data?: Record<string, unknown>
) => boolean;

// Logic gate function signature
export type LogicGateFunction = (results: boolean[]) => boolean;

// Filter mode function signature
export type FilterModeFunction = (result: boolean) => boolean;

// Array logic function signature
export type ArrayLogicFunction = (results: boolean[]) => boolean;

// Error collection function signature
export type ErrorCollectionFunction = (errors: Error[], newError: Error) => boolean;


// Comparator function signature
export type ComparatorFunction = (value: FilterValue, filterValue: FilterValue, condition?: FilterCondition) => boolean;

// Range interfaces for BETWEEN/OUTSIDE operators
export interface NumericRange {
  'inclusive'?: boolean;
  'max': number;
  'min': number;
}

export interface DateRange {
  'inclusive'?: boolean;
  'max': string | Date | number;
  'min': string | Date | number;
}

export interface TimeRange {
  'inclusive'?: boolean;
  'max': string;
  'min': string;
}

// Generic range interface
export interface Range<T = number | string | Date> {
  'inclusive'?: boolean;
  'max': T;
  'min': T;
}

// Filter condition interface
export interface FilterCondition {
  // Allow indexing with strings for dynamic property access. Typed unknown, not
  // FilterConditionValue, so it can coexist with named properties (options, input)
  // whose own values are broader than that union — narrower named properties remain
  // fully typed; this only governs undeclared dynamic keys.
  [key: string]: unknown;
  'arrayLogic'?: string | ArrayLogicFunction;
  'arrayPath'?: string;

  'caseSensitive'?: boolean;

  'compiledPath'?: string[];
  // Nested conditions
  'conditions'?: FilterCondition[];

  'decimalPrecision'?: number;

  'field'?: string;

  'filterValue'?: FilterValue;
  // Logic gate for nested conditions
  'gate'?: string | LogicGateFunction;
  // One array-logic value (EVERY/SOME/NONE/ONE, or a custom ArrayLogicFunction)
  // per array wildcard segment ([*]) in the path
  'groupGates'?: (string | ArrayLogicFunction)[];
  'inclusive'?: boolean;
  // Metadata
  'index'?: number;
  // This remains unknown as it's truly external input
  'input'?: unknown;
  'lowerValue'?: string;
  'maxValue'?: number;
  'minValue'?: number;
  // Additional options
  'negate'?: boolean;
  'numericValue'?: number | bigint;
  // Operator to apply
  'operator'?: string | OperatorFunction;

  // Plugin configuration - field-level options that override plugin defaults
  'options'?: Record<string, unknown>;

  // Field/path to evaluate
  'path'?: string;
  'pathway'?: string;
  'phase'?: string;

  'rowGate'?: string | LogicGateFunction;
  'threshold'?: number;
  // Compiled properties
  'type'?: string;

  // Value to compare against
  'value'?: FilterValue;
}

// Compiled condition interface
export interface CompiledCondition extends FilterCondition {
  'compiledPath'?: string[];
  'originalOperator'?: string;
  'type': string;
}

// Filter configuration interface
export interface FilterConfig {
  'cacheCompiled'?: boolean;
  'conditions': FilterCondition[];
  'detailedErrors'?: boolean;
  'enablePlugins'?: boolean;
  'gate': LogicGateFunction | string;
  'includeErrors'?: string | ErrorCollectionFunction;
  'maxDepth'?: number;
  'maxPathDepth'?: number;
  'mode': FilterModeFunction;
  'name'?: string;
  'plugins'?: PluginInstance[];
  // Will be Plugins instance
  'registry'?: unknown;
  'strict'?: boolean;
}

// Plugin instance type - must be a class instance implementing BasePlugin interface
export interface PluginInstance {
  'arrayLogic'?: Record<string, ArrayLogicFunction>;
  'comparators'?: Record<string, ComparatorFunction>;
  'gates'?: Record<string, LogicGateFunction>;
  getNamespace(): string;
  'operators'?: Record<string, OperatorFunction>;
}

// Evaluation result
export interface EvaluationResult {
  'errors': Error[];
  'valid': boolean;
}

// Batch evaluation result
export interface BatchEvaluationResult {
  'failed': FilterValue[];
  'passed': FilterValue[];
}

// Error details interfaces
export interface ErrorDetails {
  [key: string]: unknown;
}

// Registry interfaces
export interface RegistryItem<T> {
  'handler': T;
  'name': string;
  'namespace': string;
}

// Sentinel produced by getPathValue when a path resolves through an array wildcard
// segment (path[*]). Not a member of FilterValue: it carries the raw matched array
// and the remaining path segments still to be evaluated per-item, not filter data.
export interface ArrayWildcardValue {
  readonly 'array': readonly unknown[];
  readonly 'arrayWildcard': true;
  readonly 'fullPath': string;
  readonly 'remainingPath': readonly string[];
}

// Type guards
export function isFilterCondition(value: unknown): value is FilterCondition {
  return typeof value === 'object' && value !== null
    && ('path' in value || 'field' in value || 'conditions' in value || 'gate' in value);
}

export function isOperatorFunction(value: unknown): value is OperatorFunction {
  return typeof value === 'function' && value.length >= 1;
}

export function isLogicGateFunction(value: unknown): value is LogicGateFunction {
  return typeof value === 'function' && value.length === 1;
}

export function isFilterModeFunction(value: unknown): value is FilterModeFunction {
  return typeof value === 'function' && value.length === 1;
}

export function isFilterConditionArray(value: unknown): value is FilterCondition[] {
  return Array.isArray(value) && value.every(isFilterCondition);
}

export function isArrayWildcardValue(value: unknown): value is ArrayWildcardValue {
  return Guard.isRecord(value) && value.arrayWildcard === true;
}

export function isValidFilterConfig(config: unknown): config is FilterConfig {
  if (!config || typeof config !== 'object' || Array.isArray(config)) {
    return false;
  }

  const configObj = config as Record<string, unknown>;

  // Check required fields exist
  if (!('conditions' in configObj) || !('gate' in configObj) || !('mode' in configObj)) {
    return false;
  }

  // Validate conditions
  if (!isFilterConditionArray(configObj.conditions)) {
    return false;
  }

  // Validate gate - can be function or string reference
  if (!isLogicGateFunction(configObj.gate) && typeof configObj.gate !== 'string') {
    return false;
  }

  // Validate mode
  if (!isFilterModeFunction(configObj.mode)) {
    return false;
  }

  return true;
}

// Enum value types
export type LogicGateValue = LogicGateFunction;
export type OperatorValue = OperatorFunction;
export type FilterModeValue = FilterModeFunction;
export type ArrayLogicValue = ArrayLogicFunction;
export type ErrorCollectionModeValue = ErrorCollectionFunction;
