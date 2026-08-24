/**
 * @module FilterEngine
 * @description Core filtering engine with support for recursive conditionals,
 * logical operators, and nested groupings
 */

import type {
  ArrayLogicFunction,
  ArrayWildcardValue,
  ErrorCollectionFunction,
  FilterCondition,
  FilterConfig,
  FilterModeFunction,
  FilterValue,
  LogicGateFunction,
  OperatorFunction
} from './types.js';

import { Guard } from '../guards/Guard.js';
import { DefaultConfig } from './config/DefaultConfig.js';
import { ConditionType } from './enums/ConditionType.js';
import { ErrorCollectionMode } from './enums/ErrorCollectionMode.js';
import { FilterMode } from './enums/FilterMode.js';
import { LogicGate } from './enums/LogicGate.js';
import { PropertyName } from './enums/PropertyName.js';
import { FilterConfigurationError } from './errors/FilterConfigurationError.js';
import { FilterGateError } from './errors/FilterGateError.js';
import { FilterOperatorError } from './errors/FilterOperatorError.js';
import { FilterValueEntity } from './FilterValueEntity.js';
import { ArrayLogic } from './logic/ArrayLogic.js';
import { NumericOperators } from './operators/NumericOperators.js';
import { Plugins } from './registries/index.js';
import { isArrayWildcardValue, isValidFilterConfig } from './types.js';
import { GetPathValue } from './utils/getPathValue.js';
import { ValidatePath } from './utils/validatePath.js';

// Config-like shape accepted by #validateConfiguration - both the root FilterConfig
// and a nested FilterCondition (which reuses gate/conditions for sub-groups) satisfy it
interface ValidatableConfig {
  'conditions'?: FilterCondition[];
  'gate'?: string | LogicGateFunction;
  'mode'?: FilterModeFunction;
}

// Entry collected in the errors array while evaluating with error reporting enabled
interface FilterEvaluationErrorEntry {
  'actual'?: unknown;
  'expected'?: unknown;
  'field'?: string;
  'gate'?: string;
  'message': string;
  'negate'?: boolean;
  'operator'?: unknown;
  'operatorSource'?: string;
  'path'?: string;
}

// Validator-like shape returned from evaluate()
interface ProcessedFilterError {
  'field': string;
  'message': string;
  'operator': unknown;
  'params'?: { 'expected': unknown };
  'source': string;
  'value': unknown;
}

function getErrorMessage(error: unknown): string {
  return Guard.isError(error) ? error.message : String(error);
}

function getErrorCause(error: unknown): Error | undefined {
  return Guard.isError(error) ? error : undefined;
}

function readRangeBound(value: FilterValue, key: 'min' | 'max'): unknown {
  return Guard.isRecord(value) ? value[key] : undefined;
}

/**
 * Filter engine that evaluates conditions against data with support for
 * recursive conditionals, logical operators, and nested groupings
 */
class FilterEngine {
  private compiledConditions: FilterCondition[];
  private conditions: FilterCondition[];
  private gate: string | LogicGateFunction;
  private includeErrors: string | ErrorCollectionFunction;
  private maxDepth: number;
  private maxPathDepth: number;
  private mode: FilterModeFunction;
  private registry: Plugins;

  /**
   * Creates a new FilterEngine instance
   */
  constructor(config: FilterConfig) {
    // Strict runtime validation of configuration
    if (!isValidFilterConfig(config)) {
      const configObj = config as Record<string, unknown>;

      // Check for missing required fields
      if (!config || typeof config !== 'object' || Array.isArray(config)) {
        throw new FilterConfigurationError(
          'Filter configuration must be an object with required fields: conditions, gate, mode',
          {
            'property': 'config',
            'value': config
          }
        );
      }

      if (!('conditions' in configObj)) {
        throw new FilterConfigurationError(
          'Missing required field: conditions. Must be an array of FilterCondition objects.',
          {
            'property': 'conditions',
            'value': undefined
          }
        );
      }

      if (!('gate' in configObj)) {
        throw new FilterConfigurationError(
          'Missing required field: gate. Must be a LogicGateFunction (e.g., Types.LogicGate.CORE.AND).',
          {
            'property': 'gate',
            'value': undefined
          }
        );
      }

      if (!('mode' in configObj)) {
        throw new FilterConfigurationError(
          'Missing required field: mode. Must be a FilterModeFunction (e.g., Types.FilterMode.CORE.WHITELIST).',
          {
            'property': 'mode',
            'value': undefined
          }
        );
      }

      // Check for invalid field types
      if (!Array.isArray(configObj.conditions)) {
        throw new FilterConfigurationError(
          'Invalid field type: conditions must be an array of FilterCondition objects.',
          {
            'property': 'conditions',
            'value': configObj.conditions
          }
        );
      }

      if (typeof configObj.gate !== 'function' && typeof configObj.gate !== 'string') {
        throw new FilterConfigurationError(
          'Invalid field type: gate must be a LogicGateFunction or string reference (e.g., Types.LogicGate.CORE.AND or "plugin:gateName").',
          {
            'property': 'gate',
            'value': configObj.gate
          }
        );
      }

      if (typeof configObj.mode !== 'function') {
        throw new FilterConfigurationError(
          'Invalid field type: mode must be a FilterModeFunction (e.g., Types.FilterMode.CORE.WHITELIST).',
          {
            'property': 'mode',
            'value': configObj.mode
          }
        );
      }

      // Generic fallback error
      throw new FilterConfigurationError(
        'Invalid FilterConfig: conditions must be FilterCondition[], gate must be LogicGateFunction, mode must be FilterModeFunction',
        {
          'property': 'config',
          'value': config
        }
      );
    }

    // Merge with defaults
    const normalizedConfig = {
      ...DefaultConfig,
      ...config
    };

    // Set maximum nesting depth (default from config, min 1, max 100)
    const maxDepthOption = normalizedConfig.maxDepth;
    const clampedMaxDepth = Math.max(1, maxDepthOption);

    // Set maximum path depth for property access (default from config, min 1, max 100)

    this.maxDepth = Math.min(100, clampedMaxDepth);
    const maxPathDepthOption = normalizedConfig.maxPathDepth;
    const clampedMaxPathDepth = Math.max(1, maxPathDepthOption);

    // Validate and set filter mode (REQUIRED - no default)

    this.maxPathDepth = Math.min(100, clampedMaxPathDepth);

    // Mode is required in config
    const mode = normalizedConfig.mode;

    if (!mode) {
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

    // Set up plugin registry with class instances only
    this.mode = mode;
    this.registry = normalizedConfig.registry instanceof Plugins
      ? normalizedConfig.registry
      : new Plugins({ 'plugins': normalizedConfig.plugins || [] });

    // Initialize all properties first for V8 optimization (maintaining hidden classes)
    this.includeErrors = normalizedConfig.includeErrors;

    // Resolve gate - could be a function or string reference
    if (typeof normalizedConfig.gate === 'string') {
      const gateFunction = this.registry.gates.get(normalizedConfig.gate);

      if (!gateFunction) {
        // Get list of valid gates for error message
        const validGates = Array.from(this.registry.gates.keys()).toSorted();

        throw new FilterGateError(
          `Unknown gate: ${normalizedConfig.gate}. Gate must be a function or registered string.`,
          {
            'gate': normalizedConfig.gate,
            'validGates': validGates
          }
        );
      }
      this.gate = gateFunction;
    } else {
      this.gate = normalizedConfig.gate!;
    }

    this.conditions = [];
    // Get conditions from configuration
    this.compiledConditions = [];
    // Determine conditions value unconditionally for V8 optimization (maintaining hidden classes)
    const conditions = normalizedConfig.conditions;
    let finalConditions: FilterCondition[];

    // Strict validation: conditions must be an array or a nested config object
    if (conditions !== null && conditions !== undefined) {
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
      finalConditions = conditions;
    } else {
      finalConditions = [];
    }
    // Single assignment to maintain hidden class
    this.conditions = finalConditions;

    // Special validation for specific error cases the tests expect
    // Only throw if gate is specified but conditions property is missing/null
    if (normalizedConfig.gate !== undefined
        && (normalizedConfig.conditions === undefined || normalizedConfig.conditions === null)) {
      throw new FilterConfigurationError(
        'Gate specified without conditions. Provide conditions or remove gate.',
        {
          'gate': normalizedConfig.gate,
          'property': 'conditions'
        }
      );
    }

    if (this.#hasEmptyConditions()) {
      return;
    }

    // Validate configuration if we have conditions
    if (this.conditions.length > 0) {
      this.#validateConfiguration(normalizedConfig);

      // Also validate nested conditions
      const conditionsLength = this.conditions.length;

      for (let i = 0; i < conditionsLength; i++) {
        const nestedCondition = this.conditions[i];

        // Nested conditions must have gate and conditions (mode is inherited)
        if (nestedCondition !== undefined && (nestedCondition.gate !== undefined || nestedCondition.conditions !== undefined)) {
          this.#validateConfiguration(nestedCondition, 1);
        }
      }
    }


    this.compiledConditions = this.#compileConditions(this.conditions);
  }


  /**
   * Applies array logic operation to a set of boolean results
   * @param {Array<boolean>} results - Array of boolean results
   * @param {string} logic - Array logic operation (EVERY, SOME, ONE, NONE)
   * @returns {boolean} Result of applying logic operation
   */
  #applyArrayLogic(results: boolean[], logic: string | ArrayLogicFunction): boolean {
    // Check for custom arrayLogic function in plugin registry first
    if (typeof logic === 'string') {
      const customLogic = this.registry.arrayLogic.get(logic);

      if (customLogic) {
        return customLogic(results);
      }
    }

    // Fall back to built-in array logic
    return ArrayLogic.applyLogic(results, logic);
  }

  /**
   * Applies operators to array elements using wildcard syntax (path[*])
   * @param {Object} wildcardValue - Object with array and remaining path
   * @param {string} operator - Data operator to apply
   * @param {*} filterValue - Value to compare against
   * @param {Object} condition - Compiled condition configuration
   * @param {number} wildcardLevel - Current wildcard nesting level (default 0)
   * @returns {boolean} Result of wildcard operation
   */
  #applyArrayWildcard(
    wildcardValue: ArrayWildcardValue,
    operator: string | OperatorFunction,
    filterValue: FilterValue,
    condition: FilterCondition,
    wildcardLevel = 0,
    data: FilterValue = null
  ): boolean {
    const {
      array, remainingPath
    } = wildcardValue;
    const nestedConditions = condition[PropertyName.CORE.CONDITIONS];

    if (nestedConditions && nestedConditions.length > 0) {
      const results: boolean[] = [];
      const arrayLength = array.length;

      for (let i = 0; i < arrayLength; i++) {
        results.push(this.#evaluateConditions(
          FilterValueEntity.intake(array[i]),
          nestedConditions,
          condition.rowGate || LogicGate.CORE.AND,
          '',
          null
        ));
      }

      // Get the appropriate groupGate for this wildcard level
      const groupGate = this.#getGroupGateForLevel(condition, wildcardLevel);
      const result = this.#applyArrayLogic(results, groupGate);

      return result;
    }

    const results: boolean[] = [];
    const remainingPathStr = remainingPath.length > 0
      ? remainingPath.join('.')
      : null;
    const arrayLength = array.length;

    for (let i = 0; i < arrayLength; i++) {
      const rawItem = array[i];
      const value = remainingPathStr
        ? GetPathValue.getPathValue(FilterValueEntity.intake(rawItem), remainingPathStr, this.maxPathDepth)
        : FilterValueEntity.intake(rawItem);

      // Pass the wildcard level to nested evaluations
      results.push(this.#applyOperatorWithLevel(value, operator, filterValue, condition, wildcardLevel, data));
    }

    // Get the appropriate groupGate for this wildcard level
    const groupGate = this.#getGroupGateForLevel(condition, wildcardLevel);
    const result = this.#applyArrayLogic(results, groupGate);

    return result;
  }

  /**
   * Applies a data operator to a value with the given filter conditions
   * @param {*} value - Value to evaluate
   * @param {string} operator - Data operator to apply
   * @param {*} filterValue - Value to compare against
   * @param {Object} condition - Compiled condition configuration
   * @returns {boolean} Result of operator evaluation
   */
  #applyOperator(
    value: FilterValue | ArrayWildcardValue,
    operator: string | OperatorFunction,
    filterValue: FilterValue,
    condition: FilterCondition,
    data: FilterValue = null
  ): boolean {
    if (isArrayWildcardValue(value)) {
      const result = this.#applyArrayWildcard(value, operator, filterValue, condition, 0, data);

      return result;
    }

    // Create context for plugin operators with field-level options
    const context: FilterCondition = {
      'condition': condition,
      'data': data || this,
      ...(condition.options !== undefined && { 'options': condition.options })
    };

    // Handle direct function references
    if (typeof operator === 'function') {
      const result = operator(value, filterValue, context);

      return result;
    }

    // Get operator handler - colon notation for plugins (PluginName:OPERATOR)
    const handler = this.registry.operators.get(operator);

    if (!handler) {
      // Get list of available operators for error message
      const availableOperators = Array.from(this.registry.operators.keys()).toSorted();

      throw new FilterOperatorError(
        `Unknown operator: ${operator}. Operator must be a function or registered string.`,
        {
          'availableOperators': availableOperators,
          'operator': operator
        }
      );
    }

    const result = handler(value, filterValue, context);

    return result;
  }

  /**
   * Applies an operator with wildcard level tracking
   * @private
   * @param {*} value - Value to evaluate
   * @param {string} operator - Data operator to apply
   * @param {*} filterValue - Value to compare against
   * @param {Object} condition - Compiled condition configuration
   * @param {number} wildcardLevel - Current wildcard nesting level
   * @returns {boolean} Result of operator evaluation
   */
  #applyOperatorWithLevel(
    value: FilterValue | ArrayWildcardValue,
    operator: string | OperatorFunction,
    filterValue: FilterValue,
    condition: FilterCondition,
    wildcardLevel: number,
    data: FilterValue = null
  ): boolean {
    if (isArrayWildcardValue(value)) {
      // Increment level for nested wildcards
      const result = this.#applyArrayWildcard(value, operator, filterValue, condition, wildcardLevel + 1, data);

      return result;
    }

    const operatorResult = this.#applyOperator(value, operator, filterValue, condition, data);

    return operatorResult;
  }

  /**
   * Compiles range values for BETWEEN and OUTSIDE operators
   * @param {Object} compiled - Compiled condition object
   * @param {Object} condition - Original condition
   */
  #compileBetweenRange(compiled: FilterCondition, condition: FilterCondition): void {
    const isBetweenOperator = typeof condition.operator === 'string'
      && (condition.operator.endsWith('.BETWEEN') || condition.operator.endsWith('.OUTSIDE'));
    const rangeValue = compiled.value;

    if (!isBetweenOperator || !Array.isArray(rangeValue) || rangeValue.length !== 2) {
      return;
    }

    const firstValue = Number(rangeValue[0]);
    const secondValue = Number(rangeValue[1]);

    compiled.minValue = firstValue < secondValue ? firstValue : secondValue;
    compiled.maxValue = firstValue > secondValue ? firstValue : secondValue;
  }

  /**
   * Compiles case-insensitive string values
   * @param {Object} compiled - Compiled condition object
   */
  #compileCaseInsensitiveValue(compiled: FilterCondition): void {
    if (!compiled.caseSensitive && typeof compiled.value === 'string') {
      compiled.lowerValue = compiled.value.toLowerCase();
    }
  }

  /**
   * Compiles a single condition for optimized evaluation
   * Pre-compiles regex patterns, numeric values, and case-insensitive strings
   * @param {Object} condition - Raw condition configuration
   * @returns {Object} Compiled condition with optimizations
   */
  #compileCondition(condition: FilterCondition): FilterCondition {
    if (condition[PropertyName.CORE.GATE] || condition[PropertyName.CORE.OPERATOR] === 'group') {
      const logicalCompiled: FilterCondition = {};

      logicalCompiled[PropertyName.CORE.CONDITIONS] = this.#compileConditions(condition[PropertyName.CORE.CONDITIONS] ?? []);

      logicalCompiled[PropertyName.CORE.GATE] = condition[PropertyName.CORE.GATE] || LogicGate.CORE.AND;

      logicalCompiled[PropertyName.CORE.NEGATE] = condition[PropertyName.CORE.NEGATE] || false;

      logicalCompiled[PropertyName.CORE.TYPE] = ConditionType.CORE.LOGICAL;

      return logicalCompiled;
    }

    const path = condition[PropertyName.CORE.PATH]
      || condition[PropertyName.CORE.FIELD]
      // Count wildcards in the path
      || condition[PropertyName.CORE.PATHWAY];

    // Validate path format - paths MUST be in dot notation
    if (path && !ValidatePath.validatePath(path)) {
      throw new FilterConfigurationError(
        `Invalid path format: "${path}". Paths must use dot notation (e.g., "user.profile.name" or "items[0].value")`,
        {
          'property': 'path',
          'value': path
        }
      );
    }

    // Count wildcards in the path
    const wildcardCount = path ? (path.match(/\[\*\]/g) || []).length : 0;
    let groupGates: (string | ArrayLogicFunction)[] | undefined;

    if (wildcardCount > 0) {
      if (!condition.groupGates || !Array.isArray(condition.groupGates)) {
        throw new FilterConfigurationError(
          `Path "${path}" has ${wildcardCount} wildcard(s) but groupGates is not an array`,
          {
            'groupGates': condition.groupGates,
            'path': path,
            'wildcardCount': wildcardCount
          }
        );
      }
      if (condition.groupGates.length !== wildcardCount) {
        throw new FilterConfigurationError(
          `Path "${path}" has ${wildcardCount} wildcard(s) but groupGates array has ${condition.groupGates.length} entries`,
          {
            'groupGates': condition.groupGates,
            'path': path,
            'wildcardCount': wildcardCount
          }
        );
      }
      groupGates = condition.groupGates;
    }

    const compiled: FilterCondition = {
      ...(condition.caseSensitive !== undefined && { 'caseSensitive': condition.caseSensitive }),
      ...(condition.dataType !== undefined && { 'dataType': condition.dataType }),
      ...(condition.decimalPrecision !== undefined && { 'decimalPrecision': condition.decimalPrecision }),
      ...(condition.equals !== undefined && { 'equals': condition.equals }),
      ...(groupGates !== undefined && { 'groupGates': groupGates }),
      ...(condition.inclusive !== undefined && { 'inclusive': condition.inclusive }),
      'rowGate': condition.rowGate || LogicGate.CORE.AND
    // Set properties using direct assignment for V8 optimization
    };

    const rawNestedConditions = condition[PropertyName.CORE.CONDITIONS];

    if (rawNestedConditions) {
      compiled[PropertyName.CORE.CONDITIONS] = this.#compileConditions(rawNestedConditions);
    }
    compiled[PropertyName.CORE.NEGATE] = condition[PropertyName.CORE.NEGATE] || false;

    const rawOperator = condition[PropertyName.CORE.OPERATOR];

    if (rawOperator !== undefined) {
      compiled[PropertyName.CORE.OPERATOR] = rawOperator;
    }
    if (path !== undefined) {
      compiled[PropertyName.CORE.PATH] = path;
    }

    const rawThreshold = condition[PropertyName.CORE.THRESHOLD];

    if (rawThreshold !== undefined) {
      compiled[PropertyName.CORE.THRESHOLD] = rawThreshold;
    }
    compiled[PropertyName.CORE.TYPE] = ConditionType.CORE.FIELD;

    const rawValue = condition[PropertyName.CORE.VALUE] !== undefined
      ? condition[PropertyName.CORE.VALUE]
      : rawThreshold;

    if (rawValue !== undefined) {
      compiled[PropertyName.CORE.VALUE] = rawValue;
    }

    this.#compileRegexPattern(compiled, condition);
    this.#compileCaseInsensitiveValue(compiled);
    this.#compileNumericValues(compiled, condition);
    this.#compileBetweenRange(compiled, condition);

    return compiled;
  }

  /**
   * Compiles an array of conditions for optimized evaluation
   * @param {Array} conditions - Array of raw conditions
   * @returns {Array} Array of compiled conditions
   */
  #compileConditions(conditions: FilterCondition[]): FilterCondition[] {
    const compiled: FilterCondition[] = [];
    const conditionsLength = conditions.length;

    for (let i = 0; i < conditionsLength; i++) {
      const condition = conditions[i];

      if (condition !== undefined) {
        compiled.push(this.#compileCondition(condition));
      }
    }

    return compiled;
  }

  /**
   * Compiles numeric values for numeric operators
   * @param {Object} compiled - Compiled condition object
   * @param {Object} condition - Original condition
   */
  #compileNumericValues(compiled: FilterCondition, condition: FilterCondition): void {
    const hasNumericOperator = typeof condition.operator === 'string' && NumericOperators.numericOperators.has(condition.operator);
    const hasValidValue = compiled.value !== null && compiled.value !== undefined;

    if (hasNumericOperator && hasValidValue) {
      // Preserve BigInt values to maintain precision
      if (typeof compiled.value === 'bigint') {
        compiled.numericValue = compiled.value;
      } else {
        compiled.numericValue = Number(compiled.value);
      }
    }
  }

  /**
   * Compiles regex patterns for MATCHES and REGEX operators
   * @param {Object} compiled - Compiled condition object
   * @param {Object} condition - Original condition
   */
  #compileRegexPattern(compiled: FilterCondition, condition: FilterCondition): void {
    const isRegexOperator = typeof condition.operator === 'string'
      && (condition.operator.endsWith('.MATCHES') || condition.operator.endsWith('.REGEX'));

    if (!isRegexOperator || !compiled.value) {
      return;
    }

    try {
      if (compiled.value instanceof RegExp) {
        compiled.compiledRegex = compiled.value;

        return;
      }

      let regexPattern: FilterValue = compiled.value;

      if (typeof condition.operator === 'string' && condition.operator.endsWith('.MATCHES') && typeof regexPattern === 'string') {
        regexPattern = this.#processMatchesPattern(regexPattern);
      }

      const regexSource = typeof regexPattern === 'string' ? regexPattern : String(regexPattern);

      // Add 'u' flag only when Unicode features are detected in the pattern
      const needsUnicodeFlag = this.#needsUnicodeFlag(regexSource);
      const flags = (compiled.caseSensitive ? '' : 'i') + (needsUnicodeFlag ? 'u' : '');

      compiled.compiledRegex = new RegExp(regexSource, flags);
    } catch {
      compiled.regexError = true;
      compiled.compiledRegex = null;
    }
  }

  /**
   * Evaluates an array of conditions using the specified logical gate
   * @param {*} data - Data to evaluate
   * @param {Array} conditions - Array of compiled conditions
   * @param {string} [gate=LogicGate.CORE.AND] - Logical gate to use
   * @param {string} [path=''] - Current path for error reporting
   * @param {Array} [errors=null] - Array to collect errors (optional)
   * @returns {boolean} Result of conditions evaluation
   */
  #evaluateConditions(
    data: FilterValue,
    conditions: FilterCondition[],
    gate: string | LogicGateFunction = LogicGate.CORE.AND,
    path = '',
    errors: FilterEvaluationErrorEntry[] | null = null
  ): boolean {
    if (conditions.length === 0) {
      return true;
    }

    const results: boolean[] = [];
    const conditionsLength = conditions.length;

    // Evaluate each condition
    for (let i = 0; i < conditionsLength; i++) {
      const condition = conditions[i];

      if (condition === undefined) {
        continue;
      }

      const conditionResult = errors
        ? this.#evaluateSingleConditionWithErrors(data, condition, errors, path)
        : this.#evaluateSingleCondition(data, condition);

      results.push(conditionResult);

      // Short-circuit based on error collection mode
      if (gate === LogicGate.CORE.AND && !conditionResult && this.includeErrors === ErrorCollectionMode.FIRST) {
        return false;
      }

      if (gate === LogicGate.CORE.OR && conditionResult && this.includeErrors === ErrorCollectionMode.FIRST) {
        return true;
      }
    }

    // Apply the logical gate - must be a function
    if (typeof gate !== 'function') {
      throw new Error(`Gate must be a function, got ${typeof gate}`);
    }

    try {
      return gate(results);
    } catch (error) {
      if (errors) {
        errors.push({
          'gate': 'function',
          'message': getErrorMessage(error) || 'Gate function error'
        });
      }

      return false;
    }
  }

  /**
   * Evaluates a single condition against data
   * @param {*} data - Data to evaluate
   * @param {Object} condition - Compiled condition
   * @returns {boolean} Result of condition evaluation
   */
  #evaluateSingleCondition(data: FilterValue, condition: FilterCondition): boolean {
    let result: boolean;

    if (condition[PropertyName.CORE.TYPE] === ConditionType.CORE.LOGICAL) {
      result = this.#evaluateConditions(data, condition[PropertyName.CORE.CONDITIONS] ?? [], condition[PropertyName.CORE.GATE], '', null);
    } else {
      const operator = condition[PropertyName.CORE.OPERATOR];

      if (operator === undefined) {
        throw new FilterOperatorError('Condition is missing an operator', {});
      }

      // Apply converter if specified, but not for array wildcards (handled in applyArrayWildcard)
      const value = GetPathValue.getPathValue(data, condition[PropertyName.CORE.PATH] ?? '', this.maxPathDepth);


      result = this.#applyOperator(
        value,
        operator,
        condition[PropertyName.CORE.VALUE],
        condition
      );
    }

    return condition[PropertyName.CORE.NEGATE] ? !result : result;
  }


  /**
   * Evaluates a single condition and collects error information
   * @private
   * @param {*} data - Data to evaluate
   * @param {Object} condition - Compiled condition
   * @param {Array} errors - Array to collect errors into
   * @param {string} [path=''] - Current path in the data structure
   * @returns {boolean} Result of condition evaluation
   */
  #evaluateSingleConditionWithErrors(
    data: FilterValue,
    condition: FilterCondition,
    errors: FilterEvaluationErrorEntry[],
    path = ''
  ): boolean {
    let result: boolean;

    if (condition[PropertyName.CORE.TYPE] === ConditionType.CORE.LOGICAL) {
      // For nested conditions, maintain the current path (don't add .conditions)
      result = this.#evaluateConditions(
        data,
        condition[PropertyName.CORE.CONDITIONS] ?? [],
        condition[PropertyName.CORE.GATE],
        path,
        errors
      );
    } else {
      const operator = condition[PropertyName.CORE.OPERATOR];

      if (operator === undefined) {
        throw new FilterOperatorError('Condition is missing an operator', {});
      }

      const fieldPath = condition[PropertyName.CORE.PATH] ?? '';
      // Apply converter if specified
      const value = GetPathValue.getPathValue(data, fieldPath, this.maxPathDepth);


      // If the condition failed, add error details
      let errorAdded = false;

      try {
        result = this.#applyOperator(
          value,
          operator,
          condition[PropertyName.CORE.VALUE],
          condition,
          data
        );
      } catch (error) {
        // Handle plugin operator errors gracefully
        result = false;
        // Always collect errors when errors array is provided
        if (errors) {
          // Get the string name for the operator
          const operatorName = typeof operator === 'function'
            ? this.registry.operators.findKeyByValue(operator) || 'UNKNOWN'
            : operator;
          const isBuiltIn = typeof operatorName === 'string' && this.registry.operators.isBuiltIn(operatorName);

          errors.push({
            'actual': value,
            'expected': condition[PropertyName.CORE.VALUE],
            'field': fieldPath,
            'message': getErrorMessage(error) || 'Operator error',
            'operator': operatorName,
            'operatorSource': isBuiltIn ? 'builtin' : 'plugin'
          });
          errorAdded = true;
        }
      }
      if (!result && !errorAdded && errors) {
        // The fieldPath is already the full path from the data root (e.g., "user.profile.email")
        // We only prepend 'path' if we're in a nested evaluation context (like array wildcards)
        const fullPath = path && !fieldPath.startsWith(path) ? `${path}.${fieldPath}` : fieldPath;

        // Get the string name for the operator
        const operatorName = typeof operator === 'function'
          ? this.registry.operators.findKeyByValue(operator) || 'UNKNOWN'
          : operator;
        const isBuiltIn = typeof operatorName === 'string' && this.registry.operators.isBuiltIn(operatorName);

        errors.push({
          'actual': value,
          'expected': condition[PropertyName.CORE.VALUE],
          // Use the full path as the field
          'field': fullPath,
          'message': this.#formatErrorMessage(condition, value),
          'negate': condition[PropertyName.CORE.NEGATE] || false,
          'operator': operatorName,
          'operatorSource': isBuiltIn ? 'builtin' : 'plugin',
          'path': fullPath
        });
      }
    }

    return condition[PropertyName.CORE.NEGATE] ? !result : result;
  }


  /**
   * Formats an error message for a failed condition
   * @private
   * @param {Object} condition - The condition that failed
   * @param {*} value - The actual value that failed
   * @returns {string} Formatted error message
   */
  #formatErrorMessage(condition: FilterCondition, value: FilterValue | ArrayWildcardValue): string {
    const operatorValue = condition[PropertyName.CORE.OPERATOR];
    const expected = condition[PropertyName.CORE.VALUE];
    const negate = condition[PropertyName.CORE.NEGATE] ? 'not ' : '';

    if (value === undefined) {
      return 'is required';
    }

    if (value === null) {
      return 'must not be null';
    }

    // Get operator name - if it's a function, find its registered name
    let operatorName: string | OperatorFunction | undefined;

    if (typeof operatorValue === 'function') {
      operatorName = this.registry.operators.findKeyByValue(operatorValue) || 'custom operator';
    } else {
      operatorName = operatorValue;
    }

    // Create human-readable error messages based on operator type
    if (typeof operatorName === 'string') {
      // Parse operator category and type
      const parts = operatorName.split('.');
      const [
        category,
        type
      ] = parts;

      if (parts.length === 2 && category !== undefined && type !== undefined) {
        return this.#formatOperatorMessage(category, type, expected, negate);
      }
    }

    // Default message for unknown operators
    return `failed ${negate}${String(operatorName)} validation (expected: ${this.#formatValue(expected)})`;
  }

  /**
   * Formats a human-readable error message based on operator type
   * @private
   * @param {string} category - The operator category (e.g., 'STRING', 'NUMBER')
   * @param {string} type - The operator type (e.g., 'EQUALS', 'GREATER')
   * @param {*} expected - The expected value
   * @param {string} negate - Negation prefix ('not ' or '')
   * @returns {string} Formatted error message
   */
  #formatOperatorMessage(category: string, type: string, expected: FilterValue, negate: string): string {
    const expectedStr = this.#formatValue(expected);

    switch (category) {
      case 'STRING':
        switch (type) {
          case 'CONTAINS': return `must ${negate}contain "${expected}"`;
          case 'EMPTY': return `must ${negate}be empty`;
          case 'ENDS_WITH': return `must ${negate}end with "${expected}"`;
          case 'EQUALS': return `must ${negate}equal "${expected}"`;
          case 'LENGTH': return `must have length ${negate}equal to ${expected}`;
          case 'NOT_EMPTY': return `must ${negate}be non-empty`;
          case 'REGEX': return `must ${negate}match pattern ${expectedStr}`;
          case 'STARTS_WITH': return `must ${negate}start with "${expected}"`;
          default: return `must ${negate}pass ${type} validation`;
        }

      case 'NUMBER':
        switch (type) {
          case 'BETWEEN': return `must ${negate}be between ${this.#formatValue(readRangeBound(expected, 'min'))} and ${this.#formatValue(readRangeBound(expected, 'max'))}`;
          case 'EQUALS': return `must ${negate}equal ${expected}`;
          case 'GREATER': return `must ${negate}be greater than ${expected}`;
          case 'GREATER_EQUAL': return `must ${negate}be at least ${expected}`;
          case 'LESS': return `must ${negate}be less than ${expected}`;
          case 'LESS_EQUAL': return `must ${negate}be at most ${expected}`;
          case 'OUTSIDE': return `must ${negate}be outside ${this.#formatValue(readRangeBound(expected, 'min'))} to ${this.#formatValue(readRangeBound(expected, 'max'))}`;
          default: return `must ${negate}pass ${type} validation`;
        }

      case 'BOOLEAN':
        switch (type) {
          case 'EQUALS': return `must ${negate}equal ${expected}`;
          case 'FALSE': return `must ${negate}be false`;
          case 'FALSY': return `must ${negate}be falsy`;
          case 'TRUE': return `must ${negate}be true`;
          case 'TRUTHY': return `must ${negate}be truthy`;
          default: return `must ${negate}pass ${type} validation`;
        }

      case 'ARRAY':
        switch (type) {
          case 'CONTAINS': return `must ${negate}contain ${expectedStr}`;
          case 'EMPTY': return `must ${negate}be empty`;
          case 'EXCLUDES': return `must ${negate}exclude ${expectedStr}`;
          case 'IN': return `must ${negate}be in ${expectedStr}`;
          case 'INCLUDES': return `must ${negate}include ${expectedStr}`;
          case 'LENGTH': return `must have length ${negate}equal to ${expected}`;
          case 'NOT_EMPTY': return `must ${negate}be non-empty`;
          default: return `must ${negate}pass ${type} validation`;
        }

      case 'DATE':
        switch (type) {
          case 'BETWEEN': return `must ${negate}be between ${this.#formatValue(readRangeBound(expected, 'min'))} and ${this.#formatValue(readRangeBound(expected, 'max'))}`;
          case 'EQUALS': return `must ${negate}equal ${expectedStr}`;
          case 'OUTSIDE': return `must ${negate}be outside ${this.#formatValue(readRangeBound(expected, 'min'))} to ${this.#formatValue(readRangeBound(expected, 'max'))}`;
          default: return `must ${negate}pass ${type} validation`;
        }

      case 'CROSS':
        switch (type) {
          case 'ABSENT': return `must ${negate}be absent`;
          case 'DEFINED': return `must ${negate}be defined`;
          case 'EQUALS': return `must ${negate}equal ${expectedStr}`;
          case 'EXISTS': return `must ${negate}exist`;
          case 'NOT_NULL': return `must ${negate}be non-null`;
          case 'NULL': return `must ${negate}be null`;
          case 'TYPE': return `must ${negate}be of type ${expected}`;
          case 'UNDEFINED': return `must ${negate}be undefined`;
          default: return `must ${negate}pass ${type} validation`;
        }

      default:
        return `must ${negate}pass ${category}.${type} validation`;
    }
  }

  /**
   * Formats a value for display in error messages
   * @private
   * @param {*} value - The value to format
   * @param {number} maxLength - Maximum string length
   * @returns {string} Formatted value
   */
  #formatValue(value: unknown, maxLength = 100): string {
    if (value === null) {
      return 'null';
    }
    if (value === undefined) {
      return '(no value)';
    }
    if (value === '') {
      return '(empty string)';
    }
    if (typeof value === 'string') {
      if (value.length > maxLength) {
        return `'${value.substring(0, maxLength)}...'`;
      }

      return `'${value}'`;
    }
    if (typeof value === 'number') {
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

      return String(value);
    }
    if (typeof value === 'boolean') {
      return String(value);
    }
    if (typeof value === 'symbol') {
      return value.toString();
    }
    if (typeof value === 'function') {
      return '[Function]';
    }
    if (value instanceof Date) {
      return value.toISOString();
    }
    if (value instanceof RegExp) {
      return value.toString();
    }
    if (Array.isArray(value)) {
      if (value.length === 0) {
        return '[]';
      }
      if (value.length > 5) {
        return `[Array(${value.length})]`;
      }

      return `[${value.map((v) => {return this.#formatValue(v, 20);}).join(', ')}]`;
    }
    if (typeof value === 'object') {
      const keys = Object.keys(value);

      if (keys.length === 0) {
        return '{}';
      }
      if (keys.length > 5) {
        return `{Object(${keys.length} keys)}`;
      }
      try {
        const str = JSON.stringify(value, null, 0);

        if (str.length > maxLength) {
          return `{Object(${keys.length} keys)}`;
        }

        return str;
      } catch {
        return `{Object(${keys.length} keys)}`;
      }
    }

    return String(value);
  }

  /**
   * Gets the appropriate groupGate for a given wildcard nesting level
   * @private
   * @param {Object} condition - Compiled condition configuration
   * @param {number} level - Wildcard nesting level
   * @returns {string} The array logic to use at this level
   */
  #getGroupGateForLevel(condition: FilterCondition, level: number): string | ArrayLogicFunction {
    // groupGates MUST be an array matching the number of wildcards
    if (!condition.groupGates || !Array.isArray(condition.groupGates)) {
      throw new FilterConfigurationError(
        'groupGates must be an array with one entry per wildcard in the path',
        { 'groupGates': condition.groupGates }
      );
    }

    if (level >= condition.groupGates.length) {
      throw new FilterConfigurationError(
        `groupGates array has ${condition.groupGates.length} entries but wildcard level ${level} was accessed`,
        {
          'groupGates': condition.groupGates,
          'level': level
        }
      );
    }

    const gate = condition.groupGates[level];

    if (gate === undefined) {
      throw new FilterConfigurationError(
        `groupGates[${level}] is undefined`,
        {
          'groupGates': condition.groupGates,
          'level': level
        }
      );
    }

    return gate;
  }

  /**
   * Checks if conditions is empty or invalid
   * @returns {boolean} True if conditions should be considered empty
   */
  #hasEmptyConditions(): boolean {
    return this.conditions.length === 0 || (this.conditions.length === 1 && !this.conditions[0]);
  }

  /**
   * Determines if a regex pattern needs the Unicode flag
   * @private
   * @param {string} pattern - The regex pattern to check
   * @returns {boolean} True if Unicode flag is needed
   */
  #needsUnicodeFlag(pattern: unknown): boolean {
    if (typeof pattern !== 'string') {
      return false;
    }

    // Check for Unicode property escapes like \p{...} or \P{...}
    if (/\\[pP]\{[^}]+\}/.test(pattern)) {
      return true;
    }

    // Check for Unicode code point escapes like \u{...}
    if (/\\u\{[^}]+\}/.test(pattern)) {
      return true;
    }

    // Check for surrogate pair patterns (high surrogate range)
    if (/\\u[dD][8-9a-fA-F][0-9a-fA-F]{2}/.test(pattern)) {
      return true;
    }

    return false;
  }

  /**
   * Processes pattern for MATCHES operator
   * @param {string} pattern - Original pattern
   * @returns {string} Processed regex pattern
   */
  #processMatchesPattern(pattern: string): string {
    const isRegexPattern = /^[\\^]|\$|[[(].*[\])]|[\\][dDsSwW]/.test(pattern);

    if (isRegexPattern) {
      return pattern;
    }

    return `^${pattern.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*')}$`;
  }


  /**
   * Checks if evaluation should return true early (no meaningful conditions)
   * @returns {boolean} True if should return true immediately
   */
  #shouldReturnTrueEarly(): boolean {
    if (this.compiledConditions.length === 0) {
      return true;
    }

    const onlyCondition = this.compiledConditions[0];

    return this.compiledConditions.length === 1
        && onlyCondition !== undefined
        && onlyCondition[PropertyName.CORE.TYPE] === ConditionType.CORE.LOGICAL
        && (onlyCondition[PropertyName.CORE.CONDITIONS]?.length ?? 0) === 0;
  }


  /**
   * Validates filter configuration structure and requirements
   * @param {Object} config - Filter configuration to validate
   * @param {number} [depth=0] - Current nesting depth
   * @returns {boolean} True if configuration is valid
   * @throws {Error} If configuration is invalid
   */
  #validateConfiguration(config: ValidatableConfig, depth = 0): boolean {
    // Check if we've exceeded maximum nesting depth
    if (depth >= this.maxDepth) {
      throw new FilterConfigurationError(
        `Maximum nesting depth of ${this.maxDepth} exceeded. Consider increasing maxDepth option or restructuring your filter.`,
        {
          'maxDepth': this.maxDepth,
          'property': 'depth',
          'value': depth
        }
      );
    }

    if (!config || typeof config !== 'object') {
      throw new FilterConfigurationError(
        'Filter configuration must be an object',
        {
          'property': PropertyName.CORE.CONFIG,
          'value': config
        }
      );
    }

    // Validate that gate and conditions are present
    if (config.gate === undefined) {
      throw new FilterConfigurationError(
        'Configuration must include a gate property',
        {
          'property': 'gate',
          'value': undefined
        }
      );
    }

    // Mode is only required at the root level (depth 0), nested conditions inherit mode
    if (depth === 0 && config.mode === undefined) {
      throw new FilterConfigurationError(
        'Configuration must include a mode property',
        {
          'property': 'mode',
          'value': undefined
        }
      );
    }

    if (config.conditions === undefined) {
      throw new FilterConfigurationError(
        'Configuration must include a conditions property',
        {
          'property': 'conditions',
          'value': undefined
        }
      );
    }

    // Check if gate is valid - accept functions or strings
    const isValidGate = typeof config.gate === 'function'
                       || (typeof config.gate === 'string' && this.registry.gates.has(config.gate));

    if (!isValidGate) {
      // Get list of valid gates for error message
      const validGates = Array.from(this.registry.gates.keys()).toSorted();

      throw new FilterGateError(
        'Invalid logical gate. Must be a function or registered gate string.',
        {
          'gate': config.gate || 'undefined',
          'validGates': validGates
        }
      );
    }

    // Validate mode (only for root level or when explicitly provided)
    const mode = config.mode;

    if (mode !== undefined && !Object.values(FilterMode.CORE).includes(mode)) {
      throw new FilterConfigurationError(
        `Invalid filter mode: '${typeof config.mode}'. Must be one of: ${Object.keys(FilterMode.CORE).join(', ')}`,
        {
          'mode': config.mode,
          'validModes': Object.keys(FilterMode.CORE)
        }
      );
    }

    const nestedConditions = config.conditions;

    if (!Array.isArray(nestedConditions)) {
      throw new FilterConfigurationError(
        'Gate must contain an array of nested conditions',
        {
          'property': PropertyName.CORE.CONDITIONS,
          'value': nestedConditions
        }
      );
    }

    if (nestedConditions.length === 0) {
      return true;
    }

    const nestedLength = nestedConditions.length;

    for (let i = 0; i < nestedLength; i++) {
      const nested = nestedConditions[i];

      if (nested === undefined) {
        continue;
      }

      if (nested[PropertyName.CORE.GATE]) {
        this.#validateNestedCondition(nested, i, depth + 1);
        continue;
      }

      this.#validateFieldCondition(nested, i);
    }

    return true;
  }

  /**
   * Validates a field condition
   * @param {Object} nested - Field condition to validate
   * @param {number} index - Index for error reporting
   * @throws {Error} If field condition is invalid
   */
  #validateFieldCondition(nested: FilterCondition, index: number): void {
    // Check for undefined explicitly - empty string is a valid path for obj[""] access
    if (nested.path === undefined && nested.field === undefined) {
      throw new FilterConfigurationError(
        `Nested condition at index ${index} must have either a 'gate' or a 'path'/'field'`,
        {
          'index': index,
          'property': 'path/field',
          'value': {
            'field': nested.field || null,
            'path': nested.path || null
          }
        }
      );
    }

    if (!nested.operator) {
      throw new FilterConfigurationError(
        `Field condition at index ${index} must have an 'operator'`,
        {
          'index': index,
          'property': PropertyName.CORE.OPERATOR,
          'value': nested.operator || null
        }
      );
    }

    this.#validateOperator(nested.operator, index);
  }

  /**
   * Validates a nested condition with a gate
   * @param {Object} nested - Nested condition to validate
   * @param {number} index - Index for error reporting
   * @param {number} [depth=0] - Current nesting depth
   * @throws {Error} If nested condition is invalid
   */
  #validateNestedCondition(nested: FilterCondition, index: number, depth = 0): void {
    try {
      this.#validateConfiguration(nested, depth);
    } catch (error) {
      throw new FilterConfigurationError(
        `Invalid nested condition at index ${index}: ${getErrorMessage(error)}`,
        {
          'index': index,
          'property': 'nested condition'
        },
        getErrorCause(error)
      );
    }
  }

  /**
   * Validates an operator
   * @param {string} operator - Operator to validate
   * @param {number} index - Index for error reporting
   * @throws {Error} If operator is invalid
   */
  #validateOperator(operator: string | OperatorFunction, index: number): void {
    // Skip validation for function references (direct operator functions)
    if (typeof operator === 'function') {
      return;
    }

    // For string operators, check if they exist in the registry
    if (typeof operator === 'string') {
      // Check if operator exists - dot notation only
      const hasOperator = this.registry.operators.has(operator);

      if (hasOperator) {
        return;
      }
    }

    // Get list of available operators for error message
    const availableOperators = Array.from(this.registry.operators.keys()).toSorted();

    throw new FilterOperatorError(
      `Invalid operator at index ${index}: '${operator}'. Operator must be a function reference or a registered operator string.`,
      {
        'availableOperators': availableOperators,
        'index': index,
        'operator': operator
      }
    );
  }


  /**
   * Evaluates data against the compiled filter conditions
   * @param {*} data - Data to evaluate
   * @returns {Object} Result object with valid flag and errors array
   */
  evaluate(data: FilterValue): { 'errors': ProcessedFilterError[]; 'valid': boolean; } {
    if (this.#shouldReturnTrueEarly()) {
      return {
        'errors': [],
        'valid': true
      };
    }

    // Handle different error collection modes
    if (this.includeErrors === ErrorCollectionMode.NONE) {
      // Validation only - no error collection for maximum performance
      const result = this.#evaluateConditions(data, this.compiledConditions, this.gate, '', null);
      const valid = this.mode(result);

      return {
        'errors': [],
        'valid': valid
      };
    }

    const errors: FilterEvaluationErrorEntry[] = [];
    const result = this.#evaluateConditions(data, this.compiledConditions, this.gate, '', errors);
    const valid = this.mode(result);

    // Convert to validator-like format
    const processedErrors: ProcessedFilterError[] = [];

    if (!valid && errors.length > 0) {
      for (const error of errors) {
        const errorObj: ProcessedFilterError = {
          'field': error.field || error.path || 'root',
          'message': error.message,
          'operator': error.operator,
          'source': error.operatorSource || 'unknown',
          'value': error.actual
        };

        // Add params if there are relevant parameters
        if (error.expected !== undefined) {
          errorObj.params = { 'expected': error.expected };
        }

        processedErrors.push(errorObj);
      }
    }

    return {
      'errors': processedErrors,
      'valid': valid
    };
  }
}

export { FilterEngine };
