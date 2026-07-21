import type { ErrorFieldsEntity } from '../entities/ErrorFieldsEntity.js';
import type { TimingFieldsEntity } from '../entities/TimingFieldsEntity.js';
import type { RequestLogMetadataInterface } from './RequestLogMetadataInterface.js';

/** Readonly operation metadata with optional timing and error fields. */
export interface OperationLogMetadataInterface extends RequestLogMetadataInterface {
  readonly 'cause'?: ErrorFieldsEntity.Type['cause'];
  readonly 'durationMs'?: TimingFieldsEntity.Type['durationMs'];
  readonly 'error'?: ErrorFieldsEntity.Type['error'];
  readonly 'errorCode'?: ErrorFieldsEntity.Type['errorCode'];
}
