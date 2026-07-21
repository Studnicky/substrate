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
    return 'requestId' in metadata
      && typeof metadata.requestId === 'string';
  }

  /**
   * Type guard: check if metadata has timing fields.
   *
   * @param metadata - The metadata to check
   * @returns True if metadata has durationMs
   */
  public static hasTiming(metadata: CoreLogFieldsEntity.Type): metadata is TimingMetadataInterface {
    return 'durationMs' in metadata
      && typeof metadata.durationMs === 'number';
  }

  /**
   * Type guard: check if metadata has error fields.
   *
   * @param metadata - The metadata to check
   * @returns True if metadata has error
   */
  public static hasError(metadata: CoreLogFieldsEntity.Type): metadata is ErrorMetadataInterface {
    return 'error' in metadata
      && typeof metadata.error === 'string';
  }
}
