import type { CoreLogFieldsEntity } from '../entities/CoreLogFieldsEntity.js';
import type { CorrelationFieldsEntity } from '../entities/CorrelationFieldsEntity.js';
import type { ErrorFieldsEntity } from '../entities/ErrorFieldsEntity.js';
import type { TimingFieldsEntity } from '../entities/TimingFieldsEntity.js';

/**
 * Metadata object attached to log entries
 *
 * Supports arbitrary key-value pairs for contextual information such as
 * request IDs, user IDs, service names, or any other structured data.
 *
 * @example
 * ```typescript
 * const metadata: LogMetadata = {
 *   requestId: 'abc-123',
 *   userId: 'user-456',
 *   service: 'api-gateway'
 * };
 *
 * const logger = Logger.create({ metadata });
 * ```
 */
export type LogMetadataType = Record<string, unknown>;

/**
 * Metadata type with required correlation fields.
 * Used as the narrowed type when LogMetadata.hasCorrelation returns true.
 */
export type CorrelationMetadataType = CoreLogFieldsEntity.Type
  & Required<Pick<CorrelationFieldsEntity.Type, 'requestId'>>;

/**
 * Metadata type with required timing fields.
 * Used as the narrowed type when LogMetadata.hasTiming returns true.
 */
export type TimingMetadataType = CoreLogFieldsEntity.Type & Required<TimingFieldsEntity.Type>;

/**
 * Metadata type with required error fields.
 * Used as the narrowed type when LogMetadata.hasError returns true.
 */
export type ErrorMetadataType = CoreLogFieldsEntity.Type
  & Required<Pick<ErrorFieldsEntity.Type, 'error'>>;
