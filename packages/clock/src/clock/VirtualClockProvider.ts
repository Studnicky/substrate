/**
 * Deterministic `ClockProvider` for tests.
 * Advance virtual time via `VirtualTimeCounter.advance(ms)`.
 *
 * @module
 */
import type { ClockProviderType } from '../interfaces/ClockProviderType.js';
import type { VirtualTimeCounter } from './VirtualTimeCounter.js';

/** Named constant: nanoseconds per millisecond, as BigInt. */
const NS_PER_MS = 1_000_000n;

/**
 * `ClockProvider` backed by a `VirtualTimeCounter`.
 * `now()` returns the counter's current epoch-ms.
 * `hrtime()` returns the same value converted to nanoseconds.
 */
export class VirtualClockProvider implements ClockProviderType {
  readonly #counter: Readonly<VirtualTimeCounter>;

  /**
   * Property write order: #counter.
   */
  public constructor(counter: Readonly<VirtualTimeCounter>) {
    this.#counter = counter;
  }

  /**
   * Extension seam: exposes the injected counter to subclasses without widening
   * the public API surface.
   */
  protected get counter(): Readonly<VirtualTimeCounter> {
    const result = this.#counter;
    return result;
  }

  /**
   * Extension seam: subclasses may override to replace or instrument the raw
   * virtual ms value before it is consumed by `hrtime()` and `now()`.
   */
  protected readVirtualMs(): number {
    const result = this.#counter.nowMs();
    return result;
  }

  /** Returns the virtual time in nanoseconds (epoch-ms * 1,000,000). */
  public hrtime(): bigint {
    return BigInt(this.readVirtualMs()) * NS_PER_MS;
  }

  /** Returns the virtual epoch-ms (always non-negative). */
  public now(): number {
    const ms = this.readVirtualMs();

    return ms >= 0 ? ms : 0;
  }
}
