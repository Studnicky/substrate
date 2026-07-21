import type { LogRecordEntity } from '../entities/LogRecordEntity.js';
import type { MemoryTransportOptionsEntity } from '../entities/MemoryTransportOptionsEntity.js';
import type { TransportInterface } from './TransportInterface.js';

import { ImmutableSnapshot } from '../modules/ImmutableSnapshot.js';
import { ResolveMinLevel } from '../modules/ResolveMinLevel.js';

/**
 * Transport that captures log records into an internal array for test assertions.
 *
 * `records()` returns a snapshot of the current captured records regardless
 * of which child logger emitted them.
 *
 * @example
 * ```typescript
 * const memory = MemoryTransport.create();
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
  static create(options: MemoryTransportOptionsEntity.Type = {}): MemoryTransport {
    return new this(options);
  }

  readonly #buffer: LogRecordEntity.Type[] = [];
  readonly #minLevel: number;

  protected constructor(options: MemoryTransportOptionsEntity.Type = {}) {
    this.#minLevel = ResolveMinLevel.from(options);
  }

  /**
   * Clears all captured records from the buffer.
   */
  clear(): void {
    this.#buffer.length = 0;
  }

  /**
   * Returns a readonly snapshot of the current internal buffer.
   */
  records(): readonly LogRecordEntity.Type[] {
    return [...this.#buffer];
  }

  /**
   * Captures the record if its level meets this transport's floor.
   *
   * @param record - Assembled log record from the Logger core
   */
  write(record: LogRecordEntity.Type): void {
    if (record.level < this.#minLevel) {
      return;
    }
    this.#buffer.push(ImmutableSnapshot.from(record));
  }
}
