import type { CoreLogFieldsEntity } from '../entities/CoreLogFieldsEntity.js';
import type { CorrelationFieldsEntity } from '../entities/CorrelationFieldsEntity.js';

/** Core metadata narrowed to a record with a request identifier. */
export interface CorrelationMetadataInterface extends CoreLogFieldsEntity.Type {
  readonly 'requestId': CorrelationFieldsEntity.Type['requestId'];
}
