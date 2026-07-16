/**
 * Request-scoped log metadata.
 * Inherited by all logs within a request context.
 */

import type { CoreLogFieldsEntity } from '../entities/CoreLogFieldsEntity.js';
import type { CorrelationFieldsEntity } from '../entities/CorrelationFieldsEntity.js';

/**
 * Request-scoped log metadata type.
 * Extends core fields with optional correlation data.
 * Allows additional contextual data for the request.
 */
export type RequestLogMetadataType
  = CoreLogFieldsEntity.Type
  & Partial<CorrelationFieldsEntity.Type>
  & Record<string, unknown>;
