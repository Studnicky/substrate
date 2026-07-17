import type { LogRecordEntity } from '../entities/LogRecordEntity.js';

/**
 * Sink port for log records.
 *
 * Transports receive assembled records from the Logger core and deliver
 * them to their destination (console, memory buffer, remote sink, etc.).
 *
 * `flush` and `close` are optional lifecycle hooks for transports that
 * buffer output or hold resources.
 */
export interface TransportInterface {
  close?(): Promise<void> | void;
  flush?(): Promise<void> | void;
  write(record: LogRecordEntity.Type): void;
}
