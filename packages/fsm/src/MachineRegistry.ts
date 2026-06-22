import type { EffectInterpreter } from './EffectInterpreter.js';

import { MachineAlreadyRegisteredError } from './MachineAlreadyRegisteredError.js';

type BoundedInterpreter = EffectInterpreter<{ readonly 'variant': string }, { readonly 'type': string }, { readonly 'variant': string }>;

export class MachineRegistry {
  static readonly #registry = new Map<string, BoundedInterpreter>();

  static register(name: string, interpreter: BoundedInterpreter): void {
    if (MachineRegistry.#registry.has(name)) { throw new MachineAlreadyRegisteredError(name); }
    MachineRegistry.#registry.set(name, interpreter);
  }

  static unregister(name: string): void {
    MachineRegistry.#registry.delete(name);
  }

  static get(name: string): BoundedInterpreter | undefined {
    return MachineRegistry.#registry.get(name);
  }

  static has(name: string): boolean {
    return MachineRegistry.#registry.has(name);
  }

  static list(): readonly string[] {
    return [...MachineRegistry.#registry.keys()];
  }
}
