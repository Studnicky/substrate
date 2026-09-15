import type { CoreLogFieldsEntity } from '../entities/CoreLogFieldsEntity.js';
import type { ErrorFieldsEntity } from '../entities/ErrorFieldsEntity.js';
import type { TimingFieldsEntity } from '../entities/TimingFieldsEntity.js';

/** Readonly operation metadata with optional timing and error fields. */
export interface OperationLogMetadataInterface extends
  Partial<ErrorFieldsEntity.Type>,
  Partial<TimingFieldsEntity.Type>,
  CoreLogFieldsEntity.Type {}
