import type { LoggerInterface } from '../interfaces/LoggerInterface.js';
import type { LogDataType } from '../types/LogDataType.js';
import type { LogMetadataType } from '../types/LogMetadataType.js';

/**
 * Fan-out logger that broadcasts every log entry to multiple target loggers.
 *
 * @remarks
 * Use this when you need the same log stream to go to more than one destination —
 * for example stdout AND a remote sink, or a primary logger AND a test spy.
 * Each target receives every call independently; errors thrown by individual
 * targets do not affect the others.
 *
 * Child loggers produced via `.child()` fan out to child instances of each
 * target, preserving metadata inheritance across the whole set.
 *
 * @example
 * ```typescript
 * import { FanOutLogger, PinoLogger, SpyLogger, NoOpLogger } from '@studnicky/logger';
 *
 * const primary = PinoLogger.create({ level: 'info' });
 * const spy     = SpyLogger.wrap(NoOpLogger.create());
 *
 * const logger = FanOutLogger.create([primary, spy]);
 *
 * logger.info(body);
 * console.log(spy.entries.length); // 1
 * ```
 *
 * @category Logging
 * @since 2.2.0
 * @see LoggerInterface
 * @group Classes
 */
export class FanOutLogger implements LoggerInterface {
  protected readonly targets: readonly LoggerInterface[];

  /**
   * Creates a FanOutLogger that broadcasts to all provided targets.
   *
   * @param targets - One or more loggers to broadcast to. Order is preserved.
   * @returns A new FanOutLogger instance.
   */
  static create(targets: readonly LoggerInterface[]): FanOutLogger {
    const result = new FanOutLogger(targets);
    return result;
  }

  protected constructor(targets: readonly LoggerInterface[]) {
    this.targets = targets;
  }

  /**
   * Creates a child logger for each target and returns a new FanOutLogger
   * that fans out to those children.
   *
   * @param metadata - Metadata to merge into every child logger.
   * @returns A new FanOutLogger over the child instances.
   */
  child(metadata: LogMetadataType): this {
    const children = this.targets.map(function(target: LoggerInterface): LoggerInterface {
      const result = target.child(metadata);
      return result;
    });
    return this.createChild(children);
  }

  /** Broadcasts a debug entry to all targets. */
  debug(data: LogDataType): void {
    const count = this.targets.length;
    for (let i = 0; i < count; i += 1) {
      const target = this.targets[i];
      if (target === undefined) continue;
      const emitData = this.onEmit('debug', data, target);
      if (emitData !== null) {
        target.debug(emitData);
      }
    }
  }

  /** Broadcasts an error entry to all targets. */
  error(data: LogDataType): void {
    const count = this.targets.length;
    for (let i = 0; i < count; i += 1) {
      const target = this.targets[i];
      if (target === undefined) continue;
      const emitData = this.onEmit('error', data, target);
      if (emitData !== null) {
        target.error(emitData);
      }
    }
  }

  /** Broadcasts an info entry to all targets. */
  info(data: LogDataType): void {
    const count = this.targets.length;
    for (let i = 0; i < count; i += 1) {
      const target = this.targets[i];
      if (target === undefined) continue;
      const emitData = this.onEmit('info', data, target);
      if (emitData !== null) {
        target.info(emitData);
      }
    }
  }

  /** Broadcasts a trace entry to all targets. */
  trace(data: LogDataType): void {
    const count = this.targets.length;
    for (let i = 0; i < count; i += 1) {
      const target = this.targets[i];
      if (target === undefined) continue;
      const emitData = this.onEmit('trace', data, target);
      if (emitData !== null) {
        target.trace(emitData);
      }
    }
  }

  /** Broadcasts a warn entry to all targets. */
  warn(data: LogDataType): void {
    const count = this.targets.length;
    for (let i = 0; i < count; i += 1) {
      const target = this.targets[i];
      if (target === undefined) continue;
      const emitData = this.onEmit('warn', data, target);
      if (emitData !== null) {
        target.warn(emitData);
      }
    }
  }

  /**
   * Creates a FanOutLogger child instance from the given child targets.
   * Uses `this.constructor` so subclasses return their own type.
   */
  protected createChild(children: readonly LoggerInterface[]): this {
    return new (this.constructor as new (t: readonly LoggerInterface[]) => this)(children);
  }

  /**
   * Hook called before emitting to each target.
   * Return the data to log, or null to skip this target entirely.
   * Default passes data through unchanged.
   */
  protected onEmit(_level: string, _data: LogDataType, _target: LoggerInterface): LogDataType | null {
    return _data;
  }
}
