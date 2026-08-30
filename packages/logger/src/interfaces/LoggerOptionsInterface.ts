import type { ClockProviderInterface } from '@studnicky/clock';

import type { LoggerOptionsEntity } from '../entities/LoggerOptionsEntity.js';
import type { TransportInterface } from '../transports/TransportInterface.js';
import type { LogMetadataInterface } from './LogMetadataInterface.js';

/**
 * Runtime contract for Logger construction options.
 *
 * Extends the JSON Schema-derived level and metadata data with runtime
 * transport instances and readonly construction access.
 */
export interface LoggerOptionsInterface extends Omit<LoggerOptionsEntity.Type, 'metadata' | 'transports'> {
  /** Clock that timestamps log records. Default: `RealTimeClockProvider`. */
  readonly 'clock'?: ClockProviderInterface;
  readonly 'metadata'?: LogMetadataInterface;
  readonly 'transports'?: readonly TransportInterface[];
}
