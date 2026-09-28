/**
 * @module FilterErrorMessageFormatter
 * @description Formats FilterEngine error messages and value displays; pure functions,
 * no engine instance state.
 */

import type { FilterValueEntity } from './FilterValueEntity.js';
import type { FilterConditionInterface } from './interfaces.js';

import { FilterEngineHelpers } from './FilterEngineHelpers.js';

class FilterErrorMessageFormatter {


  /**
   * Formats an error message for a failed condition
   * @private
   * @param {Object} condition - The condition that failed
   * @param {*} value - The actual value that failed
   * @returns {string} Formatted error message
   */
  static formatErrorMessage(condition: FilterConditionInterface, value: unknown): string {
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
        const result = FilterErrorMessageFormatter.formatOperatorMessage(category, type, expected, negate);

        return result;
      }
    }

    // Default message for unknown operators
    const result = `failed ${negate}${String(operatorName)} validation (expected: ${FilterErrorMessageFormatter.formatValue(expected)})`;

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
  static arrayContainsMessage(_expected: FilterValueEntity.Type, negate: string, expectedDisplay: string): string {
    const result = `must ${negate}contain ${expectedDisplay}`;

    return result;
  }

  static arrayEmptyMessage(_expected: FilterValueEntity.Type, negate: string, _expectedDisplay: string): string {
    const result = `must ${negate}be empty`;

    return result;
  }

  static arrayExcludesMessage(_expected: FilterValueEntity.Type, negate: string, expectedDisplay: string): string {
    const result = `must ${negate}exclude ${expectedDisplay}`;

    return result;
  }

  static arrayInMessage(_expected: FilterValueEntity.Type, negate: string, expectedDisplay: string): string {
    const result = `must ${negate}be in ${expectedDisplay}`;

    return result;
  }

  static arrayIncludesMessage(_expected: FilterValueEntity.Type, negate: string, expectedDisplay: string): string {
    const result = `must ${negate}include ${expectedDisplay}`;

    return result;
  }

  static arrayLengthMessage(expected: FilterValueEntity.Type, negate: string, _expectedDisplay: string): string {
    const result = `must have length ${negate}equal to ${expected}`;

    return result;
  }

  static arrayNotEmptyMessage(_expected: FilterValueEntity.Type, negate: string, _expectedDisplay: string): string {
    const result = `must ${negate}be non-empty`;

    return result;
  }

  static formatArrayOperatorMessage = (type: string, expected: FilterValueEntity.Type, negate: string, expectedDisplay: string): string => {
    const handlers: Map<string, (expected: FilterValueEntity.Type, negate: string, expectedDisplay: string) => string> = new Map([
      ['CONTAINS', FilterErrorMessageFormatter.arrayContainsMessage],
      ['EMPTY', FilterErrorMessageFormatter.arrayEmptyMessage],
      ['EXCLUDES', FilterErrorMessageFormatter.arrayExcludesMessage],
      ['IN', FilterErrorMessageFormatter.arrayInMessage],
      ['INCLUDES', FilterErrorMessageFormatter.arrayIncludesMessage],
      ['LENGTH', FilterErrorMessageFormatter.arrayLengthMessage],
      ['NOT_EMPTY', FilterErrorMessageFormatter.arrayNotEmptyMessage]
    ]);
    const handler = handlers.get(type);
    const result = handler !== undefined ? handler(expected, negate, expectedDisplay) : `must ${negate}pass ${type} validation`;

    return result;
  };

  static formatBooleanOperatorMessage(type: string, expected: FilterValueEntity.Type, negate: string): string {
    switch (type) {
      case 'EQUALS': return `must ${negate}equal ${expected}`;
      case 'FALSE': return `must ${negate}be false`;
      case 'FALSY': return `must ${negate}be falsy`;
      case 'TRUE': return `must ${negate}be true`;
      case 'TRUTHY': return `must ${negate}be truthy`;
      default: return `must ${negate}pass ${type} validation`;
    }
  }

  static crossAbsentMessage(_expected: FilterValueEntity.Type, negate: string, _expectedDisplay: string): string {
    const result = `must ${negate}be absent`;

    return result;
  }

  static crossDefinedMessage(_expected: FilterValueEntity.Type, negate: string, _expectedDisplay: string): string {
    const result = `must ${negate}be defined`;

    return result;
  }

  static crossEqualsMessage(_expected: FilterValueEntity.Type, negate: string, expectedDisplay: string): string {
    const result = `must ${negate}equal ${expectedDisplay}`;

    return result;
  }

  static crossExistsMessage(_expected: FilterValueEntity.Type, negate: string, _expectedDisplay: string): string {
    const result = `must ${negate}exist`;

    return result;
  }

  static crossNotNullMessage(_expected: FilterValueEntity.Type, negate: string, _expectedDisplay: string): string {
    const result = `must ${negate}be non-null`;

    return result;
  }

  static crossNullMessage(_expected: FilterValueEntity.Type, negate: string, _expectedDisplay: string): string {
    const result = `must ${negate}be null`;

    return result;
  }

  static crossTypeMessage(expected: FilterValueEntity.Type, negate: string, _expectedDisplay: string): string {
    const result = `must ${negate}be of type ${expected}`;

    return result;
  }

  static crossUndefinedMessage(_expected: FilterValueEntity.Type, negate: string, _expectedDisplay: string): string {
    const result = `must ${negate}be undefined`;

    return result;
  }

  static formatCrossOperatorMessage = (type: string, expected: FilterValueEntity.Type, negate: string, expectedDisplay: string): string => {
    const handlers: Map<string, (expected: FilterValueEntity.Type, negate: string, expectedDisplay: string) => string> = new Map([
      ['ABSENT', FilterErrorMessageFormatter.crossAbsentMessage],
      ['DEFINED', FilterErrorMessageFormatter.crossDefinedMessage],
      ['EQUALS', FilterErrorMessageFormatter.crossEqualsMessage],
      ['EXISTS', FilterErrorMessageFormatter.crossExistsMessage],
      ['NOT_NULL', FilterErrorMessageFormatter.crossNotNullMessage],
      ['NULL', FilterErrorMessageFormatter.crossNullMessage],
      ['TYPE', FilterErrorMessageFormatter.crossTypeMessage],
      ['UNDEFINED', FilterErrorMessageFormatter.crossUndefinedMessage]
    ]);
    const handler = handlers.get(type);
    const result = handler !== undefined ? handler(expected, negate, expectedDisplay) : `must ${negate}pass ${type} validation`;

    return result;
  };

  static formatDateOperatorMessage = (type: string, expected: FilterValueEntity.Type, negate: string, expectedDisplay: string): string => {
    switch (type) {
      case 'BETWEEN': return `must ${negate}be between ${FilterErrorMessageFormatter.formatValue(FilterEngineHelpers.readRangeBound(expected, 'min'))} and ${FilterErrorMessageFormatter.formatValue(FilterEngineHelpers.readRangeBound(expected, 'max'))}`;
      case 'EQUALS': return `must ${negate}equal ${expectedDisplay}`;
      case 'OUTSIDE': return `must ${negate}be outside ${FilterErrorMessageFormatter.formatValue(FilterEngineHelpers.readRangeBound(expected, 'min'))} to ${FilterErrorMessageFormatter.formatValue(FilterEngineHelpers.readRangeBound(expected, 'max'))}`;
      default: return `must ${negate}pass ${type} validation`;
    }
  };

  static numberBetweenMessage = (expected: FilterValueEntity.Type, negate: string): string => {
    const result = `must ${negate}be between ${FilterErrorMessageFormatter.formatValue(FilterEngineHelpers.readRangeBound(expected, 'min'))} and ${FilterErrorMessageFormatter.formatValue(FilterEngineHelpers.readRangeBound(expected, 'max'))}`;

    return result;
  };

  static numberEqualsMessage(expected: FilterValueEntity.Type, negate: string): string {
    const result = `must ${negate}equal ${expected}`;

    return result;
  }

  static numberGreaterMessage(expected: FilterValueEntity.Type, negate: string): string {
    const result = `must ${negate}be greater than ${expected}`;

    return result;
  }

  static numberGreaterEqualMessage(expected: FilterValueEntity.Type, negate: string): string {
    const result = `must ${negate}be at least ${expected}`;

    return result;
  }

  static numberLessMessage(expected: FilterValueEntity.Type, negate: string): string {
    const result = `must ${negate}be less than ${expected}`;

    return result;
  }

  static numberLessEqualMessage(expected: FilterValueEntity.Type, negate: string): string {
    const result = `must ${negate}be at most ${expected}`;

    return result;
  }

  static numberOutsideMessage = (expected: FilterValueEntity.Type, negate: string): string => {
    const result = `must ${negate}be outside ${FilterErrorMessageFormatter.formatValue(FilterEngineHelpers.readRangeBound(expected, 'min'))} to ${FilterErrorMessageFormatter.formatValue(FilterEngineHelpers.readRangeBound(expected, 'max'))}`;

    return result;
  };

  static formatNumberOperatorMessage = (type: string, expected: FilterValueEntity.Type, negate: string): string => {
    const handlers: Map<string, (expected: FilterValueEntity.Type, negate: string) => string> = new Map([
      ['BETWEEN', FilterErrorMessageFormatter.numberBetweenMessage],
      ['EQUALS', FilterErrorMessageFormatter.numberEqualsMessage],
      ['GREATER', FilterErrorMessageFormatter.numberGreaterMessage],
      ['GREATER_EQUAL', FilterErrorMessageFormatter.numberGreaterEqualMessage],
      ['LESS', FilterErrorMessageFormatter.numberLessMessage],
      ['LESS_EQUAL', FilterErrorMessageFormatter.numberLessEqualMessage],
      ['OUTSIDE', FilterErrorMessageFormatter.numberOutsideMessage]
    ]);
    const handler = handlers.get(type);
    const result = handler !== undefined ? handler(expected, negate) : `must ${negate}pass ${type} validation`;

    return result;
  };

  static formatOperatorMessage(category: string, type: string, expected: FilterValueEntity.Type, negate: string): string {
    const expectedDisplay = FilterErrorMessageFormatter.formatValue(expected);
    const handlers: Map<string, (type: string, expected: FilterValueEntity.Type, negate: string, expectedDisplay: string) => string> = new Map([
      ['ARRAY', FilterErrorMessageFormatter.formatArrayOperatorMessage],
      ['BOOLEAN', FilterErrorMessageFormatter.formatBooleanOperatorMessage],
      ['CROSS', FilterErrorMessageFormatter.formatCrossOperatorMessage],
      ['DATE', FilterErrorMessageFormatter.formatDateOperatorMessage],
      ['NUMBER', FilterErrorMessageFormatter.formatNumberOperatorMessage],
      ['STRING', FilterErrorMessageFormatter.formatStringOperatorMessage]
    ]);
    const handler = handlers.get(category);
    const result = handler !== undefined
      ? handler(type, expected, negate, expectedDisplay)
      : `must ${negate}pass ${category}.${type} validation`;

    return result;
  }

  static stringContainsMessage(expected: FilterValueEntity.Type, negate: string, _expectedDisplay: string): string {
    const result = `must ${negate}contain "${expected}"`;

    return result;
  }

  static stringEmptyMessage(_expected: FilterValueEntity.Type, negate: string, _expectedDisplay: string): string {
    const result = `must ${negate}be empty`;

    return result;
  }

  static stringEndsWithMessage(expected: FilterValueEntity.Type, negate: string, _expectedDisplay: string): string {
    const result = `must ${negate}end with "${expected}"`;

    return result;
  }

  static stringEqualsMessage(expected: FilterValueEntity.Type, negate: string, _expectedDisplay: string): string {
    const result = `must ${negate}equal "${expected}"`;

    return result;
  }

  static stringLengthMessage(expected: FilterValueEntity.Type, negate: string, _expectedDisplay: string): string {
    const result = `must have length ${negate}equal to ${expected}`;

    return result;
  }

  static stringNotEmptyMessage(_expected: FilterValueEntity.Type, negate: string, _expectedDisplay: string): string {
    const result = `must ${negate}be non-empty`;

    return result;
  }

  static stringRegexMessage(_expected: FilterValueEntity.Type, negate: string, expectedDisplay: string): string {
    const result = `must ${negate}match pattern ${expectedDisplay}`;

    return result;
  }

  static stringStartsWithMessage(expected: FilterValueEntity.Type, negate: string, _expectedDisplay: string): string {
    const result = `must ${negate}start with "${expected}"`;

    return result;
  }

  static formatStringOperatorMessage = (type: string, expected: FilterValueEntity.Type, negate: string, expectedDisplay: string): string => {
    const handlers: Map<string, (expected: FilterValueEntity.Type, negate: string, expectedDisplay: string) => string> = new Map([
      ['CONTAINS', FilterErrorMessageFormatter.stringContainsMessage],
      ['EMPTY', FilterErrorMessageFormatter.stringEmptyMessage],
      ['ENDS_WITH', FilterErrorMessageFormatter.stringEndsWithMessage],
      ['EQUALS', FilterErrorMessageFormatter.stringEqualsMessage],
      ['LENGTH', FilterErrorMessageFormatter.stringLengthMessage],
      ['NOT_EMPTY', FilterErrorMessageFormatter.stringNotEmptyMessage],
      ['REGEX', FilterErrorMessageFormatter.stringRegexMessage],
      ['STARTS_WITH', FilterErrorMessageFormatter.stringStartsWithMessage]
    ]);
    const handler = handlers.get(type);
    const result = handler !== undefined ? handler(expected, negate, expectedDisplay) : `must ${negate}pass ${type} validation`;

    return result;
  };

  /**
   * Formats a value for display in error messages
   * @private
   * @param {*} value - The value to format
   * @param {number} maximumLength - Maximum string length
   * @returns {string} Formatted value
   */
  static formatValue(value: unknown, maximumLength = 100): string {
    const sentinel = FilterEngineHelpers.formatSentinelValue(value);

    if (sentinel !== null) {
      return sentinel;
    }

    const primitive = FilterErrorMessageFormatter.formatPrimitiveValue(value, maximumLength);

    if (primitive !== null) {
      return primitive;
    }

    const result = FilterErrorMessageFormatter.formatStructuralValue(value, maximumLength);

    return result;
  }

  static formatStringValue(value: string, maximumLength: number): string {
    if (value.length > maximumLength) {
      const result = `'${value.substring(0, maximumLength)}...'`;

      return result;
    }

    const result = `'${value}'`;

    return result;
  }

  // Type-keyed primitive formatters; `null` means `value` isn't a primitive this handles.
  static formatPrimitiveValue(value: unknown, maximumLength: number): string | null {
    if (typeof value === 'string') {
      const result = FilterErrorMessageFormatter.formatStringValue(value, maximumLength);

      return result;
    }
    if (typeof value === 'number') {
      const result = FilterEngineHelpers.formatNumberValue(value);

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

    return null;
  }

  static formatStructuralValue(value: unknown, maximumLength: number): string {
    if (value instanceof Date) {
      const result = value.toISOString();

      return result;
    }
    if (value instanceof RegExp) {
      const result = value.toString();

      return result;
    }
    if (Array.isArray(value)) {
      const result = FilterErrorMessageFormatter.formatArrayValue(value);

      return result;
    }
    if (typeof value === 'object' && value !== null) {
      const result = FilterEngineHelpers.formatObjectValue(value, maximumLength);

      return result;
    }

    const result = String(value);

    return result;
  }

  static formatArrayValue(value: unknown[]): string {
    if (value.length === 0) {
      return '[]';
    }
    if (value.length > 5) {
      return `[Array(${value.length})]`;
    }

    const formattedItems = value.map((item) => {
      const formattedItem = FilterErrorMessageFormatter.formatValue(item, 20);

      return formattedItem;
    });
    const result = `[${formattedItems.join(', ')}]`;

    return result;
  }
}

export { FilterErrorMessageFormatter };
