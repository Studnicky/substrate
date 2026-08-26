/**
 * Shared cancel-callback task wrapper for scheduler implementations.
 *
 * @module
 */
import { TransitionRejectedError } from '@studnicky/fsm';

import type { CancellableTaskStateEntity } from '../entities/CancellableTaskStateEntity.js';
import type { CancellableTaskStateInterface } from '../interfaces/CancellableTaskStateInterface.js';
import type { ScheduledTaskInterface } from '../interfaces/ScheduledTaskInterface.js';

import { CancellableTaskMachine } from './CancellableTaskMachine.js';

/**
 * `ScheduledTask` implementation backed by a cancel callback, shared by both
 * `RealTimeScheduler` and `VirtualScheduler`. Calling `cancel()` invokes the
 * callback, which handles timer clearing, map/heap removal, and the `onCancel`
 * lifecycle hook, depending on the owning scheduler.
 *
 * Lifecycle state (`pending → cancelled` / `pending → * → completed`) is
 * formalized via `CancellableTaskMachine` — see that module for the legal
 * edge set.
 */
export class CancellableTask implements ScheduledTaskInterface {
  public readonly atMs: number;
  public readonly id: string;
  readonly #machine: CancellableTaskMachine;
  #state: CancellableTaskStateInterface;
  readonly #onCancelCallback: (id: string) => void;

  /**
   * Property write order: atMs, id, #machine, #state, #onCancelCallback.
   */
  public constructor(
    atMs: number,
    id: string,
    onCancelCallback: (id: string) => void
  ) {
    this.atMs = atMs;
    this.id = id;
    this.#machine = new CancellableTaskMachine();
    this.#state = this.#machine.getInitialState();
    this.#onCancelCallback = onCancelCallback;
  }

  /** Cancels the underlying task via the cancel callback. No-op if already fired/cancelled. */
  public cancel(): void {
    if (!this.#guard('cancelled')) {
      return;
    }
    this.#transition('cancelled');
    this.#onCancelCallback(this.id);
  }

  /** Marks a fired or otherwise-finished task inactive without invoking cancellation hooks. */
  public complete(): void {
    this.#transition('completed');
  }

  /**
   * Applies the `transitionTo` edge to `#state`. Callers must have already
   * confirmed legality via `#guard` where a silent no-op (rather than a
   * throw) is required.
   */
  #transition(to: CancellableTaskStateEntity.Type): void {
    this.#state = this.#machine.transition(this.#state, { 'to': to, 'type': 'transitionTo' }).state;
  }

  /**
   * Returns true if the `#state → to` edge is legal.
   *
   * Delegates to `CancellableTaskMachine.reduce()` and interprets a
   * deliberate `TransitionRejectedError` as an illegal edge. Any other
   * thrown value (a reducer defect) propagates rather than being swallowed
   * as `false`.
   */
  #guard(to: CancellableTaskStateEntity.Type): boolean {
    try {
      this.#machine.transition(this.#state, { 'to': to, 'type': 'transitionTo' });
      return true;
    } catch (error) {
      if (error instanceof TransitionRejectedError) {
        return false;
      }
      throw error;
    }
  }
}
