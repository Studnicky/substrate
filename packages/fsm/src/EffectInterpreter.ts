import { CircularBuffer, type CircularBufferOptionsEntity } from '@studnicky/circular-buffer';
import { HookInvocationError, HookInvoker } from '@studnicky/errors';

import type { EffectHandlerMapType } from './EffectHandlerMapType.js';
import type { StateMachine } from './StateMachine.js';

import { EffectInterpreterBuilder } from './EffectInterpreterBuilder.js';
import { FsmConfigError } from './errors/FsmConfigError.js';
import { InterpreterNotRunningError } from './errors/InterpreterNotRunningError.js';
import { InterpreterNotStartedError } from './errors/InterpreterNotStartedError.js';
import { MailboxCapacityExceededError } from './errors/MailboxCapacityExceededError.js';

/** Default mailbox capacity when `mailboxCapacity` is not supplied. */
const DEFAULT_MAILBOX_CAPACITY = 1024;

interface EffectInterpreterCreateOptionsInterface<
  TState extends { readonly 'variant': string },
  TEvent extends { readonly 'type': string },
  TEffect extends { readonly 'variant': string } = never
> {
  readonly 'handlers'?: EffectHandlerMapType<TEffect, TEvent> | undefined;
  readonly 'machine': StateMachine<TState, TEvent, TEffect> | undefined;
  readonly 'machineId'?: string | undefined;
  readonly 'mailboxCapacity'?: number | undefined;
}

interface EffectInterpreterConstructorOptionsInterface<
  TState extends { readonly 'variant': string },
  TEvent extends { readonly 'type': string },
  TEffect extends { readonly 'variant': string } = never
> {
  readonly 'handlers'?: EffectHandlerMapType<TEffect, TEvent> | undefined;
  readonly 'machine': StateMachine<TState, TEvent, TEffect>;
  readonly 'machineId'?: string | undefined;
  readonly 'mailboxCapacity'?: number | undefined;
}

/**
 * A single mailbox slot. `resolve`/`reject` are present only for events enqueued
 * via `send()` — they settle that specific caller's promise once the event has
 * actually been dequeued and transitioned (or has failed to be). Events injected
 * by an effect handler's `dispatch()` carry no waiter — nothing is awaiting them.
 */
interface MailboxEntryInterface<TEvent> {
  readonly 'event': TEvent;
  readonly 'reject'?: ((error: unknown) => void) | undefined;
  readonly 'resolve'?: (() => void) | undefined;
}

/**
 * Mailbox ring buffer. When full, the evicted entry's `send()` caller is
 * rejected with `MailboxCapacityExceededError` rather than left to hang
 * forever — a dropped mailbox slot must still settle its promise.
 */
class MailboxBuffer<TEvent> extends CircularBuffer<MailboxEntryInterface<TEvent>> {
  static createMailbox<TEvent>(options: CircularBufferOptionsEntity.Type = {}): MailboxBuffer<TEvent> {
    return new MailboxBuffer<TEvent>(options);
  }

  protected override onEvict(entry: MailboxEntryInterface<TEvent>): void {
    entry.reject?.(new MailboxCapacityExceededError('mailbox capacity exceeded — oldest queued event was evicted before it could be processed'));
  }
}

/**
 * Records an `EffectInterpreter`'s hook failures instead of letting
 * `HookInvoker`'s default (throwing) behavior propagate — a broken
 * observer/lifecycle/effect hook must never be able to abort the mailbox
 * drain loop or replace an already-committed state transition.
 */
class EffectInterpreterHookInvoker extends HookInvoker {
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
    if (options.mailboxCapacity !== undefined && (!Number.isInteger(options.mailboxCapacity) || options.mailboxCapacity <= 0)) {
      throw new FsmConfigError('mailboxCapacity must be a positive integer');
    }
    return new EffectInterpreter<S, E, Ef>({
      'handlers': options.handlers,
      'machine': options.machine,
      'machineId': options.machineId,
      'mailboxCapacity': options.mailboxCapacity
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
  readonly #handlers: EffectHandlerMapType<TEffect, TEvent>;
  readonly #machineId: string;
  readonly #observers = new Set<(state: TState) => void>();
  readonly #mailbox: MailboxBuffer<TEvent>;
  /** Errors raised by lifecycle hook overrides, recorded by `onHookError` instead of aborting the mailbox drain loop. */
  readonly #hookErrors: HookInvocationError[] = [];
  #currentState: TState | undefined = undefined;
  #running = false;
  #draining = false;

  protected readonly hooks: HookInvoker;

  protected constructor(options: EffectInterpreterConstructorOptionsInterface<TState, TEvent, TEffect>) {
    this.hooks = new EffectInterpreterHookInvoker((hookName, cause) => {
      this.#hookErrors.push(new HookInvocationError(hookName, cause));
    });
    this.#machine = options.machine;
    this.#handlers = options.handlers ?? ({});
    this.#machineId = options.machineId ?? crypto.randomUUID();
    this.#mailbox = MailboxBuffer.createMailbox<TEvent>({
      'capacity': options.mailboxCapacity ?? DEFAULT_MAILBOX_CAPACITY
    });
  }

  /** Count of hook failures recorded by `onHookError` since construction. */
  get hookErrorCount(): number {
    const result = this.#hookErrors.length;
    return result;
  }

  start(): void {
    if (this.#running) { return; }
    this.#currentState = this.#machine.getInitialState();
    this.#running = true;
    this.#notifyObservers();
    this.hooks.invoke('onStart', () => { const result = this.onStart(this.#currentState!);
      return result; });
  }

  stop(): void {
    const state = this.#currentState;
    this.#running = false;
    this.hooks.invoke('onStop', () => { const result = this.onStop(state);
      return result; });
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
    this.hooks.invoke('onEnqueue', () => { const result = this.onEnqueue(event);
      return result; });
    const settlement = new Promise<void>((resolve, reject) => {
      this.#mailbox.push({ 'event': event, 'reject': reject, 'resolve': resolve });
    });
    if (!this.#draining) { void this.#drain(); }
    await settlement;
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

  static async #runEntry<
    S extends { readonly 'variant': string },
    E extends { readonly 'type': string },
    Ef extends { readonly 'variant': string }
  >(interpreter: EffectInterpreter<S, E, Ef>, entry: MailboxEntryInterface<E>): Promise<void> {
    try {
      await interpreter.#processEntry(entry.event);
      entry.resolve?.();
    } catch (err: unknown) {
      entry.reject?.(err);
    }
  }

  async #drain(): Promise<void> {
    this.#draining = true;
    try {
      while (this.#running && this.#mailbox.length > 0) {
        const entry = this.#mailbox.shift();
        if (entry === undefined) { break; }
        await EffectInterpreter.#runEntry(this, entry);
      }
    } finally {
      this.#draining = false;
      this.#rejectAbandonedEntries();
    }
  }

  /** Transitions on one event and runs its resulting effects to completion. */
  async #processEntry(event: TEvent): Promise<void> {
    const currentState = this.#currentState;
    if (currentState === undefined) {
      throw new InterpreterNotStartedError(`EffectInterpreter '${this.#machineId}' not started — call start() first`);
    }
    const step = this.#machine.transition(currentState, event);
    const prevState = currentState;
    this.#currentState = step.state;
    if (prevState.variant !== step.state.variant) {
      this.hooks.invoke('onExitState', () => { const result = this.onExitState(prevState);
        return result; });
      this.hooks.invoke('onTransition', () => { const result = this.onTransition(prevState, step.state, event);
        return result; });
      this.hooks.invoke('onEnterState', () => { const result = this.onEnterState(step.state);
        return result; });
    }
    this.#notifyObservers();
    for (const effect of step.effects) {
      if (!this.#running) { break; }
      const variantKey = effect.variant as keyof EffectHandlerMapType<TEffect, TEvent>;
      const handler = this.#handlers[variantKey];
      if (handler !== undefined) {
        await this.#invokeHandler(effect, handler as (e: TEffect, dispatch: (event: TEvent) => void) => Promise<void> | void);
      }
    }
  }

  /** Rejects any mailbox entries left stranded because the interpreter was stopped mid-drain. */
  #rejectAbandonedEntries(): void {
    if (this.#running || this.#mailbox.length === 0) { return; }
    const error = new InterpreterNotRunningError(`EffectInterpreter '${this.#machineId}' was stopped before all queued events could be drained`);
    while (this.#mailbox.length > 0) {
      const entry = this.#mailbox.shift();
      entry?.reject?.(error);
    }
  }

  async #invokeHandler(effect: TEffect, handler: (e: TEffect, dispatch: (event: TEvent) => void) => Promise<void> | void): Promise<void> {
    this.hooks.invoke('onEffectStart', () => { const result = this.onEffectStart(effect);
      return result; });
    const dispatch = (event: TEvent): void => {
      this.hooks.invoke('onEnqueue', () => { const result = this.onEnqueue(event);
        return result; });
      this.#mailbox.unshift({ 'event': event });
    };
    try {
      await handler(effect, dispatch);
      this.hooks.invoke('onEffectSuccess', () => { const result = this.onEffectSuccess(effect);
        return result; });
    } catch (err: unknown) {
      const error = err instanceof Error ? err : new Error(String(err));
      this.hooks.invoke('onEffectError', () => { const result = this.onEffectError(effect, error);
        return result; });
      throw error;
    }
  }

  #notifyObservers(): void {
    const state = this.#currentState;
    if (state === undefined) { return; }
    for (const observer of this.#observers) {
      this.hooks.invoke('onObserver', () => { const result = observer(state);
        return result; });
    }
  }
}
