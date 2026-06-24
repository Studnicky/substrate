import { Guard } from '@studnicky/config';

import type { AdaptiveConfigEntity } from '../../entities/AdaptiveConfigEntity.js';
import type { ThrottleConfigEntity } from '../../entities/ThrottleConfigEntity.js';

import {
  INITIAL_COUNTER,
  MIN_ADJUSTMENT_INTERVAL,
  MIN_CONCURRENCY_LIMIT,
  MIN_SAMPLE_WINDOW
} from '../../constants/index.js';

type AdaptiveConfigType = AdaptiveConfigEntity.Type;
type ThrottleConfigType = ThrottleConfigEntity.Type;

class AdaptiveConfigValidator {
  static isValidPositiveInteger(value: unknown, min: number): boolean {
    return typeof value === 'number' && Number.isInteger(value) && value >= min;
  }

  static isValidPositiveNumber(value: unknown): boolean {
    return typeof value === 'number' && value > INITIAL_COUNTER;
  }

  /**
   * Validate optional concurrency fields (minConcurrency, maxConcurrency, stepSize)
   *
   * @param obj - Object containing fields to validate
   * @returns True if all present concurrency fields are valid
   */
  static hasConcurrencyFields(obj: Record<string, unknown>): boolean {
    if (obj.minConcurrency !== undefined && !AdaptiveConfigValidator.isValidPositiveInteger(obj.minConcurrency, MIN_CONCURRENCY_LIMIT)) {
      return false;
    }

    if (obj.maxConcurrency !== undefined && !AdaptiveConfigValidator.isValidPositiveInteger(obj.maxConcurrency, MIN_CONCURRENCY_LIMIT)) {
      return false;
    }

    if (obj.stepSize !== undefined && !AdaptiveConfigValidator.isValidPositiveInteger(obj.stepSize, MIN_CONCURRENCY_LIMIT)) {
      return false;
    }

    return true;
  }

  /**
   * Validate optional threshold fields (scaleUpThreshold, scaleDownThreshold)
   *
   * @param obj - Object containing fields to validate
   * @returns True if all present threshold fields are valid
   */
  static hasThresholdFields(obj: Record<string, unknown>): boolean {
    if (obj.scaleUpThreshold !== undefined && !AdaptiveConfigValidator.isValidPositiveNumber(obj.scaleUpThreshold)) {
      return false;
    }

    if (obj.scaleDownThreshold !== undefined && !AdaptiveConfigValidator.isValidPositiveNumber(obj.scaleDownThreshold)) {
      return false;
    }

    return true;
  }

  /**
   * Validate optional timing fields (sampleWindow, adjustmentInterval)
   *
   * @param obj - Object containing fields to validate
   * @returns True if all present timing fields are valid
   */
  static hasTimingFields(obj: Record<string, unknown>): boolean {
    if (obj.sampleWindow !== undefined && !AdaptiveConfigValidator.isValidPositiveInteger(obj.sampleWindow, MIN_SAMPLE_WINDOW)) {
      return false;
    }

    const hasInvalidInterval = obj.adjustmentInterval !== undefined
      && !AdaptiveConfigValidator.isValidPositiveInteger(obj.adjustmentInterval, MIN_ADJUSTMENT_INTERVAL);

    if (hasInvalidInterval) {
      return false;
    }

    return true;
  }

  /**
   * Type guard that checks if value is a valid AdaptiveConfigType
   *
   * Validates the adaptive throttling configuration including enabled state,
   * target latency, concurrency bounds, thresholds, and timing fields.
   *
   * @param value - Value to check
   * @returns True if value is a valid AdaptiveConfigType
   */
  static isAdaptiveConfig(value: unknown): value is AdaptiveConfigType {
    if (typeof value !== 'object' || value === null) {
      return false;
    }

    const obj = value as Record<string, unknown>;

    if (typeof obj.enabled !== 'boolean') {
      return false;
    }

    // When disabled, other fields are optional
    if (!obj.enabled) {
      return true;
    }

    // When enabled, validate required fields
    if (!AdaptiveConfigValidator.isValidPositiveNumber(obj.targetLatencyMs)) {
      return false;
    }

    // Validate optional field groups
    return AdaptiveConfigValidator.hasConcurrencyFields(obj)
      && AdaptiveConfigValidator.hasThresholdFields(obj)
      && AdaptiveConfigValidator.hasTimingFields(obj);
  }
}

/**
 * Type guard that checks if value is a valid ThrottleConfigType
 *
 * Validates that the value is an object with valid optional concurrencyLimit
 * and adaptive configuration fields.
 *
 * @param value - Value to check
 * @returns True if value is a valid ThrottleConfigType
 */
export function isThrottleConfig(value: unknown): value is ThrottleConfigType {
  if (!Guard.isObject(value)) {
    return false;
  }

  if (value.concurrencyLimit !== undefined && !Guard.isPositiveInteger(value.concurrencyLimit)) {
    return false;
  }

  if (value.adaptive !== undefined && !AdaptiveConfigValidator.isAdaptiveConfig(value.adaptive)) {
    return false;
  }

  return true;
}
