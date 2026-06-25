import type { EffectInterpreter } from './EffectInterpreter.js';

import { MachineAlreadyRegisteredError } from './MachineAlreadyRegisteredError.js';

type BoundedInterpreter = EffectInterpreter<{ readonly 'variant': string }, { readonly 'type': string }, { readonly 'variant': string }>;

export class MachineRegistry {
  static readonly #registry = new Map<string, BoundedInterpreter>();

  static register(name: string, interpreter: BoundedInterpreter): void {
    if (MachineRegistry.#registry.has(name)) { throw new MachineAlreadyRegisteredError(name); }
    MachineRegistry.#registry.set(name, interpreter);
    this.onRegister(name);
  }

  static unregister(name: string): void {
    MachineRegistry.#registry.delete(name);
    this.onUnregister(name);
  }

  static get(name: string): BoundedInterpreter | undefined {
    const result = MachineRegistry.#registry.get(name);
    if (result === undefined) { this.onResolveMiss(name); }
    return result;
  }

  static has(name: string): boolean {
    const result = MachineRegistry.#registry.has(name);
    return result;
  }

  static list(): readonly string[] {
    const keys = MachineRegistry.#registry.keys();
    return [...keys];
  }

  // ---------------------------------------------------------------------------
  // Lifecycle hooks — no-op by default. The bare class does NO observability;
  // override in a subclass to add logging/tracing/metrics.
  // Overrides must not throw or block.
  // ---------------------------------------------------------------------------

  /** Fires after a named interpreter is successfully registered. */
  protected static onRegister(_id: string): void {}

  /** Fires after a named interpreter is unregistered (whether or not it existed). */
  protected static onUnregister(_id: string): void {}

  /** Fires when `get()` is called for an id not present in the registry. */
  protected static onResolveMiss(_id: string): void {}
}
