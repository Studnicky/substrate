/**
 * Log schema type guards and utilities for CloudWatch indexable logs.
 */

import type { CoreLogFieldsType } from '../interfaces/CoreLogFieldsType.js';
import type { CorrelationFieldsType } from '../interfaces/CorrelationFieldsType.js';
import type { ErrorFieldsType } from '../interfaces/ErrorFieldsType.js';
import type { TimingFieldsType } from '../interfaces/TimingFieldsType.js';

/**
 * Metadata type with required correlation fields.
 * Used as the narrowed type when hasCorrelation returns true.
 */
export type CorrelationMetadataType = CoreLogFieldsType
  & Required<Pick<CorrelationFieldsType, 'requestId'>>;

/**
 * Metadata type with required timing fields.
 * Used as the narrowed type when hasTiming returns true.
 */
export type TimingMetadataType = CoreLogFieldsType & Required<TimingFieldsType>;

/**
 * Metadata type with required error fields.
 * Used as the narrowed type when hasError returns true.
 */
export type ErrorMetadataType = CoreLogFieldsType
  & Required<Pick<ErrorFieldsType, 'error'>>;

/**
 * Type guard: check if metadata has correlation fields.
 *
 * @param metadata - The metadata to check
 * @returns True if metadata has requestId
 */
function hasCorrelation(metadata: CoreLogFieldsType): metadata is CorrelationMetadataType {
  return 'requestId' in metadata
    && typeof (metadata as CorrelationFieldsType).requestId === 'string';
}

/**
 * Type guard: check if metadata has timing fields.
 *
 * @param metadata - The metadata to check
 * @returns True if metadata has durationMs
 */
function hasTiming(metadata: CoreLogFieldsType): metadata is TimingMetadataType {
  return 'durationMs' in metadata
    && typeof (metadata as TimingFieldsType).durationMs === 'number';
}

/**
 * Type guard: check if metadata has error fields.
 *
 * @param metadata - The metadata to check
 * @returns True if metadata has error
 */
function hasError(metadata: CoreLogFieldsType): metadata is ErrorMetadataType {
  return 'error' in metadata
    && typeof (metadata as ErrorFieldsType).error === 'string';
}

// Export individual functions for direct imports
export {
  hasCorrelation,
  hasError,
  hasTiming
};
