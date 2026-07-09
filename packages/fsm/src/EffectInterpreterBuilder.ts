import type { EffectHandlerMapType } from './EffectHandlerMapType.js';
import type { EffectInterpreter } from './EffectInterpreter.js';
import type { StateMachine } from './StateMachine.js';

interface EffectInterpreterBuilderCreateOptionsInterface<
  TState extends { readonly 'variant': string },
  TEvent extends { readonly 'type': string },
  TEffect extends { readonly 'variant': string } = never
> {
  readonly 'handlers'?: EffectHandlerMapType<TEffect, TEvent> | undefined;
  readonly 'machine': StateMachine<TState, TEvent, TEffect> | undefined;
  readonly 'machineId'?: string | undefined;
}

export class EffectInterpreterBuilder<
  TState extends { readonly 'variant': string },
  TEvent extends { readonly 'type': string },
  TEffect extends { readonly 'variant': string } = never
> {
  static create<
    S extends { readonly 'variant': string },
    E extends { readonly 'type': string },
    Ef extends { readonly 'variant': string } = never
  >(
    create: (options: EffectInterpreterBuilderCreateOptionsInterface<S, E, Ef>) => EffectInterpreter<S, E, Ef>
  ): EffectInterpreterBuilder<S, E, Ef> {
    const result = new EffectInterpreterBuilder<S, E, Ef>(create);
    return result;
  }

  readonly #create: (options: EffectInterpreterBuilderCreateOptionsInterface<TState, TEvent, TEffect>) => EffectInterpreter<TState, TEvent, TEffect>;
  #handlers: EffectHandlerMapType<TEffect, TEvent> | undefined;
  #machine: StateMachine<TState, TEvent, TEffect> | undefined;
  #machineId: string | undefined;

  private constructor(
    create: (options: EffectInterpreterBuilderCreateOptionsInterface<TState, TEvent, TEffect>) => EffectInterpreter<TState, TEvent, TEffect>
  ) {
    this.#create = create;
  }

  withHandlers(handlers: EffectHandlerMapType<TEffect, TEvent>): this {
    this.#handlers = handlers;
    return this;
  }

  withMachine(machine: StateMachine<TState, TEvent, TEffect>): this {
    this.#machine = machine;
    return this;
  }

  withOptions(options: { readonly 'machineId'?: string }): this {
    this.#machineId = options.machineId;
    return this;
  }

  build(): EffectInterpreter<TState, TEvent, TEffect> {
    const result = this.#create({
      'handlers': this.#handlers,
      'machine': this.#machine,
      'machineId': this.#machineId
    });
    return result;
  }
}
