import { Predicates } from '@studnicky/types';

import type { CoreLogFieldsEntity } from '../entities/CoreLogFieldsEntity.js';
import type { CorrelationMetadataInterface } from '../interfaces/CorrelationMetadataInterface.js';
import type { ErrorMetadataInterface } from '../interfaces/ErrorMetadataInterface.js';
import type { TimingMetadataInterface } from '../interfaces/TimingMetadataInterface.js';

/**
 * Type guards for narrowing log metadata shapes.
 */
export class LogMetadata {
  /**
   * Type guard: check if metadata has correlation fields.
   *
   * @param metadata - The metadata to check
   * @returns True if metadata has requestId
   */
  public static hasCorrelation(metadata: CoreLogFieldsEntity.Type): metadata is CorrelationMetadataInterface {
    const result = 'requestId' in metadata
      && Predicates.isString(metadata.requestId);
    return result;
  }

  /**
   * Type guard: check if metadata has timing fields.
   *
   * @param metadata - The metadata to check
   * @returns True if metadata has durationMs
   */
  public static hasTiming(metadata: CoreLogFieldsEntity.Type): metadata is TimingMetadataInterface {
    const result = 'durationMs' in metadata
      && Predicates.isNumber(metadata.durationMs);
    return result;
  }

  /**
   * Type guard: check if metadata has error fields.
   *
   * @param metadata - The metadata to check
   * @returns True if metadata has error
   */
  public static hasError(metadata: CoreLogFieldsEntity.Type): metadata is ErrorMetadataInterface {
    const result = 'error' in metadata
      && Predicates.isString(metadata.error);
    return result;
  }
}
