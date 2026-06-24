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
    const result = MachineRegistry.#registry.get(name);
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
}
