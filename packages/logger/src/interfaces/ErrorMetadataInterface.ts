import type { CoreLogFieldsEntity } from '../entities/CoreLogFieldsEntity.js';
import type { ErrorFieldsEntity } from '../entities/ErrorFieldsEntity.js';

/** Core metadata narrowed to a record with an error message. */
export interface ErrorMetadataInterface extends CoreLogFieldsEntity.Type {
  readonly 'error': ErrorFieldsEntity.Type['error'];
}
