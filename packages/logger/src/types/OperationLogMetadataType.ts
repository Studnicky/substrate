/**
 * Operation log metadata with optional timing and error fields.
 * Use for individual operation logs within a request.
 */

import type { ErrorFieldsEntity } from '../entities/ErrorFieldsEntity.js';
import type { TimingFieldsEntity } from '../entities/TimingFieldsEntity.js';
import type { RequestLogMetadataType } from './RequestLogMetadataType.js';

/**
 * Operation log metadata type.
 * Extends request metadata with timing and error fields.
 * Allows additional operation-specific data.
 */
export type OperationLogMetadataType
  = Partial<ErrorFieldsEntity.Type>
  & Partial<TimingFieldsEntity.Type>
  & RequestLogMetadataType;
