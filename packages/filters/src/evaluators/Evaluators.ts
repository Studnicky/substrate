/**
 * @module Evaluators
 * @description Logic gate evaluation implementations for FilterEngine
 */

import type { FilterConditionInterface } from '../interfaces.js';

import { LogicGate } from '../enums/LogicGate.js';

/**
 * Logic gate evaluation implementations
 */
export class Evaluators {
  // Map of gate evaluators for efficient lookup
  static gateEvaluators = new Map([
    [
      LogicGate.CORE.AND,
      Evaluators.evaluateAndGate
    ],
    [
      LogicGate.CORE.NOT,
      Evaluators.evaluateNotGate
    ],
    [
      LogicGate.CORE.OR,
      Evaluators.evaluateOrGate
    ],
    [
      LogicGate.CORE.XOR,
      Evaluators.evaluateXorGate
    ]
  ]);

  /**
   * Evaluates AND gate logic - all criteria must be true
   * @param {Array} criteria - Array of criteria to evaluate
   * @param {Function} evaluator - Function to evaluate each condition
   * @returns {boolean} True if all criteria evaluate to true
   */
  static evaluateAndGate(criteria: FilterConditionInterface[], evaluator: (_condition: FilterConditionInterface) => boolean): boolean {
    const criteriaLength = criteria.length;

    for (let i = 0; i < criteriaLength; i++) {
      const criterion = criteria[i];

      if (criterion !== undefined && !evaluator(criterion)) {
        return false;
      }
    }

    return true;
  }

  /**
   * Evaluates NOT gate logic - returns true if any condition is false
   * @param {Array} criteria - Array of criteria to evaluate
   * @param {Function} evaluator - Function to evaluate each condition
   * @returns {boolean} True if any condition evaluates to false
   */
  static evaluateNotGate(criteria: FilterConditionInterface[], evaluator: (_condition: FilterConditionInterface) => boolean): boolean {
    const criteriaLength = criteria.length;

    for (let i = 0; i < criteriaLength; i++) {
      const criterion = criteria[i];

      if (criterion !== undefined && !evaluator(criterion)) {
        return true;
      }
    }

    return false;
  }

  /**
   * Evaluates OR gate logic - at least one condition must be true
   * @param {Array} criteria - Array of criteria to evaluate
   * @param {Function} evaluator - Function to evaluate each condition
   * @returns {boolean} True if any condition evaluates to true
   */
  static evaluateOrGate(criteria: FilterConditionInterface[], evaluator: (_condition: FilterConditionInterface) => boolean): boolean {
    const criteriaLength = criteria.length;

    for (let i = 0; i < criteriaLength; i++) {
      const criterion = criteria[i];

      if (criterion !== undefined && evaluator(criterion)) {
        return true;
      }
    }

    return false;
  }

  /**
   * Evaluates XOR gate logic - exactly one condition must be true
   * @param {Array} criteria - Array of criteria to evaluate
   * @param {Function} evaluator - Function to evaluate each condition
   * @returns {boolean} True if exactly one condition evaluates to true
   */
  static evaluateXorGate(criteria: FilterConditionInterface[], evaluator: (_condition: FilterConditionInterface) => boolean): boolean {
    let matchCount = 0;
    const criteriaLength = criteria.length;

    for (let i = 0; i < criteriaLength; i++) {
      const criterion = criteria[i];

      if (criterion !== undefined && evaluator(criterion)) {
        matchCount++;
        if (matchCount > 1) {
          return false;
        }
      }
    }

    const result = matchCount === 1;

    return result;
  }
}
