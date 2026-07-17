import type { CoreLogFieldsEntity } from '../entities/CoreLogFieldsEntity.js';
import type { CorrelationFieldsEntity } from '../entities/CorrelationFieldsEntity.js';
import type { ErrorFieldsEntity } from '../entities/ErrorFieldsEntity.js';
import type { TimingFieldsEntity } from '../entities/TimingFieldsEntity.js';
import type {
  CorrelationMetadataType,
  ErrorMetadataType,
  TimingMetadataType
} from '../types/LogMetadataType.js';

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
  public static hasCorrelation(metadata: CoreLogFieldsEntity.Type): metadata is CorrelationMetadataType {
    return 'requestId' in metadata
      && typeof (metadata as CorrelationFieldsEntity.Type).requestId === 'string';
  }

  /**
   * Type guard: check if metadata has timing fields.
   *
   * @param metadata - The metadata to check
   * @returns True if metadata has durationMs
   */
  public static hasTiming(metadata: CoreLogFieldsEntity.Type): metadata is TimingMetadataType {
    return 'durationMs' in metadata
      && typeof (metadata as TimingFieldsEntity.Type).durationMs === 'number';
  }

  /**
   * Type guard: check if metadata has error fields.
   *
   * @param metadata - The metadata to check
   * @returns True if metadata has error
   */
  public static hasError(metadata: CoreLogFieldsEntity.Type): metadata is ErrorMetadataType {
    return 'error' in metadata
      && typeof (metadata as ErrorFieldsEntity.Type).error === 'string';
  }
}
