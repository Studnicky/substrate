import type { EffectHandlerMapType } from './EffectHandlerMapType.js';
import type { StateMachine } from './StateMachine.js';

import { FsmConfigError } from './errors/FsmConfigError.js';
import { InterpreterNotRunningError } from './errors/InterpreterNotRunningError.js';
import { InterpreterNotStartedError } from './errors/InterpreterNotStartedError.js';

export class EffectInterpreter<
  TState extends { readonly 'variant': string },
  TEvent extends { readonly 'type': string },
  TEffect extends { readonly 'variant': string } = never
> {
  readonly #machine: StateMachine<TState, TEvent, TEffect>;
  readonly #handlers: EffectHandlerMapType<TEffect>;
  readonly #machineId: string;
  readonly #observers = new Set<(state: TState) => void>();
  readonly #mailbox: TEvent[] = [];
  #currentState: TState | undefined = undefined;
  #running = false;
  #draining = false;

  constructor(
    machine: StateMachine<TState, TEvent, TEffect>,
    handlers?: EffectHandlerMapType<TEffect>,
    options?: { 'machineId'?: string }
  ) {
    if (options?.machineId !== undefined && options.machineId === '') {
      throw new FsmConfigError('machineId must not be empty');
    }
    this.#machine = machine;
    this.#handlers = handlers ?? ({});
    this.#machineId = options?.machineId ?? crypto.randomUUID();
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
