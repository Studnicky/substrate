import type { CoreLogFieldsEntity } from '../entities/CoreLogFieldsEntity.js';
import type { CorrelationFieldsEntity } from '../entities/CorrelationFieldsEntity.js';

/** Readonly request-scoped metadata with optional correlation fields. */
export interface RequestLogMetadataInterface extends CoreLogFieldsEntity.Type {
  readonly 'orgId'?: CorrelationFieldsEntity.Type['orgId'];
  readonly [key: string]: unknown;
  readonly 'requestId'?: CorrelationFieldsEntity.Type['requestId'];
  readonly 'teamId'?: CorrelationFieldsEntity.Type['teamId'];
  readonly 'traceId'?: CorrelationFieldsEntity.Type['traceId'];
  readonly 'userId'?: CorrelationFieldsEntity.Type['userId'];
}
