import type { LogDataType } from './LogDataType.js';
import type { LogLevelType } from './LogLevelType.js';
import type { LogMetadataType } from './LogMetadataType.js';

/**
 * Immutable log record assembled at emit time and passed to each transport.
 */
export type LogRecordType = {
  readonly 'data': LogDataType;
  readonly 'level': LogLevelType;
  readonly 'metadata': LogMetadataType;
  readonly 'time': number;
};
