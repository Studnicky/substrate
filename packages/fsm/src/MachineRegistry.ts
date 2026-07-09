import type { EffectInterpreter } from './EffectInterpreter.js';

import { MachineAlreadyRegisteredError } from './MachineAlreadyRegisteredError.js';

type BoundedInterpreter = EffectInterpreter<{ readonly 'variant': string }, { readonly 'type': string }, { readonly 'variant': string }>;

export class MachineRegistry {
  static create(): MachineRegistry {
    return new MachineRegistry();
  }

  readonly #registry = new Map<string, BoundedInterpreter>();

  protected constructor() {}

  register(name: string, interpreter: BoundedInterpreter): void {
    if (this.#registry.has(name)) { throw new MachineAlreadyRegisteredError(name); }
    this.#registry.set(name, interpreter);
    this.onRegister(name);
  }

  unregister(name: string): void {
    this.#registry.delete(name);
    this.onUnregister(name);
  }

  get(name: string): BoundedInterpreter | undefined {
    const result = this.#registry.get(name);
    if (result === undefined) { this.onResolveMiss(name); }
    return result;
  }

  has(name: string): boolean {
    const result = this.#registry.has(name);
    return result;
  }

  list(): readonly string[] {
    const keys = this.#registry.keys();
    return [...keys];
  }

  // ---------------------------------------------------------------------------
  // Lifecycle hooks — no-op by default. The bare class does NO observability;
  // override in a subclass to add logging/tracing/metrics.
  // Overrides must not throw or block.
  // ---------------------------------------------------------------------------

  /** Fires after a named interpreter is successfully registered. */
  protected onRegister(_id: string): void {}

  /** Fires after a named interpreter is unregistered (whether or not it existed). */
  protected onUnregister(_id: string): void {}

  /** Fires when `get()` is called for an id not present in the registry. */
  protected onResolveMiss(_id: string): void {}
}
