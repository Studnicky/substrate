/**
 * \@studnicky/logger/types
 */

// EventComponent type
export type { EventComponentType } from './EventComponentType.js';
// Hook error entry type
export type { HookErrorEntryType } from './HookErrorEntryType.js';
// Log data types
export type { LogDataType } from './LogDataType.js';

// Core types
export type { LogLevelStringType } from './LogLevelStringType.js';
export type { LogLevelType } from './LogLevelType.js';

export type {
  CorrelationMetadataType,
  ErrorMetadataType,
  LogMetadataType,
  TimingMetadataType
} from './LogMetadataType.js';

// Log schema types (composing interfaces with Record for extensibility)
export type { LogSchemaType } from './LogSchemaType.js';

// Log status types
export type {
  FailureStatusType,
  LifecycleStatusType,
  LogStatusType,
  SuccessStatusType
} from './LogStatusType.js';

export type { OperationLogMetadataType } from './OperationLogMetadataType.js';
export type { RequestLogMetadataType } from './RequestLogMetadataType.js';
