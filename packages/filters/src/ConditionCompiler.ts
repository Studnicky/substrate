/**
 * @module ConditionCompiler
 * @description Compiles raw FilterConditionInterface conditions into their optimized,
 * pre-resolved form (paths, regex, numeric bounds, case folding); no engine instance state.
 */

import type { FilterValueEntity } from './FilterValueEntity.js';
import type { FilterConditionInterface } from './interfaces.js';

import { DEFAULT_GATE_NAME } from './constants/DefaultGateName.js';
import { MAXIMUM_HEURISTIC_PATTERN_LENGTH } from './constants/MaximumHeuristicPatternLength.js';
import { REGEX_LIKE_PATTERN } from './constants/RegexLikePattern.js';
import { REGEX_SPECIAL_CHARS_PATTERN } from './constants/RegexSpecialCharsPattern.js';
import { SURROGATE_PAIR_PATTERN } from './constants/SurrogatePairPattern.js';
import { UNICODE_CODE_POINT_ESCAPE_PATTERN } from './constants/UnicodeCodePointEscapePattern.js';
import { UNICODE_PROPERTY_ESCAPE_PATTERN } from './constants/UnicodePropertyEscapePattern.js';
import { WILDCARD_SEGMENT_PATTERN } from './constants/WildcardSegmentPattern.js';
import { WILDCARD_STAR_PATTERN } from './constants/WildcardStarPattern.js';
import { ConditionType } from './enums/ConditionType.js';
import { FilterConfigurationError } from './errors/FilterConfigurationError.js';
import { RegexError } from './errors/RegexError.js';
import { NumericOperators } from './operators/NumericOperators.js';
import { ValidatePath } from './utils/validatePath.js';

class ConditionCompiler {
  /**
   * Compiles range values for BETWEEN and OUTSIDE operators
   * @param {Object} compiled - Compiled condition object
   * @param {Object} condition - Original condition
   */
  static compileBetweenRange(compiled: FilterConditionInterface, condition: FilterConditionInterface): void {
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
  static compileCaseInsensitiveValue(compiled: FilterConditionInterface): void {
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
  static compileCondition(condition: FilterConditionInterface): FilterConditionInterface {
    if (condition.gate !== undefined || condition.operator === 'group') {
      const result = ConditionCompiler.compileLogicalCondition(condition);

      return result;
    }

    const path = ConditionCompiler.resolveConditionPath(condition);

    ConditionCompiler.validateConditionPath(path);
    const groupGates = ConditionCompiler.resolveConditionGroupGates(path, condition);
    const compiled = ConditionCompiler.buildCompiledConditionBase(condition, groupGates);

    ConditionCompiler.applyCompiledConditionFields(compiled, condition, path);
    ConditionCompiler.compileRegexPattern(compiled, condition);
    ConditionCompiler.compileCaseInsensitiveValue(compiled);
    ConditionCompiler.compileNumericValues(compiled, condition);
    ConditionCompiler.compileBetweenRange(compiled, condition);

    return compiled;
  }

  static compileLogicalCondition(condition: FilterConditionInterface): FilterConditionInterface {
    const logicalCompiled: FilterConditionInterface = {};

    logicalCompiled.conditions = ConditionCompiler.compileConditions(condition.conditions ?? []);
    logicalCompiled.gate = condition.gate ?? DEFAULT_GATE_NAME;
    logicalCompiled.negate = condition.negate ?? false;
    logicalCompiled.type = ConditionType.CORE.LOGICAL;

    return logicalCompiled;
  }

  // Falls back path -> field -> pathway, taking the first defined, non-empty value.
  static resolveConditionPath(condition: FilterConditionInterface): string | undefined {
    if (condition.path !== undefined && condition.path !== '') {
      return condition.path;
    }
    if (condition.field !== undefined && condition.field !== '') {
      return condition.field;
    }

    return condition.pathway;
  }

  // Validate path format - paths MUST be in dot notation
  static validateConditionPath(path: string | undefined): void {
    if (path !== undefined && path !== '' && !ValidatePath.validatePath(path)) {
      throw new FilterConfigurationError(
        `Invalid path format: "${path}". Paths must use dot notation (e.g., "user.profile.name" or "items[0].value")`,
        {
          'property': 'path',
          'value': path
        }
      );
    }
  }

  static resolveConditionGroupGates(path: string | undefined, condition: FilterConditionInterface): string[] | undefined {
    // Count wildcards in the path
    const wildcardCount = path !== undefined ? [...path.matchAll(WILDCARD_SEGMENT_PATTERN)].length : 0;

    if (wildcardCount === 0) {
      return undefined;
    }

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

    return condition.groupGates;
  }

  static buildCompiledConditionBase(condition: FilterConditionInterface, groupGates: string[] | undefined): FilterConditionInterface {
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

    return compiled;
  }

  static applyCompiledConditionFields(compiled: FilterConditionInterface, condition: FilterConditionInterface, path: string | undefined): void {
    const rawNestedConditions = condition.conditions;

    if (rawNestedConditions !== undefined) {
      compiled.conditions = ConditionCompiler.compileConditions(rawNestedConditions);
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
  }

  /**
   * Compiles an array of conditions for optimized evaluation
   * @param {Array} conditions - Array of raw conditions
   * @returns {Array} Array of compiled conditions
   */
  static compileConditions(conditions: FilterConditionInterface[]): FilterConditionInterface[] {
    const compiled: FilterConditionInterface[] = [];
    const conditionsLength = conditions.length;

    for (let i = 0; i < conditionsLength; i++) {
      const condition = conditions[i];

      if (condition !== undefined) {
        compiled.push(ConditionCompiler.compileCondition(condition));
      }
    }

    return compiled;
  }

  /**
   * Compiles numeric values for numeric operators
   * @param {Object} compiled - Compiled condition object
   * @param {Object} condition - Original condition
   */
  static compileNumericValues(compiled: FilterConditionInterface, condition: FilterConditionInterface): void {
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
  static compileRegexPattern(compiled: FilterConditionInterface, condition: FilterConditionInterface): void {
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

      compiled.compiledRegex = ConditionCompiler.buildRegexFromPattern(compiled, condition);
    } catch {
      compiled.regexError = true;
      compiled.compiledRegex = null;
    }
  }

  static buildRegexFromPattern(compiled: FilterConditionInterface, condition: FilterConditionInterface): RegExp {
    let regexPattern: FilterValueEntity.Type = compiled.value ?? '';

    if (typeof condition.operator === 'string' && condition.operator.endsWith('.MATCHES') && typeof regexPattern === 'string') {
      regexPattern = ConditionCompiler.processMatchesPattern(regexPattern);
    }

    const regexSource = typeof regexPattern === 'string' ? regexPattern : String(regexPattern);

    // Add 'u' flag only when Unicode features are detected in the pattern
    const needsUnicodeFlag = ConditionCompiler.needsUnicodeFlag(regexSource);
    const flags = (compiled.caseSensitive === true ? '' : 'i') + (needsUnicodeFlag ? 'u' : '');

    try {
      // nosemgrep: javascript.lang.security.audit.detect-non-literal-regexp.detect-non-literal-regexp -- compiling a caller-authored .MATCHES/.REGEX filter condition is this engine's contracted feature, not attacker-supplied input
      const result = new RegExp(regexSource, flags);

      return result;
    } catch (error) {
      throw new RegexError('Invalid regular expression pattern', { 'cause': error, 'pattern': regexSource });
    }
  }

  /**
   * Determines if a regex pattern needs the Unicode flag
   * @private
   * @param {string} pattern - The regex pattern to check
   * @returns {boolean} True if Unicode flag is needed
   */
  static needsUnicodeFlag(pattern: unknown): boolean {
    if (typeof pattern !== 'string' || pattern.length > MAXIMUM_HEURISTIC_PATTERN_LENGTH) {
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
  static processMatchesPattern(pattern: string): string {
    const isRegexPattern = pattern.length <= MAXIMUM_HEURISTIC_PATTERN_LENGTH && REGEX_LIKE_PATTERN.test(pattern);

    if (isRegexPattern) {
      return pattern;
    }

    const result = `^${pattern.replace(REGEX_SPECIAL_CHARS_PATTERN, '\\$&').replace(WILDCARD_STAR_PATTERN, '.*')}$`;

    return result;
  }
}

export { ConditionCompiler };
