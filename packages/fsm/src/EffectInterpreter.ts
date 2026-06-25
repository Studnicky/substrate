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
    this.onStart(this.#currentState);
  }

  stop(): void {
    const state = this.#currentState;
    this.#running = false;
    this.onStop(state);
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
    this.onEnqueue(event);
    this.#mailbox.push(event);
    if (!this.#draining) { await this.#drain(); }
  }

  subscribe(observer: (state: TState) => void): () => void {
    this.#observers.add(observer);
    return () => { this.#observers.delete(observer); };
  }

  // ---------------------------------------------------------------------------
  // Lifecycle hooks — no-op by default. The bare class does NO observability;
  // override to add logging/tracing/metrics. Overrides must not throw or block.
  // ---------------------------------------------------------------------------

  /** Fires when the interpreter starts and the initial state is set. */
  protected onStart(_state: TState): void {}

  /** Fires when the interpreter is stopped. Receives the last known state. */
  protected onStop(_state: TState | undefined): void {}

  /** Fires when an event is enqueued in the mailbox. */
  protected onEnqueue(_event: TEvent): void {}

  /** Fires when the interpreter transitions to a new state variant. */
  protected onTransition(_from: TState, _to: TState, _event: TEvent): void {}

  /** Fires when entering a new state variant (after commit). */
  protected onEnterState(_state: TState): void {}

  /** Fires when exiting a state variant (before commit). */
  protected onExitState(_state: TState): void {}

  /** Fires before invoking an effect handler. */
  protected onEffectStart(_effect: TEffect): void {}

  /** Fires after an effect handler resolves successfully. */
  protected onEffectSuccess(_effect: TEffect): void {}

  /** Fires when an effect handler throws. */
  protected onEffectError(_effect: TEffect, _error: Error): void {}

  async #drain(): Promise<void> {
    this.#draining = true;
    while (this.#mailbox.length > 0) {
      const event = this.#mailbox.shift();
      if (event === undefined) { break; }
      const currentState = this.#currentState;
      if (currentState === undefined) { break; }
      const step = this.#machine.transition(currentState, event);
      const prevState = currentState;
      this.#currentState = step.state;
      if (prevState.variant !== step.state.variant) {
        this.onExitState(prevState);
        this.onTransition(prevState, step.state, event);
        this.onEnterState(step.state);
      }
      this.#notifyObservers();
      for (const effect of step.effects) {
        const variantKey = effect.variant as keyof EffectHandlerMapType<TEffect>;
        const handler = this.#handlers[variantKey];
        if (handler !== undefined) {
          await this.#invokeHandler(effect, handler as (e: TEffect) => Promise<void> | void);
        }
      }
    }
    this.#draining = false;
  }

  async #invokeHandler(effect: TEffect, handler: (e: TEffect) => Promise<void> | void): Promise<void> {
    this.onEffectStart(effect);
    try {
      await handler(effect);
      this.onEffectSuccess(effect);
    } catch (err: unknown) {
      const error = err instanceof Error ? err : new Error(String(err));
      this.onEffectError(effect, error);
      throw error;
    }
  }

  #notifyObservers(): void {
    const state = this.#currentState;
    if (state === undefined) { return; }
    for (const observer of this.#observers) { observer(state); }
  }
}
