import type { EffectHandlerMapType } from './EffectHandlerMapType.js';
import type { StateMachine } from './StateMachine.js';

import { EffectInterpreterBuilder } from './EffectInterpreterBuilder.js';
import { FsmConfigError } from './errors/FsmConfigError.js';
import { InterpreterNotRunningError } from './errors/InterpreterNotRunningError.js';
import { InterpreterNotStartedError } from './errors/InterpreterNotStartedError.js';

interface EffectInterpreterCreateOptionsInterface<
  TState extends { readonly 'variant': string },
  TEvent extends { readonly 'type': string },
  TEffect extends { readonly 'variant': string } = never
> {
  readonly 'handlers'?: EffectHandlerMapType<TEffect> | undefined;
  readonly 'machine': StateMachine<TState, TEvent, TEffect> | undefined;
  readonly 'machineId'?: string | undefined;
}

interface EffectInterpreterConstructorOptionsInterface<
  TState extends { readonly 'variant': string },
  TEvent extends { readonly 'type': string },
  TEffect extends { readonly 'variant': string } = never
> {
  readonly 'handlers'?: EffectHandlerMapType<TEffect> | undefined;
  readonly 'machine': StateMachine<TState, TEvent, TEffect>;
  readonly 'machineId'?: string | undefined;
}

export class EffectInterpreter<
  TState extends { readonly 'variant': string },
  TEvent extends { readonly 'type': string },
  TEffect extends { readonly 'variant': string } = never
> {
  static create<
    S extends { readonly 'variant': string },
    E extends { readonly 'type': string },
    Ef extends { readonly 'variant': string } = never
  >(options: EffectInterpreterCreateOptionsInterface<S, E, Ef>): EffectInterpreter<S, E, Ef> {
    if (options.machine === undefined) {
      throw new FsmConfigError('machine is required');
    }
    if (options.machineId !== undefined && options.machineId === '') {
      throw new FsmConfigError('machineId must not be empty');
    }
    return new EffectInterpreter<S, E, Ef>({
      'handlers': options.handlers,
      'machine': options.machine,
      'machineId': options.machineId
    });
  }

  static builder<
    S extends { readonly 'variant': string },
    E extends { readonly 'type': string },
    Ef extends { readonly 'variant': string } = never
  >(): EffectInterpreterBuilder<S, E, Ef> {
    const result = EffectInterpreterBuilder.create<S, E, Ef>((opts) => {
      const instance = EffectInterpreter.create<S, E, Ef>(opts);
      return instance;
    });
    return result;
  }

  readonly #machine: StateMachine<TState, TEvent, TEffect>;
  readonly #handlers: EffectHandlerMapType<TEffect>;
  readonly #machineId: string;
  readonly #observers = new Set<(state: TState) => void>();
  readonly #mailbox: TEvent[] = [];
  #currentState: TState | undefined = undefined;
  #running = false;
  #draining = false;

  protected constructor(options: EffectInterpreterConstructorOptionsInterface<TState, TEvent, TEffect>) {
    this.#machine = options.machine;
    this.#handlers = options.handlers ?? ({});
    this.#machineId = options.machineId ?? crypto.randomUUID();
  }

  start(): void {
    if (this.#running) { return; }
    this.#currentState = this.#machine.getInitialState();
    this.#running = true;
    this.#notifyObservers();
  }

  stop(): void {
    this.#running = false;
  }

  getState(): TState {
    if (this.#currentState === undefined) {
      throw new InterpreterNotStartedError(`EffectInterpreter '${this.#machineId}' not started — call start() first`);
    }
    return this.#currentState;
  }

  async send(event: TEvent): Promise<void> {
    if (!this.#running) {
      throw new InterpreterNotRunningError(`EffectInterpreter '${this.#machineId}' not running — call start() first`);
    }
    this.#mailbox.push(event);
    if (!this.#draining) { await this.#drain(); }
  }

  subscribe(observer: (state: TState) => void): () => void {
    this.#observers.add(observer);
    return () => { this.#observers.delete(observer); };
  }

  async #drain(): Promise<void> {
    this.#draining = true;
    while (this.#mailbox.length > 0) {
      const event = this.#mailbox.shift();
      if (event === undefined) { break; }
      const currentState = this.#currentState;
      if (currentState === undefined) { break; }
      const step = this.#machine.transition(currentState, event);
      this.#currentState = step.state;
      this.#notifyObservers();
      for (const effect of step.effects) {
        const variantKey = effect.variant as keyof EffectHandlerMapType<TEffect>;
        const handler = this.#handlers[variantKey];
        if (handler !== undefined) {
          await handler(effect as Extract<TEffect, { 'variant': typeof variantKey }>);
        }
      }
    }
    this.#draining = false;
  }

  #notifyObservers(): void {
    const state = this.#currentState;
    if (state === undefined) { return; }
    for (const observer of this.#observers) { observer(state); }
  }
}
