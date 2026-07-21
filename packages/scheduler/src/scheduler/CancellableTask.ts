/**
 * Shared cancel-callback task wrapper for scheduler implementations.
 *
 * @module
 */
import type { ScheduledTaskInterface } from '../interfaces/ScheduledTaskInterface.js';

/**
 * `ScheduledTask` implementation backed by a cancel callback, shared by both
 * `RealTimeScheduler` and `VirtualScheduler`. Calling `cancel()` invokes the
 * callback, which handles timer clearing, map/heap removal, and the `onCancel`
 * lifecycle hook, depending on the owning scheduler.
 */
export class CancellableTask implements ScheduledTaskInterface {
  public readonly atMs: number;
  public readonly id: string;
  #active: boolean;
  readonly #onCancelCallback: (id: string) => void;

  /**
   * Property write order: atMs, id, #active, #onCancelCallback.
   */
  public constructor(
    atMs: number,
    id: string,
    onCancelCallback: (id: string) => void
  ) {
    this.atMs = atMs;
    this.id = id;
    this.#active = true;
    this.#onCancelCallback = onCancelCallback;
  }

  /** Cancels the underlying task via the cancel callback. No-op if already fired/cancelled. */
  public cancel(): void {
    if (!this.#active) {
      return;
    }
    this.#active = false;
    this.#onCancelCallback(this.id);
  }

  /** Marks a fired or otherwise-finished task inactive without invoking cancellation hooks. */
  public complete(): void {
    this.#active = false;
  }
}
