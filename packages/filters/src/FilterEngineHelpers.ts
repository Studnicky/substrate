/**
 * @module FilterEngineHelpers
 * @description Static helpers for FilterEngine construction, config validation, and
 * error-entry conversion; no engine instance state.
 */


import { Predicates } from '#runtime';

import type { FilterEvaluationErrorEntryInterface } from './FilterEvaluationErrorEntryInterface.js';
import type { FilterConditionInterface, FilterModeFunctionInterface } from './interfaces.js';
import type { ProcessedFilterErrorInterface } from './ProcessedFilterErrorInterface.js';
import type { Plugins } from './registries/index.js';

import { FilterMode } from './enums/FilterMode.js';
import { FilterConfigurationError } from './errors/FilterConfigurationError.js';
import { FilterGateError } from './errors/FilterGateError.js';

class FilterEngineHelpers {
  static getErrorCause(error: unknown): Error | undefined {
    const result = Predicates.isError(error) ? error : undefined;

    return result;
  }

  static readRangeBound(value: unknown, key: 'max' | 'min'): unknown {
    const result = Predicates.isRecord(value) ? value[key] : undefined;

    return result;
  }

  static clampDepth(value: number): number {
    const result = Math.min(100, Math.max(1, value));

    return result;
  }

  static throwInvalidConfigError(config: unknown): never {
    // Check for missing required fields
    if (config === null || config === undefined || typeof config !== 'object' || Array.isArray(config)) {
      throw new FilterConfigurationError(
        'Filter configuration must be an object with required fields: conditions, gate, mode',
        {
          'property': 'config',
          'value': config
        }
      );
    }

    const filterConfigValues = new Map<string, unknown>(Object.entries(config));

    FilterEngineHelpers.throwMissingConfigFieldError(filterConfigValues);
    FilterEngineHelpers.throwInvalidConfigFieldTypeError(filterConfigValues);

    // Generic fallback error
    throw new FilterConfigurationError(
      'Invalid FilterConfigInterface: conditions must be FilterConditionInterface[], gate must be a registry-key string, mode must be FilterModeFunctionInterface',
      {
        'property': 'config',
        'value': config
      }
    );
  }

  static throwMissingConfigFieldError(filterConfigValues: Map<string, unknown>): void {
    if (!filterConfigValues.has('conditions')) {
      throw new FilterConfigurationError(
        'Missing required field: conditions. Must be an array of FilterConditionInterface objects.',
        {
          'property': 'conditions',
          'value': undefined
        }
      );
    }

    if (!filterConfigValues.has('gate')) {
      throw new FilterConfigurationError(
        'Missing required field: gate. Must be a registry-key string reference (e.g., "CORE.AND").',
        {
          'property': 'gate',
          'value': undefined
        }
      );
    }

    if (!filterConfigValues.has('mode')) {
      throw new FilterConfigurationError(
        'Missing required field: mode. Must be a FilterModeFunctionInterface (e.g., Types.FilterMode.CORE.WHITELIST).',
        {
          'property': 'mode',
          'value': undefined
        }
      );
    }
  }

  static throwInvalidConfigFieldTypeError(filterConfigValues: Map<string, unknown>): void {
    // Check for invalid field types
    if (!Array.isArray(filterConfigValues.get('conditions'))) {
      throw new FilterConfigurationError(
        'Invalid field type: conditions must be an array of FilterConditionInterface objects.',
        {
          'property': 'conditions',
          'value': filterConfigValues.get('conditions')
        }
      );
    }

    if (typeof filterConfigValues.get('gate') !== 'string') {
      throw new FilterConfigurationError(
        'Invalid field type: gate must be a registry-key string reference (e.g., "CORE.AND" or "plugin:gateName").',
        {
          'property': 'gate',
          'value': filterConfigValues.get('gate')
        }
      );
    }

    if (typeof filterConfigValues.get('mode') !== 'function') {
      throw new FilterConfigurationError(
        'Invalid field type: mode must be a FilterModeFunctionInterface (e.g., Types.FilterMode.CORE.WHITELIST).',
        {
          'property': 'mode',
          'value': filterConfigValues.get('mode')
        }
      );
    }
  }

  static resolveMode(mode: FilterModeFunctionInterface | null | undefined): FilterModeFunctionInterface {
    if (mode === null || mode === undefined) {
      throw new FilterConfigurationError(
        'Filter mode is required. Must be one of: FilterMode.CORE.WHITELIST, FilterMode.CORE.BLACKLIST',
        {
          'property': 'mode',
          'value': mode
        }
      );
    }

    const filterModeValues = Object.values(FilterMode.CORE);

    if (!filterModeValues.includes(mode)) {
      const modesList = Object.keys(FilterMode.CORE).join(', ');

      throw new FilterConfigurationError(
        `Invalid filter mode: ${typeof mode}. Must be one of: ${modesList}`,
        {
          'property': 'mode',
          'value': mode
        }
      );
    }

    return mode;
  }

  static resolveGate(gate: string, registry: Plugins): string {
    // Validate gate exists in the registry; resolved to a function per-use in #evaluateConditions
    if (!registry.gates.has(gate)) {
      // Get list of valid gates for error message
      const validGates = Array.from(registry.gates.keys()).toSorted();

      throw new FilterGateError(
        `Unknown gate: ${gate}. Gate must be a registered string.`,
        {
          'gate': gate,
          'validGates': validGates
        }
      );
    }

    return gate;
  }

  static resolveConditions(options: { 'conditions'?: FilterConditionInterface[] | null, 'gate'?: string }): FilterConditionInterface[] {
    const { conditions, gate } = options;

    // Special validation for specific error cases the tests expect
    // Only throw if gate is specified but conditions property is missing/null
    if (gate !== undefined && (conditions === undefined || conditions === null)) {
      throw new FilterConfigurationError(
        'Gate specified without conditions. Provide conditions or remove gate.',
        {
          'gate': gate,
          'property': 'conditions'
        }
      );
    }

    if (conditions === null || conditions === undefined) {
      return [];
    }

    if (!Array.isArray(conditions)) {
      throw new FilterConfigurationError(
        'Conditions must be an array',
        {
          'expectedType': 'array',
          'property': 'conditions',
          'value': conditions
        }
      );
    }

    return conditions;
  }

  // Sentinel-value formatting; `null` means `value` isn't one of these special cases.
  static formatSentinelValue(value: unknown): string | null {
    if (value === null) {
      return 'null';
    }
    if (value === undefined) {
      return '(no value)';
    }
    if (value === '') {
      return '(empty string)';
    }

    return null;
  }

  static formatNumberValue(value: number): string {
    if (Object.is(value, -0)) {
      return '-0';
    }
    if (Number.isNaN(value)) {
      return 'NaN';
    }
    if (value === Infinity) {
      return 'Infinity';
    }
    if (value === -Infinity) {
      return '-Infinity';
    }

    const result = String(value);

    return result;
  }

  static formatObjectValue(value: object, maximumLength: number): string {
    const keys = Object.keys(value);

    if (keys.length === 0) {
      return '{}';
    }
    if (keys.length > 5) {
      return `{Object(${keys.length} keys)}`;
    }

    try {
      const serialized = JSON.stringify(value, null, 0);

      if (serialized.length > maximumLength) {
        return `{Object(${keys.length} keys)}`;
      }

      return serialized;
    } catch {
      return `{Object(${keys.length} keys)}`;
    }
  }

  static toProcessedError(error: FilterEvaluationErrorEntryInterface): ProcessedFilterErrorInterface {
    let field = 'root';

    if (error.field !== undefined && error.field !== '') {
      field = error.field;
    } else if (error.path !== undefined && error.path !== '') {
      field = error.path;
    }

    const source = error.operatorSource !== undefined && error.operatorSource !== ''
      ? error.operatorSource
      : 'unknown';

    const processedError: ProcessedFilterErrorInterface = {
      'field': field,
      'message': error.message,
      'operator': error.operator,
      'source': source,
      'value': error.actual
    };

    // Add params if there are relevant parameters
    if (error.expected !== undefined) {
      processedError.parameters = { 'expected': error.expected };
    }

    return processedError;
  }
}

export { FilterEngineHelpers };
