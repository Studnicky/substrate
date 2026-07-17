/**
 * Shared cancel-callback task wrapper for scheduler implementations.
 *
 * @module
 */
import type { ScheduledTaskType } from '../types/ScheduledTaskType.js';

/**
 * `ScheduledTask` implementation backed by a cancel callback, shared by both
 * `RealTimeScheduler` and `VirtualScheduler`. Calling `cancel()` invokes the
 * callback, which handles timer clearing, map/heap removal, and the `onCancel`
 * lifecycle hook, depending on the owning scheduler.
 */
export class CancellableTask implements ScheduledTaskType {
  public readonly atMs: number;
  public readonly id: string;
  readonly #onCancelCallback: (id: string) => void;

  /**
   * Property write order: atMs, id, #onCancelCallback.
   */
  public constructor(
    atMs: number,
    id: string,
    onCancelCallback: (id: string) => void
  ) {
    this.atMs = atMs;
    this.id = id;
    this.#onCancelCallback = onCancelCallback;
  }

  /** Cancels the underlying task via the cancel callback. No-op if already fired/cancelled. */
  public cancel(): void {
    this.#onCancelCallback(this.id);
  }
}
