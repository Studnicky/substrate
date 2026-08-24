/**
 * @module ArrayLogic
 * @description Centralized array logic operations for FilterEngine
 * Handles array wildcards, batch operations, and logical combinations
 */

import type { ArrayLogicFunction } from '../types.js';

import { Guard } from '../../guards/Guard.js';
import { ArrayLogic as ArrayLogicEnum } from '../enums/ArrayLogic.js';

interface GroupResult<T> {
  [key: string]: T[] | GroupResult<T>;
}

interface ReducerConfig<R> {
  'initialValue': R;
  'name': string;
}

interface PartitionRule<C> {
  'allowMultiple'?: boolean;
  'condition'?: C;
  'name': string;
}

interface ValidationSchema<T> {
  'itemValidator'?: (item: T) => { 'error'?: string; 'valid': boolean; };
  'maxLength'?: number;
  'minLength'?: number;
  'unique'?: boolean;
}

interface ValidationResult {
  'errors': string[];
  'valid': boolean;
}

/**
 * ArrayLogic - Handles all array-related logic operations
 */
export class ArrayLogic {
  /**
   * Apply logical operation to array of boolean results
   */
  static applyLogic(results: boolean[], logic: string | ArrayLogicFunction = ArrayLogicEnum.CORE.SOME): boolean {
    if (typeof logic === 'function') {
      return logic(results);
    }

    const namedHandlers: Record<string, ArrayLogicFunction> = ArrayLogicEnum.CORE;
    const handler = namedHandlers[logic] ?? ArrayLogicEnum.CORE.SOME;

    return handler(results);
  }

  /**
   * Batch evaluate multiple conditions on an array
   */
  static batchEvaluate<T, C>(
    array: T[],
    conditions: C[],
    evaluator: (item: T, condition: C) => boolean,
    itemLogic: string | ArrayLogicFunction = ArrayLogicEnum.CORE.SOME,
    conditionLogic: string | ArrayLogicFunction = ArrayLogicEnum.CORE.EVERY
  ): boolean {
    if (!Array.isArray(array) || !Array.isArray(conditions)) {
      return false;
    }

    const conditionResults = conditions.map((condition) => {
      const itemResults = array.map((item) => {return evaluator(item, condition);});

      return ArrayLogic.applyLogic(itemResults, itemLogic);
    });

    return ArrayLogic.applyLogic(conditionResults, conditionLogic);
  }

  /**
   * Filter array based on multiple conditions with batch operations
   */
  static batchFilter<T, C>(
    array: T[],
    conditions: C[],
    evaluator: (item: T, condition: C) => boolean,
    logic: string | ArrayLogicFunction = ArrayLogicEnum.CORE.EVERY
  ): T[] {
    if (!Array.isArray(array)) {
      return [];
    }

    return array.filter((item) => {
      const results = conditions.map((condition) => {return evaluator(item, condition);});

      return ArrayLogic.applyLogic(results, logic);
    });
  }

  /**
   * Map array with conditional transformations in batch
   */
  static batchMap<T, Tr>(array: T[], transformations: Tr[], transformer: (result: T, transformation: Tr) => T): T[] {
    if (!Array.isArray(array)) {
      return [];
    }

    return array.map((item) => {
      let result = item;
      const transformationsLength = transformations.length;

      for (let i = 0; i < transformationsLength; i++) {
        const transformation = transformations[i];

        if (transformation !== undefined) {
          result = transformer(result, transformation);
        }
      }

      return result;
    });
  }

  /**
   * Reduce array with multiple reducers in batch
   */
  static batchReduce<T, R>(
    array: T[],
    reducers: ReducerConfig<R>[],
    reducer: (acc: R, item: T, config: ReducerConfig<R>) => R
  ): Record<string, R> {
    if (!Array.isArray(array) || !Array.isArray(reducers)) {
      return {};
    }

    const results: Record<string, R> = {};

    const reducersLength = reducers.length;

    for (let i = 0; i < reducersLength; i++) {
      const config = reducers[i];

      if (config === undefined) {
        continue;
      }

      const reductionFunction = (acc: R, item: T): R => {return reducer(acc, item, config);};

      results[config.name] = array.reduce(reductionFunction, config.initialValue);
    }

    return results;
  }

  /**
   * Check if array contains items matching conditions
   */
  static contains<T>(array: T[], value: T | T[], logic: string | ArrayLogicFunction = ArrayLogicEnum.CORE.SOME): boolean {
    if (!Array.isArray(array)) {
      return false;
    }

    if (Array.isArray(value)) {
      const results = value.map((val) => {return array.includes(val);});

      return ArrayLogic.applyLogic(results, logic);
    }

    return array.includes(value);
  }

  /**
   * Process array wildcard paths and evaluate conditions
   */
  static evaluateWildcard<T>(
    array: T[],
    remainingPath: string[] | undefined,
    evaluator: (value: unknown) => boolean,
    logic: string | ArrayLogicFunction = ArrayLogicEnum.CORE.SOME
  ): boolean {
    if (!Array.isArray(array)) {
      return false;
    }

    const results = array.map((item) => {
      let value: unknown = item;

      if (remainingPath && remainingPath.length > 0) {
        const remainingPathLength = remainingPath.length;

        for (let j = 0; j < remainingPathLength; j++) {
          if (value === null || value === undefined) {
            break;
          }

          const key = remainingPath[j];

          value = key !== undefined && Guard.isRecord(value) ? value[key] : undefined;
        }
      }

      return evaluator(value);
    });

    return ArrayLogic.applyLogic(results, logic);
  }

  /**
   * Find items in array matching any/all conditions
   */
  static findWithLogic<T, C>(
    array: T[],
    conditions: C[],
    matcher: (item: T, condition: C) => boolean,
    logic: string | ArrayLogicFunction = ArrayLogicEnum.CORE.EVERY
  ): T | undefined {
    if (!Array.isArray(array)) {
      return undefined;
    }

    return array.find((item) => {
      const results = conditions.map((condition) => {return matcher(item, condition);});

      return ArrayLogic.applyLogic(results, logic);
    });
  }

  /**
   * Check if value is contained in array with logic
   */
  static isIn<T>(value: T | T[], array: T[], logic: string | ArrayLogicFunction = ArrayLogicEnum.CORE.SOME): boolean {
    if (!Array.isArray(array)) {
      return false;
    }

    if (Array.isArray(value)) {
      const results = value.map((val) => {return array.includes(val);});

      return ArrayLogic.applyLogic(results, logic);
    }

    return array.includes(value);
  }

  /**
   * Group array items by multiple criteria
   */
  static multiGroup<T>(array: T[], groupers: ((item: T) => string)[]): GroupResult<T> {
    if (!Array.isArray(array) || !Array.isArray(groupers) || groupers.length === 0) {
      return {};
    }

    const [
      firstGrouper,
      ...restGroupers
    ] = groupers;

    if (firstGrouper === undefined) {
      return {};
    }

    const groups: Record<string, T[]> = {};

    const arrayLength = array.length;

    for (let i = 0; i < arrayLength; i++) {
      const item = array[i];

      if (item === undefined) {
        continue;
      }

      const key = firstGrouper(item);
      let bucket = groups[key];

      if (bucket === undefined) {
        bucket = [];
        groups[key] = bucket;
      }

      bucket.push(item);
    }

    if (restGroupers.length === 0) {
      return groups;
    }

    const nestedGroups: GroupResult<T> = {};
    const keys = Object.keys(groups);
    const keysLength = keys.length;

    for (let i = 0; i < keysLength; i++) {
      const key = keys[i];

      if (key === undefined) {
        continue;
      }

      nestedGroups[key] = ArrayLogic.multiGroup(groups[key] ?? [], restGroupers);
    }

    return nestedGroups;
  }

  /**
   * Partition array into multiple buckets based on conditions
   */
  static partition<T, C>(array: T[], partitions: PartitionRule<C>[], evaluator: (item: T, condition: C | undefined) => boolean): Record<string, T[]> {
    if (!Array.isArray(array) || !Array.isArray(partitions)) {
      return {};
    }

    const result: Record<string, T[]> = {};
    const unmatched: T[] = [];

    const partitionsLength = partitions.length;

    for (let i = 0; i < partitionsLength; i++) {
      const partitionRule = partitions[i];

      if (partitionRule !== undefined) {
        result[partitionRule.name] = [];
      }
    }

    const arrayLength = array.length;

    for (let i = 0; i < arrayLength; i++) {
      const item = array[i];

      if (item === undefined) {
        continue;
      }

      let matched = false;

      for (let j = 0; j < partitionsLength; j++) {
        const partitionRule = partitions[j];

        if (partitionRule === undefined) {
          continue;
        }

        if (evaluator(item, partitionRule.condition)) {
          const bucket = result[partitionRule.name];

          if (bucket !== undefined) {
            bucket.push(item);
          }

          matched = true;

          if (!partitionRule.allowMultiple) {
            break;
          }
        }
      }

      if (!matched) {
        unmatched.push(item);
      }
    }

    if (unmatched.length > 0) {
      result.unmatched = unmatched;
    }

    return result;
  }

  /**
   * Validate array structure and content
   */
  static validate<T>(array: unknown, schema: ValidationSchema<T>): ValidationResult {
    const result: ValidationResult = {
      'errors': [],
      'valid': true
    };

    if (!Array.isArray(array)) {
      result.valid = false;
      result.errors.push('Value is not an array');

      return result;
    }

    if (schema.minLength !== undefined && array.length < schema.minLength) {
      result.valid = false;
      result.errors.push(`Array length ${array.length} is less than minimum ${schema.minLength}`);
    }

    if (schema.maxLength !== undefined && array.length > schema.maxLength) {
      result.valid = false;
      result.errors.push(`Array length ${array.length} exceeds maximum ${schema.maxLength}`);
    }

    if (schema.unique && array.length !== new Set(array).size) {
      result.valid = false;
      result.errors.push('Array contains duplicate values');
    }

    if (schema.itemValidator) {
      const itemValidator = schema.itemValidator;

      array.forEach((item: T, index: number) => {
        const itemResult = itemValidator(item);

        if (!itemResult.valid) {
          result.valid = false;
          result.errors.push(`Item at index ${index}: ${itemResult.error ?? 'unknown error'}`);
        }
      });
    }

    return result;
  }
}
