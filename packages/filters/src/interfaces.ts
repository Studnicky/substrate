/**
 * Core type definitions for the FilterEngine
 */

import { Predicates } from '@studnicky/types';

import type { FilterValueEntity } from './FilterValueEntity.js';
import type { GroupGateNamesEntity } from './GroupGateNamesEntity.js';

// Operator function signature - options carries the compiled condition and evaluation data
export interface OperatorFunctionInterface {
  (
    value: FilterValueEntity.Type,
    filterValue: FilterValueEntity.Type,
    options?: {
      'condition'?: FilterConditionInterface;
      'data'?: FilterValueEntity.Type;
    }
  ): boolean;
}

// Logic gate function signature
export interface LogicGateFunctionInterface {
  (results: boolean[]): boolean;
}

// Filter mode function signature
export interface FilterModeFunctionInterface {
  (result: boolean): boolean;
}

// Array logic function signature
export interface ArrayLogicFunctionInterface {
  (results: boolean[]): boolean;
}

// Comparator function signature
export interface ComparatorFunctionInterface {
  (value: FilterValueEntity.Type, filterValue: FilterValueEntity.Type, condition?: FilterConditionInterface): boolean;
}

// Range interfaces for BETWEEN/OUTSIDE operators
export interface NumericRangeInterface {
  readonly 'inclusive'?: boolean;
  readonly 'maximum': number;
  readonly 'minimum': number;
}

export interface DateRangeInterface {
  readonly 'inclusive'?: boolean;
  readonly 'maximum': string | Date | number;
  readonly 'minimum': string | Date | number;
}

export interface TimeRangeInterface {
  readonly 'inclusive'?: boolean;
  readonly 'maximum': string;
  readonly 'minimum': string;
}

// Generic range interface
export interface RangeInterface<T = number | string | Date> {
  readonly 'inclusive'?: boolean;
  readonly 'maximum': T;
  readonly 'minimum': T;
}

// Filter condition interface
export interface FilterConditionInterface {
  // Allow indexing with strings for dynamic property access. Typed unknown, not
  // FilterConditionValue, so it can coexist with named properties (options, input)
  // whose own values are broader than that union — narrower named properties remain
  // fully typed; this only governs undeclared dynamic keys.
  [key: string]: unknown;
  // Registry-key string; resolved against the active Plugins registry at evaluation
  // time. Register a custom function under a name first, then reference it here.
  'arrayLogic'?: string;
  'arrayPath'?: string;

  'caseSensitive'?: boolean;

  readonly 'compiledPath'?: readonly string[];
  // Nested conditions
  'conditions'?: FilterConditionInterface[];

  'decimalPrecision'?: number;

  'field'?: string;

  'filterValue'?: FilterValueEntity.Type;
  // Logic gate for nested conditions — registry-key string (e.g. 'CORE.AND')
  'gate'?: string;
  // One array-logic registry-key (EVERY/SOME/NONE/ONE, or a custom registered name)
  // per array wildcard segment ([*]) in the path
  'groupGates'?: GroupGateNamesEntity.Type;
  'inclusive'?: boolean;
  // Metadata
  'index'?: number;
  // This remains unknown as it's truly external input
  'input'?: unknown;
  'lowerValue'?: string;
  'maximumValue'?: number;
  'minimumValue'?: number;
  // Additional options
  'negate'?: boolean;
  'numericValue'?: number | bigint;
  // Operator to apply — registry-key string
  'operator'?: string;

  // Plugin configuration - field-level options that override plugin defaults
  'options'?: Record<string, unknown>;

  // Field/path to evaluate
  'path'?: string;
  'pathway'?: string;
  'phase'?: string;

  'rowGate'?: string;
  'threshold'?: number;
  // Compiled properties
  'type'?: string;

  // Value to compare against
  'value'?: FilterValueEntity.Type;
}

// Compiled condition interface
export interface CompiledConditionInterface extends FilterConditionInterface {
  readonly 'compiledPath'?: readonly string[];
  'originalOperator'?: string;
  'type': string;
}

// Filter configuration interface
export interface FilterConfigInterface {
  'cacheCompiled'?: boolean;
  'conditions': FilterConditionInterface[];
  'detailedErrors'?: boolean;
  'enablePlugins'?: boolean;
  // Registry-key string (e.g. 'CORE.AND')
  'gate': string;
  'includeErrors'?: string;
  'maximumDepth'?: number;
  'maximumPathDepth'?: number;
  'mode': FilterModeFunctionInterface;
  'name'?: string;
  'plugins'?: PluginInstanceInterface[];
  // Will be Plugins instance
  'registry'?: unknown;
  'strict'?: boolean;
}

// Plugin instance type - must be a class instance implementing BasePlugin interface
export interface PluginInstanceInterface {
  'arrayLogic'?: Record<string, ArrayLogicFunctionInterface>;
  'comparators'?: Record<string, ComparatorFunctionInterface>;
  'gates'?: Record<string, LogicGateFunctionInterface>;
  getNamespace(): string;
  'operators'?: Record<string, OperatorFunctionInterface>;
}

// Evaluation result
export interface EvaluationResultInterface {
  'errors': Error[];
  'valid': boolean;
}

// Error details interfaces
export interface ErrorDetailsInterface {
  [key: string]: unknown;
}

// Registry interfaces
export interface RegistryItemInterface<T> {
  readonly 'handler': T;
  readonly 'name': string;
  readonly 'namespace': string;
}

// Sentinel produced by getPathValue when a path resolves through an array wildcard
// segment (path[*]). Not a member of FilterValueEntity.Type: it carries the raw matched array
// and the remaining path segments still to be evaluated per-item, not filter data.
export interface ArrayWildcardValueInterface {
  readonly 'array': readonly unknown[];
  readonly 'arrayWildcard': boolean;
  readonly 'fullPath': string;
  readonly 'remainingPath': readonly string[];
}

// Type guards
export class FilterTypeGuards {
  static isArrayWildcardValue<T>(value: T): value is ArrayWildcardValueInterface & T {
    const result = Predicates.isRecord(value) && value.arrayWildcard === true;

    return result;
  }

  static isFilterCondition<T>(value: T): value is FilterConditionInterface & T {
    const result = Predicates.isRecord(value)
      && ('path' in value || 'field' in value || 'conditions' in value || 'gate' in value);

    return result;
  }

  static isFilterConditionArray(value: unknown): value is FilterConditionInterface[] {
    const result = Array.isArray(value) && value.every((item) => {
      const itemResult = FilterTypeGuards.isFilterCondition(item);

      return itemResult;
    });

    return result;
  }

  static isFilterModeFunction(value: unknown): value is FilterModeFunctionInterface {
    const result = typeof value === 'function' && value.length === 1;

    return result;
  }

  static isValidFilterConfig<T>(config: T): config is FilterConfigInterface & T {
    if (!Predicates.isRecord(config) || Array.isArray(config)) {
      return false;
    }

    const filterConfigRecord = config;

    // Check required fields exist
    if (!('conditions' in filterConfigRecord) || !('gate' in filterConfigRecord) || !('mode' in filterConfigRecord)) {
      return false;
    }

    // Validate conditions
    if (!FilterTypeGuards.isFilterConditionArray(filterConfigRecord.conditions)) {
      return false;
    }

    // Validate gate - registry-key string reference
    if (typeof filterConfigRecord.gate !== 'string') {
      return false;
    }

    // Validate mode
    if (!FilterTypeGuards.isFilterModeFunction(filterConfigRecord.mode)) {
      return false;
    }

    return true;
  }
}
