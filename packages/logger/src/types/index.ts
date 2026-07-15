/**
 * \@studnicky/logger/types
 */

// Log schema field types
export type { CoreLogFieldsType } from './CoreLogFieldsType.js';
export type { CorrelationFieldsType } from './CorrelationFieldsType.js';
export type { ErrorFieldsType } from './ErrorFieldsType.js';
// EventComponent type
export type { EventComponentType } from './EventComponentType.js';
// Log data types
export type { LogBodyDataType } from './LogBodyDataType.js';
export type { LogDataType } from './LogDataType.js';
export type { LogFaultDataType } from './LogFaultDataType.js';

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
// Field types
export type { TimingFieldsType } from './TimingFieldsType.js';
