/**
 * \@studnicky/logger/types
 */

// EventComponent type
export type { EventComponentType } from './EventComponentType.js';
// Log schema utilities and metadata types
export type {
  CorrelationMetadataType,
  ErrorMetadataType,
  TimingMetadataType
} from './hasCorrelation.js';
export {
  hasCorrelation,
  hasError,
  hasTiming
} from './hasCorrelation.js';
// Log data type
export type { LogDataType } from './LogDataType.js';
// Log event type and utilities
export type { LogEventNameType } from './LogEventNameType.js';

export {
  createEventName,
  parseEventName
} from './LogEventNameType.js';

// Core types
export type { LogLevelStringType } from './LogLevelStringType.js';
export type { LogLevelType } from './LogLevelType.js';

export type { LogMetadataType } from './LogMetadataType.js';

// Log schema types (composing interfaces with Record for extensibility)
export type { LogSchemaType } from './LogSchemaType.js';

// Log status type and utilities
export type {
  FailureStatusType,
  LifecycleStatusType,
  LogStatusType,
  SuccessStatusType
} from './LogStatusType.js';

export {
  isFailureStatus,
  isLifecycleStatus,
  isSuccessStatus
} from './LogStatusType.js';
export type { OperationLogMetadataType } from './OperationLogMetadataType.js';
export type { RequestLogMetadataType } from './RequestLogMetadataType.js';
