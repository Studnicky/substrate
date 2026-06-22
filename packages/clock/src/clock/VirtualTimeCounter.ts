/**
 * Shared mutable counter for virtual time.
 * Pass the same instance to both `VirtualClockProvider` and a virtual scheduler
 * so `Clock.now()` and task fires stay in sync.
 *
 * @module
 */

/**
 * Mutable counter that tracks virtual epoch-ms for test scenarios.
 * Call `advance(ms)` to move time forward; all paired `VirtualClockProvider`
 * instances see the change immediately.
 */
export class VirtualTimeCounter {
  /** Current virtual epoch-ms. Must be non-negative. */
  #nowMs: number;

  /**
   * Property write order: #nowMs.
   *
   * @param startMs - Initial virtual epoch-ms (defaults to 0).
   */
  public constructor(startMs = 0) {
    this.#nowMs = startMs >= 0 ? startMs : 0;
  }

  /**
   * Advances virtual time by `deltaMs` milliseconds.
   * No-ops if `deltaMs` is negative or zero.
   */
  public advance(deltaMs: number): void {
    if (deltaMs <= 0) {
      return;
    }
    this.#nowMs = this.#nowMs + deltaMs;
  }

  /** Returns the current virtual epoch-ms (always non-negative). */
  public nowMs(): number {
    const result = this.#nowMs;
    return result;
  }
}
