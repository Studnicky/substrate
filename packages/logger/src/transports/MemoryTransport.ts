import type { LogRecordType } from '../types/LogRecordType.js';
import type { MemoryTransportOptionsType } from './MemoryTransportOptionsType.js';
import type { TransportInterface } from './TransportInterface.js';

import { LogLevel } from '../constants/LogLevel.js';
import { ConfigurationError } from '../errors/ConfigurationError.js';
import { parseLogLevel } from '../modules/parseLogLevel.js';

/**
 * Transport that captures log records into an internal array for test assertions.
 *
 * All captured records share the same array, so `records()` always reflects
 * the current state regardless of which child logger emitted them.
 *
 * @example
 * ```typescript
 * const memory = new MemoryTransport();
 * const logger = Logger.create({ transports: [memory] });
 *
 * logger.info(body);
 * assert.strictEqual(memory.records().length, 1);
 *
 * memory.clear();
 * assert.strictEqual(memory.records().length, 0);
 * ```
 */
export class MemoryTransport implements TransportInterface {
  /**
   * Creates a new MemoryTransport instance.
   *
   * @param options - Optional configuration for this transport
   * @returns A new MemoryTransport instance
   */
  static create(options: MemoryTransportOptionsType = {}): MemoryTransport {
    return new MemoryTransport(options);
  }

  readonly #buffer: LogRecordType[] = [];
  readonly #minLevel: number;

  constructor(options: MemoryTransportOptionsType = {}) {
    if (options.level !== undefined
      && typeof options.level !== 'string'
      && typeof options.level !== 'number') {
      throw new ConfigurationError('level must be a string or number');
    }
    this.#minLevel = options.level !== undefined
      ? parseLogLevel(options.level)
      : LogLevel.TRACE;
  }

  /**
   * Clears all captured records from the buffer.
   */
  clear(): void {
    this.#buffer.length = 0;
  }

  /**
   * Returns a readonly snapshot of all captured records.
   */
  records(): readonly LogRecordType[] {
    return this.#buffer;
  }

  /**
   * Captures the record if its level meets this transport's floor.
   *
   * @param record - Assembled log record from the Logger core
   */
  write(record: LogRecordType): void {
    if (record.level < this.#minLevel) {
      return;
    }
    this.#buffer.push(record);
  }
}
