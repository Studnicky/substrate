/**
 * @module FilterEngine
 * @description Core filtering engine with support for recursive conditionals,
 * logical operators, and nested groupings
 */

import { ThrownValueEntity } from '@studnicky/errors/entities';

import { RuntimeValue } from '#runtime';

import type { FilterEvaluationErrorEntryInterface } from './FilterEvaluationErrorEntryInterface.js';
import type { FilterValueEntity } from './FilterValueEntity.js';
import type {
  ArrayWildcardValueInterface,
  FilterConditionInterface,
  FilterConfigInterface,
  FilterModeFunctionInterface,
  LogicGateFunctionInterface
} from './interfaces.js';
import type { ProcessedFilterErrorInterface } from './ProcessedFilterErrorInterface.js';

import { ConditionCompiler } from './ConditionCompiler.js';
import { DefaultConfig } from './config/DefaultConfig.js';
import { DEFAULT_GATE_NAME } from './constants/DefaultGateName.js';
import { ConditionType } from './enums/ConditionType.js';
import { ErrorCollectionMode } from './enums/ErrorCollectionMode.js';
import { FilterMode } from './enums/FilterMode.js';
import { PropertyName } from './enums/PropertyName.js';
import { FilterConfigurationError } from './errors/FilterConfigurationError.js';
import { FilterGateError } from './errors/FilterGateError.js';
import { FilterOperatorError } from './errors/FilterOperatorError.js';
import { FilterEngineHelpers } from './FilterEngineHelpers.js';
import { FilterErrorMessageFormatter } from './FilterErrorMessageFormatter.js';
import { FilterTypeGuards } from './interfaces.js';
import { ArrayLogicOperations } from './logic/ArrayLogicOperations.js';
import { Plugins } from './registries/index.js';
import { GetPathValue } from './utils/getPathValue.js';

// Config-like shape accepted by #validateConfiguration - both the root FilterConfigInterface
// and a nested FilterConditionInterface (which reuses gate/conditions for sub-groups) satisfy it
interface ValidatableConfigInterface {
  'conditions'?: FilterConditionInterface[];
  'gate'?: string;
  'mode'?: FilterModeFunctionInterface;
}

// Bundled operator-application arguments threaded through the wildcard/level helpers
interface OperatorApplicationContextInterface {
  'condition': FilterConditionInterface;
  'data'?: unknown;
  'filterValue': FilterValueEntity.Type;
  'operator': string;
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
      FilterEngineHelpers.throwInvalidConfigError(config);
    }

    // Merge with defaults
    const normalizedConfig = {
      ...DefaultConfig,
      ...config
    };

    // Set maximum nesting depth and maximum path depth (default from config, min 1, max 100)
    this.maximumDepth = FilterEngineHelpers.clampDepth(normalizedConfig.maximumDepth);
    this.maximumPathDepth = FilterEngineHelpers.clampDepth(normalizedConfig.maximumPathDepth);

    // Validate and set filter mode (REQUIRED - no default)
    this.mode = FilterEngineHelpers.resolveMode(normalizedConfig.mode);

    // Set up plugin registry with class instances only
    this.registry = normalizedConfig.registry instanceof Plugins
      ? normalizedConfig.registry
      : new Plugins({ 'plugins': normalizedConfig.plugins });

    // Initialize all properties first for V8 optimization (maintaining hidden classes)
    this.includeErrors = normalizedConfig.includeErrors;
    this.gate = FilterEngineHelpers.resolveGate(normalizedConfig.gate, this.registry);
    this.conditions = FilterEngineHelpers.resolveConditions({ 'conditions': normalizedConfig.conditions, 'gate': normalizedConfig.gate });
    this.compiledConditions = [];

    if (this.#hasEmptyConditions()) {
      return;
    }

    this.#validateAllConfigurations(normalizedConfig);
    this.compiledConditions = ConditionCompiler.compileConditions(this.conditions);
  }

  // Validates the root configuration plus every nested condition that carries its own
  // gate/conditions (mode is inherited, so nested groups only need gate+conditions).
  #validateAllConfigurations(normalizedConfig: ValidatableConfigInterface): void {
    if (this.conditions.length === 0) {
      return;
    }

    this.#validateConfiguration(normalizedConfig);

    const conditionsLength = this.conditions.length;

    for (let i = 0; i < conditionsLength; i++) {
      const nestedCondition = this.conditions[i];

      if (nestedCondition !== undefined && (nestedCondition.gate !== undefined || nestedCondition.conditions !== undefined)) {
        this.#validateConfiguration(nestedCondition, 1);
      }
    }
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
    context: OperatorApplicationContextInterface,
    options: { 'wildcardLevel'?: number } = {}
  ): boolean {
    const wildcardLevel = options.wildcardLevel ?? 0;
    const nestedConditions = context.condition.conditions;

    if (nestedConditions !== undefined && nestedConditions.length > 0) {
      const result = this.#applyArrayWildcardConditions(wildcardValue, context.condition, nestedConditions, wildcardLevel);

      return result;
    }

    const result = this.#applyArrayWildcardOperator(wildcardValue, context, wildcardLevel);

    return result;
  }

  #applyArrayWildcardConditions(
    wildcardValue: ArrayWildcardValueInterface,
    condition: FilterConditionInterface,
    nestedConditions: FilterConditionInterface[],
    wildcardLevel: number
  ): boolean {
    const { array } = wildcardValue;
    const results: boolean[] = [];
    const arrayLength = array.length;

    for (let i = 0; i < arrayLength; i++) {
      results.push(this.#evaluateConditions(
        RuntimeValue.intake(array[i]),
        nestedConditions,
        { 'gate': condition.rowGate ?? DEFAULT_GATE_NAME }
      ));
    }

    // Get the appropriate groupGate for this wildcard level
    const groupGate = this.#getGroupGateForLevel(condition, wildcardLevel);
    const result = this.#applyArrayLogic(results, groupGate);

    return result;
  }

  #applyArrayWildcardOperator(
    wildcardValue: ArrayWildcardValueInterface,
    context: OperatorApplicationContextInterface,
    wildcardLevel: number
  ): boolean {
    const { array, remainingPath } = wildcardValue;
    const results: boolean[] = [];
    const remainingPathValue = remainingPath.length > 0
      ? remainingPath.join('.')
      : null;
    const arrayLength = array.length;

    for (let i = 0; i < arrayLength; i++) {
      const rawItem = array[i];
      const value = remainingPathValue !== null
        ? GetPathValue.getPathValue(RuntimeValue.intake(rawItem), remainingPathValue, this.maximumPathDepth)
        : RuntimeValue.intake(rawItem);

      // Pass the wildcard level to nested evaluations
      results.push(this.#applyOperatorWithLevel(value, context, wildcardLevel));
    }

    // Get the appropriate groupGate for this wildcard level
    const groupGate = this.#getGroupGateForLevel(context.condition, wildcardLevel);
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
      const context: OperatorApplicationContextInterface = { 'condition': condition, 'filterValue': filterValue, 'operator': operator, ...(data !== null && { 'data': data }) };
      const result = this.#applyArrayWildcard(value, context, { 'wildcardLevel': 0 });

      return result;
    }

    // Options object seen by operator functions — data omitted when not supplied,
    // matching the pre-redesign behavior of never fabricating a fallback value.
    const options: { 'condition': FilterConditionInterface; 'data'?: unknown } = {
      'condition': condition,
      ...(data !== null && { 'data': data })
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

    const result = handler(RuntimeValue.intake(value), filterValue, options);

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
  #applyOperatorWithLevel(value: unknown, context: OperatorApplicationContextInterface, wildcardLevel: number): boolean {
    const { condition, data = null, filterValue, operator } = context;

    if (FilterTypeGuards.isArrayWildcardValue(value)) {
      // Increment level for nested wildcards
      const result = this.#applyArrayWildcard(value, context, { 'wildcardLevel': wildcardLevel + 1 });

      return result;
    }

    const operatorResult = this.#applyOperator(value, operator, filterValue, condition, data);

    return operatorResult;
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

    const evaluation = this.#evaluateConditionList(data, conditions, { 'errors': errors, 'gate': gate, 'path': path });

    if (evaluation.shortCircuit !== null) {
      return evaluation.shortCircuit;
    }

    const result = this.#runGate(gate, evaluation.results, errors);

    return result;
  }

  #evaluateConditionList(
    data: unknown,
    conditions: FilterConditionInterface[],
    context: { 'errors': FilterEvaluationErrorEntryInterface[] | null, 'gate': string, 'path': string }
  ): { 'results': boolean[], 'shortCircuit': boolean | null } {
    const results: boolean[] = [];
    const conditionsLength = conditions.length;

    // Evaluate each condition
    for (let i = 0; i < conditionsLength; i++) {
      const condition = conditions[i];

      if (condition === undefined) {
        continue;
      }

      const conditionResult = context.errors !== null
        ? this.#evaluateSingleConditionWithErrors(data, condition, context.errors, context.path)
        : this.#evaluateSingleCondition(data, condition);

      results.push(conditionResult);

      const shortCircuit = this.#checkGateShortCircuit(context.gate, conditionResult);

      if (shortCircuit !== null) {
        return { 'results': results, 'shortCircuit': shortCircuit };
      }
    }

    return { 'results': results, 'shortCircuit': null };
  }

  // Short-circuit based on error collection mode
  #checkGateShortCircuit(gate: string, conditionResult: boolean): boolean | null {
    if (this.includeErrors !== ErrorCollectionMode.FIRST) {
      return null;
    }

    if (gate === 'CORE.AND' && !conditionResult) {
      return false;
    }

    if (gate === 'CORE.OR' && conditionResult) {
      return true;
    }

    return null;
  }

  #resolveGateFunction(gate: string): LogicGateFunctionInterface {
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

    return gateFunction;
  }

  #runGate(gate: string, results: boolean[], errors: FilterEvaluationErrorEntryInterface[] | null): boolean {
    const gateFunction = this.#resolveGateFunction(gate);

    try {
      const result = gateFunction(results);

      return result;
    } catch (error) {
      if (errors !== null) {
        const errorMessage = ThrownValueEntity.intake(error).detail;

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
    // For nested conditions, maintain the current path (don't add .conditions)
    const result = condition.type === ConditionType.CORE.LOGICAL
      ? this.#evaluateConditions(data, condition.conditions ?? [], { 'errors': errors, 'gate': condition.gate, 'path': path })
      : this.#evaluateFieldConditionWithErrors(data, condition, errors, path);

    const finalResult = condition.negate === true ? !result : result;

    return finalResult;
  }

  #evaluateFieldConditionWithErrors(
    data: unknown,
    condition: FilterConditionInterface,
    errors: FilterEvaluationErrorEntryInterface[],
    path: string
  ): boolean {
    const operator = condition.operator;

    if (operator === undefined) {
      throw new FilterOperatorError('Condition is missing an operator', {});
    }

    const fieldPath = condition.path ?? '';
    // Apply converter if specified
    const value = GetPathValue.getPathValue(data, fieldPath, this.maximumPathDepth);
    const outcome = this.#applyOperatorCapturingError(value, operator, condition, data, errors);

    if (!outcome.result && !outcome.errorAdded) {
      this.#recordConditionFailure(condition, value, { 'fieldPath': fieldPath, 'operator': operator, 'path': path }, errors);
    }

    return outcome.result;
  }

  #applyOperatorCapturingError(
    value: unknown,
    operator: string,
    condition: FilterConditionInterface,
    data: unknown,
    errors: FilterEvaluationErrorEntryInterface[]
  ): { 'errorAdded': boolean, 'result': boolean } {
    try {
      const result = this.#applyOperator(value, operator, condition.value ?? null, condition, data);

      return { 'errorAdded': false, 'result': result };
    } catch (error) {
      // Handle plugin operator errors gracefully; always collect errors when errors array is provided
      const errorMessage = ThrownValueEntity.intake(error).detail;
      const isBuiltIn = this.registry.operators.isBuiltIn(operator);

      errors.push({
        'actual': value,
        'expected': condition.value,
        'field': condition.path ?? '',
        'message': errorMessage !== '' ? errorMessage : 'Operator error',
        'operator': operator,
        'operatorSource': isBuiltIn ? 'builtin' : 'plugin'
      });

      return { 'errorAdded': true, 'result': false };
    }
  }

  #recordConditionFailure(
    condition: FilterConditionInterface,
    value: unknown,
    location: { 'fieldPath': string, 'operator': string, 'path': string },
    errors: FilterEvaluationErrorEntryInterface[]
  ): void {
    const { fieldPath, operator, path } = location;
    // The fieldPath is already the full path from the data root (e.g., "user.profile.email")
    // We only prepend 'path' if we're in a nested evaluation context (like array wildcards)
    const fullPath = path !== '' && !fieldPath.startsWith(path) ? `${path}.${fieldPath}` : fieldPath;
    const isBuiltIn = this.registry.operators.isBuiltIn(operator);

    errors.push({
      'actual': value,
      'expected': condition.value,
      // Use the full path as the field
      'field': fullPath,
      'message': FilterErrorMessageFormatter.formatErrorMessage(condition, value),
      'negate': condition.negate ?? false,
      'operator': operator,
      'operatorSource': isBuiltIn ? 'builtin' : 'plugin',
      'path': fullPath
    });
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
   * Checks if evaluation should return true early (no meaningful conditions)
   * @returns {boolean} True if should return true immediately
   */
  #shouldReturnTrueEarly(): boolean {
    if (this.compiledConditions.length === 0) {
      return true;
    }

    if (this.compiledConditions.length !== 1) {
      return false;
    }

    const onlyCondition = this.compiledConditions[0];
    if (onlyCondition === undefined) {
      return false;
    }

    const result = onlyCondition.type === ConditionType.CORE.LOGICAL
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
    this.#validateConfigurationDepth(depth);
    this.#validateConfigurationShape(config, depth);

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
    this.#validateConfigurationMode(config.mode);

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

    this.#validateNestedConditionsList(nestedConditions, depth);

    return true;
  }

  // Check if we've exceeded maximum nesting depth
  #validateConfigurationDepth(depth: number): void {
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
  }

  #validateConfigurationShape(config: ValidatableConfigInterface, depth: number): void {
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
  }

  #validateConfigurationMode(mode: FilterModeFunctionInterface | undefined): void {
    if (mode !== undefined && !Object.values(FilterMode.CORE).includes(mode)) {
      throw new FilterConfigurationError(
        `Invalid filter mode: '${typeof mode}'. Must be one of: ${Object.keys(FilterMode.CORE).join(', ')}`,
        {
          'mode': mode,
          'validModes': Object.keys(FilterMode.CORE)
        }
      );
    }
  }

  #validateNestedConditionsList(nestedConditions: FilterConditionInterface[], depth: number): void {
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
        `Invalid nested condition at index ${index}: ${ThrownValueEntity.intake(error).detail}`,
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
    const processedErrors = valid ? [] : this.#processEvaluationErrors(errors);

    return {
      'errors': processedErrors,
      'valid': valid
    };
  }

  #processEvaluationErrors(errors: FilterEvaluationErrorEntryInterface[]): ProcessedFilterErrorInterface[] {
    const processedErrors: ProcessedFilterErrorInterface[] = [];
    const errorsLength = errors.length;

    for (let errorIndex = 0; errorIndex < errorsLength; errorIndex += 1) {
      const error = errors[errorIndex];

      if (error === undefined) {
        continue;
      }

      processedErrors.push(FilterEngineHelpers.toProcessedError(error));
    }

    return processedErrors;
  }
}

export { FilterEngine };
