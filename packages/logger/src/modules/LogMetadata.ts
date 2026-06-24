import type { CoreLogFieldsType } from '../interfaces/CoreLogFieldsType.js';
import type { CorrelationFieldsType } from '../interfaces/CorrelationFieldsType.js';
import type { ErrorFieldsType } from '../interfaces/ErrorFieldsType.js';
import type { TimingFieldsType } from '../interfaces/TimingFieldsType.js';
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
  public static hasCorrelation(metadata: CoreLogFieldsType): metadata is CorrelationMetadataType {
    return 'requestId' in metadata
      && typeof (metadata as CorrelationFieldsType).requestId === 'string';
  }

  /**
   * Type guard: check if metadata has timing fields.
   *
   * @param metadata - The metadata to check
   * @returns True if metadata has durationMs
   */
  public static hasTiming(metadata: CoreLogFieldsType): metadata is TimingMetadataType {
    return 'durationMs' in metadata
      && typeof (metadata as TimingFieldsType).durationMs === 'number';
  }

  /**
   * Type guard: check if metadata has error fields.
   *
   * @param metadata - The metadata to check
   * @returns True if metadata has error
   */
  public static hasError(metadata: CoreLogFieldsType): metadata is ErrorMetadataType {
    return 'error' in metadata
      && typeof (metadata as ErrorFieldsType).error === 'string';
  }
}
