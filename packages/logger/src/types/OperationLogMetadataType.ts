/**
 * Operation log metadata with optional timing and error fields.
 * Use for individual operation logs within a request.
 */

import type { ErrorFieldsType } from './ErrorFieldsType.js';
import type { RequestLogMetadataType } from './RequestLogMetadataType.js';
import type { TimingFieldsType } from './TimingFieldsType.js';


/**
 * Operation log metadata type.
 * Extends request metadata with timing and error fields.
 * Allows additional operation-specific data.
 */
export type OperationLogMetadataType
  = Partial<ErrorFieldsType>
  & Partial<TimingFieldsType>
  & RequestLogMetadataType;
