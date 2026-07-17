import { HookInvocationError, HookInvoker } from '@studnicky/errors';

import type { EffectInterpreter } from './EffectInterpreter.js';

import { MachineAlreadyRegisteredError } from './MachineAlreadyRegisteredError.js';

type BoundedInterpreter = EffectInterpreter<{ readonly 'variant': string }, { readonly 'type': string }, { readonly 'variant': string }>;

/**
 * Records a `MachineRegistry`'s hook failures instead of letting
 * `HookInvoker`'s default (throwing) behavior propagate — a broken observer
 * hook must never be able to unwind a registration/unregistration/lookup
 * that already completed.
 */
class MachineRegistryHookInvoker extends HookInvoker {
  readonly #onError: (hookName: string, cause: unknown) => void;

  constructor(onError: (hookName: string, cause: unknown) => void) {
    super();
    this.#onError = onError;
  }

  protected override onHookError<T>(hookName: string, cause: unknown): T {
    this.#onError(hookName, cause);
    return undefined as T;
  }
}

export class MachineRegistry {
  static create(): MachineRegistry {
    return new MachineRegistry();
  }

  readonly #registry = new Map<string, BoundedInterpreter>();

  /** Errors raised by lifecycle hook overrides, recorded by `onHookError` instead of aborting registry operations. */
  readonly #hookErrors: HookInvocationError[] = [];

  protected readonly hooks: HookInvoker;

  protected constructor() {
    this.hooks = new MachineRegistryHookInvoker((hookName, cause) => {
      this.#hookErrors.push(new HookInvocationError(hookName, cause));
    });
  }

  /** Count of hook failures recorded by `onHookError` since construction. */
  get hookErrorCount(): number {
    const result = this.#hookErrors.length;
    return result;
  }

  register(name: string, interpreter: BoundedInterpreter): void {
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

  get(name: string): BoundedInterpreter | undefined {
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
