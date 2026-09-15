/**
 * Core type definitions for the FilterEngine
 */

import type { RuntimeValue } from '@studnicky/types/node';

import { JsonValue, Predicates } from '@studnicky/types/node';

import { FILTER_CONDITION_MEMBER_NAMES } from './constants/FILTER_CONDITION_MEMBER_NAMES.js';
import { FilterValueEntity } from './FilterValueEntity.js';
import { GroupGateNamesEntity } from './GroupGateNamesEntity.js';
// Operator function signature - options carries the compiled condition and evaluation data
export interface OperatorFunctionInterface {
  (
    value: ReturnType<typeof RuntimeValue.intake>,
    filterValue: FilterValueEntity.Type,
    options?: {
      'condition'?: FilterConditionInterface;
      'data'?: unknown;
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
  (value: ReturnType<typeof RuntimeValue.intake>, filterValue: FilterValueEntity.Type, condition?: FilterConditionInterface): boolean;
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
    if (!Predicates.isPlainObject(value) || value.arrayWildcard !== true) {
      return false;
    }

    const result = Predicates.isArray(value.array)
      && Predicates.isString(value.fullPath)
      && FilterTypeGuards.isStringArray(value.remainingPath);

    return result;
  }

  static isFilterCondition<T>(value: T): value is FilterConditionInterface & T {
    const result = FilterTypeGuards.isFilterConditionRecord(value, new Set<object>());

    return result;
  }

  static isFilterConditionArray(value: unknown): value is FilterConditionInterface[] {
    if (!Predicates.isArray(value)) {
      return false;
    }

    const ancestors = new Set<object>();
    const length = value.length;
    for (let index = 0; index < length; index += 1) {
      const item = value[index];
      if (!FilterTypeGuards.isFilterConditionRecord(item, ancestors)) {
        return false;
      }
    }

    return true;
  }

  static isFilterModeFunction(value: unknown): value is FilterModeFunctionInterface {
    const result = Predicates.isFunction(value);

    return result;
  }

  static isValidFilterConfig<T>(config: T): config is FilterConfigInterface & T {
    if (!Predicates.isPlainObject(config)
      || !Object.hasOwn(config, 'conditions')
      || !Object.hasOwn(config, 'gate')
      || !Object.hasOwn(config, 'mode')) {
      return false;
    }

    const conditions = Reflect.get(config, 'conditions');
    const gate = Reflect.get(config, 'gate');
    const mode = Reflect.get(config, 'mode');
    if (!FilterTypeGuards.isFilterConditionArray(conditions)
      || !Predicates.isString(gate)
      || !FilterTypeGuards.isFilterModeFunction(mode)) {
      return false;
    }

    const result = FilterTypeGuards.hasOptionalBooleanMembers(config, [
      'cacheCompiled',
      'detailedErrors',
      'enablePlugins',
      'strict'
    ])
      && FilterTypeGuards.hasOptionalStringMembers(config, ['includeErrors', 'name'])
      && FilterTypeGuards.hasOptionalNumberMembers(config, ['maximumDepth', 'maximumPathDepth'])
      && FilterTypeGuards.hasOptionalPlugins(config);

    return result;
  }

  private static hasOptionalBooleanMembers(record: Record<string, unknown>, memberNames: readonly string[]): boolean {
    const memberCount = memberNames.length;
    for (let index = 0; index < memberCount; index += 1) {
      const memberName = memberNames[index];
      if (memberName !== undefined && Object.hasOwn(record, memberName) && !Predicates.isBoolean(Reflect.get(record, memberName))) {
        return false;
      }
    }

    return true;
  }

  private static hasOptionalNumberMembers(record: Record<string, unknown>, memberNames: readonly string[]): boolean {
    const memberCount = memberNames.length;
    for (let index = 0; index < memberCount; index += 1) {
      const memberName = memberNames[index];
      if (memberName !== undefined && Object.hasOwn(record, memberName) && !Predicates.isNumber(Reflect.get(record, memberName))) {
        return false;
      }
    }

    return true;
  }

  private static hasOptionalStringMembers(record: Record<string, unknown>, memberNames: readonly string[]): boolean {
    const memberCount = memberNames.length;
    for (let index = 0; index < memberCount; index += 1) {
      const memberName = memberNames[index];
      if (memberName !== undefined && Object.hasOwn(record, memberName) && !Predicates.isString(Reflect.get(record, memberName))) {
        return false;
      }
    }

    return true;
  }

  private static hasOptionalPlugins(record: Record<string, unknown>): boolean {
    if (!Object.hasOwn(record, 'plugins')) {
      return true;
    }

    const plugins = Reflect.get(record, 'plugins');
    if (!Predicates.isArray(plugins)) {
      return false;
    }

    const length = plugins.length;
    for (let index = 0; index < length; index += 1) {
      const plugin = plugins[index];
      if (!Predicates.isObject(plugin) || !FilterTypeGuards.isPluginInstance(plugin)) {
        return false;
      }
    }

    return true;
  }

  private static isFilterConditionRecord(value: unknown, ancestors: Set<object>): boolean {
    if (!Predicates.isPlainObject(value) || ancestors.has(value)) {
      return false;
    }

    ancestors.add(value);
    const result = FilterTypeGuards.hasFilterConditionSelector(value)
      && FilterTypeGuards.hasOptionalStringMembers(value, FILTER_CONDITION_MEMBER_NAMES.string)
      && FilterTypeGuards.hasOptionalBooleanMembers(value, FILTER_CONDITION_MEMBER_NAMES.boolean)
      && FilterTypeGuards.hasOptionalNumberMembers(value, FILTER_CONDITION_MEMBER_NAMES.number)
      && FilterTypeGuards.hasOptionalFilterConditionMembers(value, ancestors);
    ancestors.delete(value);

    return result;
  }

  private static hasFilterConditionSelector(record: Record<string, unknown>): boolean {
    const result = Object.hasOwn(record, 'path')
      || Object.hasOwn(record, 'field')
      || Object.hasOwn(record, 'conditions')
      || Object.hasOwn(record, 'gate');

    return result;
  }

  private static hasOptionalFilterConditionMembers(record: Record<string, unknown>, ancestors: Set<object>): boolean {
    if (Object.hasOwn(record, 'compiledPath') && !FilterTypeGuards.isStringArray(Reflect.get(record, 'compiledPath'))) {
      return false;
    }
    if (Object.hasOwn(record, 'conditions') && !FilterTypeGuards.isFilterConditionArrayWithAncestors(Reflect.get(record, 'conditions'), ancestors)) {
      return false;
    }
    if (Object.hasOwn(record, 'filterValue') && !FilterTypeGuards.isFilterValue(Reflect.get(record, 'filterValue'))) {
      return false;
    }
    if (Object.hasOwn(record, 'groupGates') && !FilterTypeGuards.isGroupGateNames(Reflect.get(record, 'groupGates'))) {
      return false;
    }
    if (Object.hasOwn(record, 'numericValue') && !FilterTypeGuards.isNumericValue(Reflect.get(record, 'numericValue'))) {
      return false;
    }
    if (Object.hasOwn(record, 'options') && !Predicates.isPlainObject(Reflect.get(record, 'options'))) {
      return false;
    }
    if (Object.hasOwn(record, 'value') && !FilterTypeGuards.isFilterValue(Reflect.get(record, 'value'))) {
      return false;
    }

    return true;
  }

  private static isFilterConditionArrayWithAncestors(value: unknown, ancestors: Set<object>): boolean {
    if (!Predicates.isArray(value)) {
      return false;
    }

    const length = value.length;
    for (let index = 0; index < length; index += 1) {
      const item = value[index];
      if (!FilterTypeGuards.isFilterConditionRecord(item, ancestors)) {
        return false;
      }
    }

    return true;
  }

  private static isFilterValue(value: unknown): boolean {
    const result = JsonValue.is(value) && FilterValueEntity.validate(value);

    return result;
  }

  private static isGroupGateNames(value: unknown): boolean {
    const result = JsonValue.is(value) && GroupGateNamesEntity.validate(value);

    return result;
  }

  private static isNumericValue(value: unknown): boolean {
    const result = Predicates.isNumber(value) || typeof value === 'bigint';

    return result;
  }

  private static isPluginInstance(value: Record<string, unknown>): boolean {
    if (!Predicates.isFunction(Reflect.get(value, 'getNamespace'))) {
      return false;
    }

    const result = FilterTypeGuards.hasOptionalFunctionMap(value, 'arrayLogic')
      && FilterTypeGuards.hasOptionalFunctionMap(value, 'comparators')
      && FilterTypeGuards.hasOptionalFunctionMap(value, 'gates')
      && FilterTypeGuards.hasOptionalFunctionMap(value, 'operators');

    return result;
  }

  private static hasOptionalFunctionMap(record: Record<string, unknown>, memberName: string): boolean {
    if (!Object.hasOwn(record, memberName)) {
      return true;
    }

    const functionMap = Reflect.get(record, memberName);
    if (functionMap === undefined) {
      return true;
    }
    if (!Predicates.isPlainObject(functionMap)) {
      return false;
    }

    const functions = Object.values(functionMap);
    const length = functions.length;
    for (let index = 0; index < length; index += 1) {
      if (!Predicates.isFunction(functions[index])) {
        return false;
      }
    }

    return true;
  }

  private static isStringArray(value: unknown): value is readonly string[] {
    if (!Predicates.isArray(value)) {
      return false;
    }

    const length = value.length;
    for (let index = 0; index < length; index += 1) {
      if (!Predicates.isString(value[index])) {
        return false;
      }
    }

    return true;
  }
}
