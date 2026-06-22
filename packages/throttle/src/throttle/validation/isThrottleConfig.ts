import { TypeGuards } from '@studnicky/config';

import type {
  AdaptiveConfigType,
  ThrottleConfigType
} from '../../interfaces/index.js';

import {
  INITIAL_COUNTER,
  MIN_ADJUSTMENT_INTERVAL,
  MIN_CONCURRENCY_LIMIT,
  MIN_SAMPLE_WINDOW
} from '../../constants/index.js';

/**
 * Check if a value is a valid positive integer with minimum
 *
 * @param value - Value to check
 * @param min - Minimum value (inclusive)
 * @returns True if valid positive integer at or above minimum
 */
function isValidPositiveInteger(value: unknown, min: number): boolean {
  return typeof value === 'number' && Number.isInteger(value) && value >= min;
}

/**
 * Check if a value is a valid positive number (> 0)
 *
 * @param value - Value to check
 * @returns True if valid positive number
 */
function isValidPositiveNumber(value: unknown): boolean {
  return typeof value === 'number' && value > INITIAL_COUNTER;
}

/**
 * Validate optional concurrency fields (minConcurrency, maxConcurrency, stepSize)
 *
 * @param obj - Object containing fields to validate
 * @returns True if all present concurrency fields are valid
 */
function hasValidConcurrencyFields(obj: Record<string, unknown>): boolean {
  if (obj.minConcurrency !== undefined && !isValidPositiveInteger(obj.minConcurrency, MIN_CONCURRENCY_LIMIT)) {
    return false;
  }

  if (obj.maxConcurrency !== undefined && !isValidPositiveInteger(obj.maxConcurrency, MIN_CONCURRENCY_LIMIT)) {
    return false;
  }

  if (obj.stepSize !== undefined && !isValidPositiveInteger(obj.stepSize, MIN_CONCURRENCY_LIMIT)) {
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
function hasValidThresholdFields(obj: Record<string, unknown>): boolean {
  if (obj.scaleUpThreshold !== undefined && !isValidPositiveNumber(obj.scaleUpThreshold)) {
    return false;
  }

  if (obj.scaleDownThreshold !== undefined && !isValidPositiveNumber(obj.scaleDownThreshold)) {
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
function hasValidTimingFields(obj: Record<string, unknown>): boolean {
  if (obj.sampleWindow !== undefined && !isValidPositiveInteger(obj.sampleWindow, MIN_SAMPLE_WINDOW)) {
    return false;
  }

  const hasInvalidInterval = obj.adjustmentInterval !== undefined
    && !isValidPositiveInteger(obj.adjustmentInterval, MIN_ADJUSTMENT_INTERVAL);

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
function isAdaptiveConfig(value: unknown): value is AdaptiveConfigType {
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
  if (!isValidPositiveNumber(obj.targetLatencyMs)) {
    return false;
  }

  // Validate optional field groups
  return hasValidConcurrencyFields(obj)
    && hasValidThresholdFields(obj)
    && hasValidTimingFields(obj);
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
  if (!TypeGuards.isObject(value)) {
    return false;
  }

  if (value.concurrencyLimit !== undefined && !TypeGuards.isPositiveInteger(value.concurrencyLimit)) {
    return false;
  }

  if (value.adaptive !== undefined && !isAdaptiveConfig(value.adaptive)) {
    return false;
  }

  return true;
}
