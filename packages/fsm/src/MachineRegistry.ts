import type { RegisteredInterpreterInterface } from './RegisteredInterpreterInterface.js';

import { FsmHookInvoker } from './FsmHookInvoker.js';
import { MachineAlreadyRegisteredError } from './MachineAlreadyRegisteredError.js';

/** Named interpreter registry whose lifecycle hook failures cannot unwind completed operations. */
export class MachineRegistry<
  TState extends { readonly 'variant': string },
  TEvent extends { readonly 'type': string }
> {
  static create<
    S extends { readonly 'variant': string },
    E extends { readonly 'type': string }
  >(): MachineRegistry<S, E> {
    return new MachineRegistry<S, E>();
  }

  readonly #registry = new Map<string, RegisteredInterpreterInterface<TState, TEvent>>();

  protected readonly hooks: FsmHookInvoker;

  protected constructor() {
    this.hooks = new FsmHookInvoker();
  }

  /** Count of lifecycle hook failures captured since construction. */
  get hookErrorCount(): number {
    const result = this.hooks.hookErrorCount;
    return result;
  }

  register(name: string, interpreter: RegisteredInterpreterInterface<TState, TEvent>): void {
    if (this.#registry.has(name)) { throw new MachineAlreadyRegisteredError(name); }
    this.#registry.set(name, interpreter);
    this.hooks.invoke('onRegister', () => {
      const result = this.onRegister(name);
      return result;
    });
  }

  unregister(name: string): void {
    this.#registry.delete(name);
    this.hooks.invoke('onUnregister', () => {
      const result = this.onUnregister(name);
      return result;
    });
  }

  get(name: string): RegisteredInterpreterInterface<TState, TEvent> | undefined {
    const result = this.#registry.get(name);
    if (result === undefined) {
      this.hooks.invoke('onResolveMiss', () => {
        const result = this.onResolveMiss(name);
        return result;
      });
    }
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
