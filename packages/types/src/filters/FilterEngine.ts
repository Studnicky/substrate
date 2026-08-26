/**
 * @module FilterEngine
 * @description Core filtering engine with support for recursive conditionals,
 * logical operators, and nested groupings
 */

import type { FilterValueEntity } from './FilterValueEntity.js';
import type {
  ArrayWildcardValueInterface,
  FilterConditionInterface,
  FilterConfigInterface,
  FilterModeFunctionInterface
} from './interfaces.js';

import { Guard } from '../guards/Guard.js';
import { DefaultConfig } from './config/DefaultConfig.js';
import { REGEX_LIKE_PATTERN } from './constants/RegexLikePattern.js';
import { REGEX_SPECIAL_CHARS_PATTERN } from './constants/RegexSpecialCharsPattern.js';
import { SURROGATE_PAIR_PATTERN } from './constants/SurrogatePairPattern.js';
import { UNICODE_CODE_POINT_ESCAPE_PATTERN } from './constants/UnicodeCodePointEscapePattern.js';
import { UNICODE_PROPERTY_ESCAPE_PATTERN } from './constants/UnicodePropertyEscapePattern.js';
import { WILDCARD_SEGMENT_PATTERN } from './constants/WildcardSegmentPattern.js';
import { WILDCARD_STAR_PATTERN } from './constants/WildcardStarPattern.js';
import { ConditionType } from './enums/ConditionType.js';
import { ErrorCollectionMode } from './enums/ErrorCollectionMode.js';
import { FilterMode } from './enums/FilterMode.js';
import { PropertyName } from './enums/PropertyName.js';
import { FilterConfigurationError } from './errors/FilterConfigurationError.js';
import { FilterGateError } from './errors/FilterGateError.js';
import { FilterOperatorError } from './errors/FilterOperatorError.js';
import { FilterValueGuard } from './FilterValueGuard.js';
import { FilterTypeGuards } from './interfaces.js';
import { ArrayLogicOperations } from './logic/ArrayLogicOperations.js';
import { NumericOperators } from './operators/NumericOperators.js';
import { Plugins } from './registries/index.js';
import { GetPathValue } from './utils/getPathValue.js';
import { ValidatePath } from './utils/validatePath.js';

// Default gate registry key applied when a condition/config omits gate/rowGate
const DEFAULT_GATE_NAME = 'CORE.AND';

// Config-like shape accepted by #validateConfiguration - both the root FilterConfigInterface
// and a nested FilterConditionInterface (which reuses gate/conditions for sub-groups) satisfy it
interface ValidatableConfigInterface {
  'conditions'?: FilterConditionInterface[];
  'gate'?: string;
  'mode'?: FilterModeFunctionInterface;
}

// Entry collected in the errors array while evaluating with error reporting enabled
interface FilterEvaluationErrorEntryInterface {
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
interface ProcessedFilterErrorInterface {
  'field': string;
  'message': string;
  'operator': unknown;
  'parameters'?: { 'expected': unknown };
  'source': string;
  'value': unknown;
}

class FilterEngineHelpers {
  static getErrorCause(error: unknown): Error | undefined {
    const result = Guard.isError(error) ? error : undefined;

    return result;
  }

  static getErrorMessage(error: unknown): string {
    const result = Guard.isError(error) ? error.message : String(error);

    return result;
  }

  static readRangeBound(value: FilterValueEntity.Type, key: 'max' | 'min'): unknown {
    const result = Guard.isRecord(value) ? value[key] : undefined;

    return result;
  }
}

/**
 * Filter engine that evaluates conditions against data with support for
 * recursive conditionals, logical operators, and nested groupings
 */
class FilterEngine {
  private compiledConditions: FilterConditionInterface[];
  private conditions: FilterConditionInterface[];
  private gate: string;
  private includeErrors: string;
  private maximumDepth: number;
  private maximumPathDepth: number;
  private mode: FilterModeFunctionInterface;
  private registry: Plugins;

  /**
   * Creates a new FilterEngine instance
   */
  constructor(config: FilterConfigInterface) {
    // Strict runtime validation of configuration
    if (!FilterTypeGuards.isValidFilterConfig(config)) {
      const filterConfigRecord = config as Record<string, unknown>;

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

      if (!('conditions' in filterConfigRecord)) {
        throw new FilterConfigurationError(
          'Missing required field: conditions. Must be an array of FilterConditionInterface objects.',
          {
            'property': 'conditions',
            'value': undefined
          }
        );
      }

      if (!('gate' in filterConfigRecord)) {
        throw new FilterConfigurationError(
          'Missing required field: gate. Must be a registry-key string reference (e.g., "CORE.AND").',
          {
            'property': 'gate',
            'value': undefined
          }
        );
      }

      if (!('mode' in filterConfigRecord)) {
        throw new FilterConfigurationError(
          'Missing required field: mode. Must be a FilterModeFunctionInterface (e.g., Types.FilterMode.CORE.WHITELIST).',
          {
            'property': 'mode',
            'value': undefined
          }
        );
      }

      // Check for invalid field types
      if (!Array.isArray(filterConfigRecord.conditions)) {
        throw new FilterConfigurationError(
          'Invalid field type: conditions must be an array of FilterConditionInterface objects.',
          {
            'property': 'conditions',
            'value': filterConfigRecord.conditions
          }
        );
      }

      if (typeof filterConfigRecord.gate !== 'string') {
        throw new FilterConfigurationError(
          'Invalid field type: gate must be a registry-key string reference (e.g., "CORE.AND" or "plugin:gateName").',
          {
            'property': 'gate',
            'value': filterConfigRecord.gate
          }
        );
      }

      if (typeof filterConfigRecord.mode !== 'function') {
        throw new FilterConfigurationError(
          'Invalid field type: mode must be a FilterModeFunctionInterface (e.g., Types.FilterMode.CORE.WHITELIST).',
          {
            'property': 'mode',
            'value': filterConfigRecord.mode
          }
        );
      }

      // Generic fallback error
      throw new FilterConfigurationError(
        'Invalid FilterConfigInterface: conditions must be FilterConditionInterface[], gate must be a registry-key string, mode must be FilterModeFunctionInterface',
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
    const maximumDepthOption = normalizedConfig.maximumDepth;
    const clampedMaximumDepth = Math.max(1, maximumDepthOption);

    // Set maximum path depth for property access (default from config, min 1, max 100)

    this.maximumDepth = Math.min(100, clampedMaximumDepth);
    const maximumPathDepthOption = normalizedConfig.maximumPathDepth;
    const clampedMaximumPathDepth = Math.max(1, maximumPathDepthOption);

    // Validate and set filter mode (REQUIRED - no default)

    this.maximumPathDepth = Math.min(100, clampedMaximumPathDepth);

    // Mode is required in config
    const mode = normalizedConfig.mode;

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

    // Set up plugin registry with class instances only
    this.mode = mode;
    this.registry = normalizedConfig.registry instanceof Plugins
      ? normalizedConfig.registry
      : new Plugins({ 'plugins': normalizedConfig.plugins });

    // Initialize all properties first for V8 optimization (maintaining hidden classes)
    this.includeErrors = normalizedConfig.includeErrors;

    // Validate gate exists in the registry; resolved to a function per-use in #evaluateConditions
    if (!this.registry.gates.has(normalizedConfig.gate)) {
      // Get list of valid gates for error message
      const validGates = Array.from(this.registry.gates.keys()).toSorted();

      throw new FilterGateError(
        `Unknown gate: ${normalizedConfig.gate}. Gate must be a registered string.`,
        {
          'gate': normalizedConfig.gate,
          'validGates': validGates
        }
      );
    }
    this.gate = normalizedConfig.gate;

    this.conditions = [];
    // Get conditions from configuration
    this.compiledConditions = [];
    // Determine conditions value unconditionally for V8 optimization (maintaining hidden classes)
    const conditions = normalizedConfig.conditions;
    let finalConditions: FilterConditionInterface[];

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
  #applyArrayLogic(results: boolean[], logic: string): boolean {
    // Check for custom arrayLogic function in plugin registry first
    const customLogic = this.registry.arrayLogic.get(logic);

    if (customLogic !== undefined) {
      const result = customLogic(results);

      return result;
    }

    // Fall back to built-in array logic
    const result = ArrayLogicOperations.applyLogic(results, logic);

    return result;
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
    wildcardValue: ArrayWildcardValueInterface,
    operator: string,
    filterValue: FilterValueEntity.Type,
    condition: FilterConditionInterface,
    options: { 'data'?: unknown; 'wildcardLevel'?: number } = {}
  ): boolean {
    const wildcardLevel = options.wildcardLevel ?? 0;
    const data = options.data ?? null;
    const {
      array, remainingPath
    } = wildcardValue;
    const nestedConditions = condition.conditions;

    if (nestedConditions !== undefined && nestedConditions.length > 0) {
      const results: boolean[] = [];
      const arrayLength = array.length;

      for (let i = 0; i < arrayLength; i++) {
        results.push(this.#evaluateConditions(
          FilterValueGuard.intake(array[i]),
          nestedConditions,
          { 'gate': condition.rowGate ?? DEFAULT_GATE_NAME }
        ));
      }

      // Get the appropriate groupGate for this wildcard level
      const groupGate = this.#getGroupGateForLevel(condition, wildcardLevel);
      const result = this.#applyArrayLogic(results, groupGate);

      return result;
    }

    const results: boolean[] = [];
    const remainingPathValue = remainingPath.length > 0
      ? remainingPath.join('.')
      : null;
    const arrayLength = array.length;

    for (let i = 0; i < arrayLength; i++) {
      const rawItem = array[i];
      const value = remainingPathValue !== null
        ? GetPathValue.getPathValue(FilterValueGuard.intake(rawItem), remainingPathValue, this.maximumPathDepth)
        : FilterValueGuard.intake(rawItem);

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
    value: unknown,
    operator: string,
    filterValue: FilterValueEntity.Type,
    condition: FilterConditionInterface,
    data: unknown = null
  ): boolean {
    if (FilterTypeGuards.isArrayWildcardValue(value)) {
      const result = this.#applyArrayWildcard(value, operator, filterValue, condition, { 'data': data, 'wildcardLevel': 0 });

      return result;
    }

    // Options object seen by operator functions — data omitted when not supplied,
    // matching the pre-redesign behavior of never fabricating a fallback value.
    const options: { 'condition': FilterConditionInterface; 'data'?: FilterValueEntity.Type } = {
      'condition': condition,
      ...(data !== null && { 'data': data as FilterValueEntity.Type })
    };

    // Get operator handler - colon notation for plugins (PluginName:OPERATOR)
    const handler = this.registry.operators.get(operator);

    if (handler === undefined) {
      // Get list of available operators for error message
      const availableOperators = Array.from(this.registry.operators.keys()).toSorted();

      throw new FilterOperatorError(
        `Unknown operator: ${operator}. Operator must be a registered string.`,
        {
          'availableOperators': availableOperators,
          'operator': operator
        }
      );
    }

    // Operators declare FilterValueEntity.Type params for the common JSON-safe case; Date/Set/Map
    // instances still flow through correctly here since operators self-validate via
    // instanceof/typeof, but the static type at this traversal boundary is unknown.
    const result = handler(value as FilterValueEntity.Type, filterValue, options);

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
    value: unknown,
    operator: string,
    filterValue: FilterValueEntity.Type,
    condition: FilterConditionInterface,
    wildcardLevel: number,
    data: unknown = null
  ): boolean {
    if (FilterTypeGuards.isArrayWildcardValue(value)) {
      // Increment level for nested wildcards
      const result = this.#applyArrayWildcard(value, operator, filterValue, condition, { 'data': data, 'wildcardLevel': wildcardLevel + 1 });

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
  #compileBetweenRange(compiled: FilterConditionInterface, condition: FilterConditionInterface): void {
    const isBetweenOperator = typeof condition.operator === 'string'
      && (condition.operator.endsWith('.BETWEEN') || condition.operator.endsWith('.OUTSIDE'));
    const rangeValue = compiled.value;

    if (!isBetweenOperator || !Array.isArray(rangeValue) || rangeValue.length !== 2) {
      return;
    }

    const firstValue = Number(rangeValue[0]);
    const secondValue = Number(rangeValue[1]);

    compiled.minimumValue = firstValue < secondValue ? firstValue : secondValue;
    compiled.maximumValue = firstValue > secondValue ? firstValue : secondValue;
  }

  /**
   * Compiles case-insensitive string values
   * @param {Object} compiled - Compiled condition object
   */
  #compileCaseInsensitiveValue(compiled: FilterConditionInterface): void {
    if (compiled.caseSensitive !== true && typeof compiled.value === 'string') {
      compiled.lowerValue = compiled.value.toLowerCase();
    }
  }

  /**
   * Compiles a single condition for optimized evaluation
   * Pre-compiles regex patterns, numeric values, and case-insensitive strings
   * @param {Object} condition - Raw condition configuration
   * @returns {Object} Compiled condition with optimizations
   */
  #compileCondition(condition: FilterConditionInterface): FilterConditionInterface {
    if (condition.gate !== undefined || condition.operator === 'group') {
      const logicalCompiled: FilterConditionInterface = {};

      logicalCompiled.conditions = this.#compileConditions(condition.conditions ?? []);

      logicalCompiled.gate = condition.gate ?? DEFAULT_GATE_NAME;

      logicalCompiled.negate = condition.negate ?? false;

      logicalCompiled.type = ConditionType.CORE.LOGICAL;

      return logicalCompiled;
    }

    let path = condition.path;

    if (path === undefined || path === '') {
      path = condition.field;
    }
    if (path === undefined || path === '') {
      // Count wildcards in the path
      path = condition.pathway;
    }

    // Validate path format - paths MUST be in dot notation
    if (path !== undefined && path !== '' && !ValidatePath.validatePath(path)) {
      throw new FilterConfigurationError(
        `Invalid path format: "${path}". Paths must use dot notation (e.g., "user.profile.name" or "items[0].value")`,
        {
          'property': 'path',
          'value': path
        }
      );
    }

    // Count wildcards in the path
    const wildcardCount = path !== undefined ? [...path.matchAll(WILDCARD_SEGMENT_PATTERN)].length : 0;
    let groupGates: string[] | undefined;

    if (wildcardCount > 0) {
      if (condition.groupGates === undefined || !Array.isArray(condition.groupGates)) {
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

    const compiled: FilterConditionInterface = {
      ...(condition.caseSensitive !== undefined && { 'caseSensitive': condition.caseSensitive }),
      ...(condition.dataType !== undefined && { 'dataType': condition.dataType }),
      ...(condition.decimalPrecision !== undefined && { 'decimalPrecision': condition.decimalPrecision }),
      ...(condition.equals !== undefined && { 'equals': condition.equals }),
      ...(groupGates !== undefined && { 'groupGates': groupGates }),
      ...(condition.inclusive !== undefined && { 'inclusive': condition.inclusive }),
      'rowGate': condition.rowGate ?? DEFAULT_GATE_NAME
    // Set properties using direct assignment for V8 optimization
    };

    const rawNestedConditions = condition.conditions;

    if (rawNestedConditions !== undefined) {
      compiled.conditions = this.#compileConditions(rawNestedConditions);
    }
    compiled.negate = condition.negate ?? false;

    const rawOperator = condition.operator;

    if (rawOperator !== undefined) {
      compiled.operator = rawOperator;
    }
    if (path !== undefined) {
      compiled.path = path;
    }

    const rawThreshold = condition.threshold;

    if (rawThreshold !== undefined) {
      compiled.threshold = rawThreshold;
    }
    compiled.type = ConditionType.CORE.FIELD;

    const rawValue = condition.value !== undefined
      ? condition.value
      : rawThreshold;

    if (rawValue !== undefined) {
      compiled.value = rawValue;
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
  #compileConditions(conditions: FilterConditionInterface[]): FilterConditionInterface[] {
    const compiled: FilterConditionInterface[] = [];
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
  #compileNumericValues(compiled: FilterConditionInterface, condition: FilterConditionInterface): void {
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
  #compileRegexPattern(compiled: FilterConditionInterface, condition: FilterConditionInterface): void {
    const isRegexOperator = typeof condition.operator === 'string'
      && (condition.operator.endsWith('.MATCHES') || condition.operator.endsWith('.REGEX'));

    if (!isRegexOperator || Boolean(compiled.value) === false) {
      return;
    }

    try {
      if (compiled.value instanceof RegExp) {
        compiled.compiledRegex = compiled.value;

        return;
      }

      let regexPattern: FilterValueEntity.Type = compiled.value ?? '';

      if (typeof condition.operator === 'string' && condition.operator.endsWith('.MATCHES') && typeof regexPattern === 'string') {
        regexPattern = this.#processMatchesPattern(regexPattern);
      }

      const regexSource = typeof regexPattern === 'string' ? regexPattern : String(regexPattern);

      // Add 'u' flag only when Unicode features are detected in the pattern
      const needsUnicodeFlag = this.#needsUnicodeFlag(regexSource);
      const flags = (compiled.caseSensitive === true ? '' : 'i') + (needsUnicodeFlag ? 'u' : '');

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
   * @param {string} [gate=DEFAULT_GATE_NAME] - Logical gate registry key to use
   * @param {string} [path=''] - Current path for error reporting
   * @param {Array} [errors=null] - Array to collect errors (optional)
   * @returns {boolean} Result of conditions evaluation
   */
  #evaluateConditions(
    data: unknown,
    conditions: FilterConditionInterface[],
    options: {
      'errors'?: FilterEvaluationErrorEntryInterface[] | null;
      'gate'?: string | undefined;
      'path'?: string;
    } = {}
  ): boolean {
    const gate = options.gate ?? DEFAULT_GATE_NAME;
    const path = options.path ?? '';
    const errors = options.errors ?? null;

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

      const conditionResult = errors !== null
        ? this.#evaluateSingleConditionWithErrors(data, condition, errors, path)
        : this.#evaluateSingleCondition(data, condition);

      results.push(conditionResult);

      // Short-circuit based on error collection mode
      if (gate === 'CORE.AND' && !conditionResult && this.includeErrors === ErrorCollectionMode.FIRST) {
        return false;
      }

      if (gate === 'CORE.OR' && conditionResult && this.includeErrors === ErrorCollectionMode.FIRST) {
        return true;
      }
    }

    // Resolve the gate function from the registry
    const gateFunction = this.registry.gates.get(gate);

    if (gateFunction === undefined) {
      const validGates = Array.from(this.registry.gates.keys()).toSorted();

      throw new FilterGateError(
        `Unknown gate: ${gate}. Gate must be a registered string.`,
        {
          'gate': gate,
          'validGates': validGates
        }
      );
    }

    try {
      const result = gateFunction(results);

      return result;
    } catch (error) {
      if (errors !== null) {
        const errorMessage = FilterEngineHelpers.getErrorMessage(error);

        errors.push({
          'gate': 'function',
          'message': errorMessage !== '' ? errorMessage : 'Gate function error'
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
  #evaluateSingleCondition(data: unknown, condition: FilterConditionInterface): boolean {
    let result: boolean;

    if (condition.type === ConditionType.CORE.LOGICAL) {
      result = this.#evaluateConditions(data, condition.conditions ?? [], { 'gate': condition.gate });
    } else {
      const operator = condition.operator;

      if (operator === undefined) {
        throw new FilterOperatorError('Condition is missing an operator', {});
      }

      // Apply converter if specified, but not for array wildcards (handled in applyArrayWildcard)
      const value = GetPathValue.getPathValue(data, condition.path ?? '', this.maximumPathDepth);


      result = this.#applyOperator(
        value,
        operator,
        condition.value ?? null,
        condition
      );
    }

    const finalResult = condition.negate === true ? !result : result;

    return finalResult;
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
    data: unknown,
    condition: FilterConditionInterface,
    errors: FilterEvaluationErrorEntryInterface[],
    path = ''
  ): boolean {
    let result: boolean;

    if (condition.type === ConditionType.CORE.LOGICAL) {
      // For nested conditions, maintain the current path (don't add .conditions)
      result = this.#evaluateConditions(
        data,
        condition.conditions ?? [],
        { 'errors': errors, 'gate': condition.gate, 'path': path }
      );
    } else {
      const operator = condition.operator;

      if (operator === undefined) {
        throw new FilterOperatorError('Condition is missing an operator', {});
      }

      const fieldPath = condition.path ?? '';
      // Apply converter if specified
      const value = GetPathValue.getPathValue(data, fieldPath, this.maximumPathDepth);


      // If the condition failed, add error details
      let errorAdded = false;

      try {
        result = this.#applyOperator(
          value,
          operator,
          condition.value ?? null,
          condition,
          data
        );
      } catch (error) {
        // Handle plugin operator errors gracefully
        result = false;
        // Always collect errors when errors array is provided
        const errorMessage = FilterEngineHelpers.getErrorMessage(error);

        // Get the string name for the operator
        const operatorName = operator;
        const isBuiltIn = this.registry.operators.isBuiltIn(operatorName);

        errors.push({
          'actual': value,
          'expected': condition.value,
          'field': fieldPath,
          'message': errorMessage !== '' ? errorMessage : 'Operator error',
          'operator': operatorName,
          'operatorSource': isBuiltIn ? 'builtin' : 'plugin'
        });
        errorAdded = true;
      }
      if (!result && !errorAdded) {
        // The fieldPath is already the full path from the data root (e.g., "user.profile.email")
        // We only prepend 'path' if we're in a nested evaluation context (like array wildcards)
        const fullPath = path !== '' && !fieldPath.startsWith(path) ? `${path}.${fieldPath}` : fieldPath;

        // Get the string name for the operator
        const operatorName = operator;
        const isBuiltIn = this.registry.operators.isBuiltIn(operatorName);

        errors.push({
          'actual': value,
          'expected': condition.value,
          // Use the full path as the field
          'field': fullPath,
          'message': this.#formatErrorMessage(condition, value),
          'negate': condition.negate ?? false,
          'operator': operatorName,
          'operatorSource': isBuiltIn ? 'builtin' : 'plugin',
          'path': fullPath
        });
      }
    }

    const finalResult = condition.negate === true ? !result : result;

    return finalResult;
  }


  /**
   * Formats an error message for a failed condition
   * @private
   * @param {Object} condition - The condition that failed
   * @param {*} value - The actual value that failed
   * @returns {string} Formatted error message
   */
  #formatErrorMessage(condition: FilterConditionInterface, value: unknown): string {
    const operatorValue = condition.operator;
    const expected = condition.value ?? null;
    const negate = condition.negate === true ? 'not ' : '';

    if (value === undefined) {
      return 'is required';
    }

    if (value === null) {
      return 'must not be null';
    }

    const operatorName = operatorValue;

    // Create human-readable error messages based on operator type
    if (typeof operatorName === 'string') {
      // Parse operator category and type
      const parts = operatorName.split('.');
      const [
        category,
        type
      ] = parts;

      if (parts.length === 2 && category !== undefined && type !== undefined) {
        const result = this.#formatOperatorMessage(category, type, expected, negate);

        return result;
      }
    }

    // Default message for unknown operators
    const result = `failed ${negate}${String(operatorName)} validation (expected: ${this.#formatValue(expected)})`;

    return result;
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
  #formatArrayOperatorMessage(type: string, expected: FilterValueEntity.Type, negate: string, expectedDisplay: string): string {
    const handlers: Record<string, () => string> = {
      'CONTAINS': () => { return `must ${negate}contain ${expectedDisplay}`; },
      'EMPTY': () => { return `must ${negate}be empty`; },
      'EXCLUDES': () => { return `must ${negate}exclude ${expectedDisplay}`; },
      'IN': () => { return `must ${negate}be in ${expectedDisplay}`; },
      'INCLUDES': () => { return `must ${negate}include ${expectedDisplay}`; },
      'LENGTH': () => { return `must have length ${negate}equal to ${expected}`; },
      'NOT_EMPTY': () => { return `must ${negate}be non-empty`; }
    };
    const handler = handlers[type];
    const result = handler !== undefined ? handler() : `must ${negate}pass ${type} validation`;

    return result;
  }

  #formatBooleanOperatorMessage(type: string, expected: FilterValueEntity.Type, negate: string): string {
    switch (type) {
      case 'EQUALS': return `must ${negate}equal ${expected}`;
      case 'FALSE': return `must ${negate}be false`;
      case 'FALSY': return `must ${negate}be falsy`;
      case 'TRUE': return `must ${negate}be true`;
      case 'TRUTHY': return `must ${negate}be truthy`;
      default: return `must ${negate}pass ${type} validation`;
    }
  }

  #formatCrossOperatorMessage(type: string, expected: FilterValueEntity.Type, negate: string, expectedDisplay: string): string {
    const handlers: Record<string, () => string> = {
      'ABSENT': () => { return `must ${negate}be absent`; },
      'DEFINED': () => { return `must ${negate}be defined`; },
      'EQUALS': () => { return `must ${negate}equal ${expectedDisplay}`; },
      'EXISTS': () => { return `must ${negate}exist`; },
      'NOT_NULL': () => { return `must ${negate}be non-null`; },
      'NULL': () => { return `must ${negate}be null`; },
      'TYPE': () => { return `must ${negate}be of type ${expected}`; },
      'UNDEFINED': () => { return `must ${negate}be undefined`; }
    };
    const handler = handlers[type];
    const result = handler !== undefined ? handler() : `must ${negate}pass ${type} validation`;

    return result;
  }

  #formatDateOperatorMessage(type: string, expected: FilterValueEntity.Type, negate: string, expectedDisplay: string): string {
    switch (type) {
      case 'BETWEEN': return `must ${negate}be between ${this.#formatValue(FilterEngineHelpers.readRangeBound(expected, 'min'))} and ${this.#formatValue(FilterEngineHelpers.readRangeBound(expected, 'max'))}`;
      case 'EQUALS': return `must ${negate}equal ${expectedDisplay}`;
      case 'OUTSIDE': return `must ${negate}be outside ${this.#formatValue(FilterEngineHelpers.readRangeBound(expected, 'min'))} to ${this.#formatValue(FilterEngineHelpers.readRangeBound(expected, 'max'))}`;
      default: return `must ${negate}pass ${type} validation`;
    }
  }

  #formatNumberOperatorMessage(type: string, expected: FilterValueEntity.Type, negate: string): string {
    const handlers: Record<string, () => string> = {
      'BETWEEN': () => { return `must ${negate}be between ${this.#formatValue(FilterEngineHelpers.readRangeBound(expected, 'min'))} and ${this.#formatValue(FilterEngineHelpers.readRangeBound(expected, 'max'))}`; },
      'EQUALS': () => { return `must ${negate}equal ${expected}`; },
      'GREATER': () => { return `must ${negate}be greater than ${expected}`; },
      'GREATER_EQUAL': () => { return `must ${negate}be at least ${expected}`; },
      'LESS': () => { return `must ${negate}be less than ${expected}`; },
      'LESS_EQUAL': () => { return `must ${negate}be at most ${expected}`; },
      'OUTSIDE': () => { return `must ${negate}be outside ${this.#formatValue(FilterEngineHelpers.readRangeBound(expected, 'min'))} to ${this.#formatValue(FilterEngineHelpers.readRangeBound(expected, 'max'))}`; }
    };
    const handler = handlers[type];
    const result = handler !== undefined ? handler() : `must ${negate}pass ${type} validation`;

    return result;
  }

  #formatOperatorMessage(category: string, type: string, expected: FilterValueEntity.Type, negate: string): string {
    const expectedDisplay = this.#formatValue(expected);
    const categoryHandlers: Record<string, (type: string, expected: FilterValueEntity.Type, negate: string, expectedDisplay: string) => string> = {
      'ARRAY': (typeName, expectedValue, negatePrefix, display) => {
        const messageResult = this.#formatArrayOperatorMessage(typeName, expectedValue, negatePrefix, display);

        return messageResult;
      },
      'BOOLEAN': (typeName, expectedValue, negatePrefix) => {
        const messageResult = this.#formatBooleanOperatorMessage(typeName, expectedValue, negatePrefix);

        return messageResult;
      },
      'CROSS': (typeName, expectedValue, negatePrefix, display) => {
        const messageResult = this.#formatCrossOperatorMessage(typeName, expectedValue, negatePrefix, display);

        return messageResult;
      },
      'DATE': (typeName, expectedValue, negatePrefix, display) => {
        const messageResult = this.#formatDateOperatorMessage(typeName, expectedValue, negatePrefix, display);

        return messageResult;
      },
      'NUMBER': (typeName, expectedValue, negatePrefix) => {
        const messageResult = this.#formatNumberOperatorMessage(typeName, expectedValue, negatePrefix);

        return messageResult;
      },
      'STRING': (typeName, expectedValue, negatePrefix, display) => {
        const messageResult = this.#formatStringOperatorMessage(typeName, expectedValue, negatePrefix, display);

        return messageResult;
      }
    };

    const handler = categoryHandlers[category];
    const result = handler !== undefined
      ? handler(type, expected, negate, expectedDisplay)
      : `must ${negate}pass ${category}.${type} validation`;

    return result;
  }

  #formatStringOperatorMessage(type: string, expected: FilterValueEntity.Type, negate: string, expectedDisplay: string): string {
    const handlers: Record<string, () => string> = {
      'CONTAINS': () => { return `must ${negate}contain "${expected}"`; },
      'EMPTY': () => { return `must ${negate}be empty`; },
      'ENDS_WITH': () => { return `must ${negate}end with "${expected}"`; },
      'EQUALS': () => { return `must ${negate}equal "${expected}"`; },
      'LENGTH': () => { return `must have length ${negate}equal to ${expected}`; },
      'NOT_EMPTY': () => { return `must ${negate}be non-empty`; },
      'REGEX': () => { return `must ${negate}match pattern ${expectedDisplay}`; },
      'STARTS_WITH': () => { return `must ${negate}start with "${expected}"`; }
    };
    const handler = handlers[type];
    const result = handler !== undefined ? handler() : `must ${negate}pass ${type} validation`;

    return result;
  }

  /**
   * Formats a value for display in error messages
   * @private
   * @param {*} value - The value to format
   * @param {number} maximumLength - Maximum string length
   * @returns {string} Formatted value
   */
  #formatValue(value: unknown, maximumLength = 100): string {
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
      if (value.length > maximumLength) {
        return `'${value.substring(0, maximumLength)}...'`;
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

      const result = String(value);

      return result;
    }
    if (typeof value === 'boolean') {
      const result = String(value);

      return result;
    }
    if (typeof value === 'symbol') {
      const result = value.toString();

      return result;
    }
    if (typeof value === 'function') {
      return '[Function]';
    }
    if (value instanceof Date) {
      const result = value.toISOString();

      return result;
    }
    if (value instanceof RegExp) {
      const result = value.toString();

      return result;
    }
    if (Array.isArray(value)) {
      if (value.length === 0) {
        return '[]';
      }
      if (value.length > 5) {
        return `[Array(${value.length})]`;
      }

      const formattedItems = value.map((item) => {
        const formattedItem = this.#formatValue(item, 20);

        return formattedItem;
      });
      const result = `[${formattedItems.join(', ')}]`;

      return result;
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
        const serialized = JSON.stringify(value, null, 0);

        if (serialized.length > maximumLength) {
          return `{Object(${keys.length} keys)}`;
        }

        return serialized;
      } catch {
        return `{Object(${keys.length} keys)}`;
      }
    }

    const result = String(value);

    return result;
  }

  /**
   * Gets the appropriate groupGate for a given wildcard nesting level
   * @private
   * @param {Object} condition - Compiled condition configuration
   * @param {number} level - Wildcard nesting level
   * @returns {string} The array logic to use at this level
   */
  #getGroupGateForLevel(condition: FilterConditionInterface, level: number): string {
    // groupGates MUST be an array matching the number of wildcards
    if (condition.groupGates === undefined || !Array.isArray(condition.groupGates)) {
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
    const result = this.conditions.length === 0 || (this.conditions.length === 1 && this.conditions[0] === undefined);

    return result;
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
    if (UNICODE_PROPERTY_ESCAPE_PATTERN.test(pattern)) {
      return true;
    }

    // Check for Unicode code point escapes like \u{...}
    if (UNICODE_CODE_POINT_ESCAPE_PATTERN.test(pattern)) {
      return true;
    }

    // Check for surrogate pair patterns (high surrogate range)
    if (SURROGATE_PAIR_PATTERN.test(pattern)) {
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
    const isRegexPattern = REGEX_LIKE_PATTERN.test(pattern);

    if (isRegexPattern) {
      return pattern;
    }

    const result = `^${pattern.replace(REGEX_SPECIAL_CHARS_PATTERN, '\\$&').replace(WILDCARD_STAR_PATTERN, '.*')}$`;

    return result;
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
    const result = this.compiledConditions.length === 1
        && onlyCondition?.type === ConditionType.CORE.LOGICAL
        && (onlyCondition.conditions?.length ?? 0) === 0;

    return result;
  }


  /**
   * Validates filter configuration structure and requirements
   * @param {Object} config - Filter configuration to validate
   * @param {number} [depth=0] - Current nesting depth
   * @returns {boolean} True if configuration is valid
   * @throws {Error} If configuration is invalid
   */
  #validateConfiguration(config: ValidatableConfigInterface, depth = 0): boolean {
    // Check if we've exceeded maximum nesting depth
    if (depth >= this.maximumDepth) {
      throw new FilterConfigurationError(
        `Maximum nesting depth of ${this.maximumDepth} exceeded. Consider increasing maximumDepth option or restructuring your filter.`,
        {
          'maximumDepth': this.maximumDepth,
          'property': 'depth',
          'value': depth
        }
      );
    }

    if (config === null || config === undefined || typeof config !== 'object') {
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

    // Check if gate is valid - registered string only
    const isValidGate = typeof config.gate === 'string' && this.registry.gates.has(config.gate);

    if (!isValidGate) {
      // Get list of valid gates for error message
      const validGates = Array.from(this.registry.gates.keys()).toSorted();

      throw new FilterGateError(
        'Invalid logical gate. Must be a registered gate string.',
        {
          'gate': config.gate !== '' ? config.gate : 'undefined',
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

      if (nested.gate !== undefined) {
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
  #validateFieldCondition(nested: FilterConditionInterface, index: number): void {
    // Check for undefined explicitly - empty string is a valid path for obj[""] access
    if (nested.path === undefined && nested.field === undefined) {
      throw new FilterConfigurationError(
        `Nested condition at index ${index} must have either a 'gate' or a 'path'/'field'`,
        {
          'index': index,
          'property': 'path/field',
          'value': {
            'field': nested.field ?? null,
            'path': nested.path ?? null
          }
        }
      );
    }

    if (nested.operator === undefined) {
      throw new FilterConfigurationError(
        `Field condition at index ${index} must have an 'operator'`,
        {
          'index': index,
          'property': PropertyName.CORE.OPERATOR,
          'value': null
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
  #validateNestedCondition(nested: FilterConditionInterface, index: number, depth = 0): void {
    try {
      this.#validateConfiguration(nested, depth);
    } catch (error) {
      throw new FilterConfigurationError(
        `Invalid nested condition at index ${index}: ${FilterEngineHelpers.getErrorMessage(error)}`,
        {
          'cause': FilterEngineHelpers.getErrorCause(error),
          'index': index,
          'property': 'nested condition'
        }
      );
    }
  }

  /**
   * Validates an operator
   * @param {string} operator - Operator to validate
   * @param {number} index - Index for error reporting
   * @throws {Error} If operator is invalid
   */
  #validateOperator(operator: string, index: number): void {
    // Check if operator exists - dot notation only
    if (this.registry.operators.has(operator)) {
      return;
    }

    // Get list of available operators for error message
    const availableOperators = Array.from(this.registry.operators.keys()).toSorted();

    throw new FilterOperatorError(
      `Invalid operator at index ${index}: '${operator}'. Operator must be a registered operator string.`,
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
  evaluate(data: unknown): { 'errors': ProcessedFilterErrorInterface[]; 'valid': boolean; } {
    if (this.#shouldReturnTrueEarly()) {
      return {
        'errors': [],
        'valid': true
      };
    }

    // Handle different error collection modes
    if (this.includeErrors === ErrorCollectionMode.NONE) {
      // Validation only - no error collection for maximum performance
      const result = this.#evaluateConditions(data, this.compiledConditions, { 'gate': this.gate });
      const valid = this.mode(result);

      return {
        'errors': [],
        'valid': valid
      };
    }

    const errors: FilterEvaluationErrorEntryInterface[] = [];
    const result = this.#evaluateConditions(data, this.compiledConditions, { 'errors': errors, 'gate': this.gate });
    const valid = this.mode(result);

    // Convert to validator-like format
    const processedErrors: ProcessedFilterErrorInterface[] = [];

    if (!valid && errors.length > 0) {
      const errorsLength = errors.length;

      for (let errorIndex = 0; errorIndex < errorsLength; errorIndex += 1) {
        const error = errors[errorIndex];

        if (error === undefined) {
          continue;
        }

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

        processedErrors.push(processedError);
      }
    }

    return {
      'errors': processedErrors,
      'valid': valid
    };
  }
}

export { FilterEngine };
