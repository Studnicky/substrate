/** Async circuit breaker: closed → open (on failure threshold) → halfOpen (on timeout) → closed. */

import type { ErrorClassifierFunctionInterface, ErrorClassifierInterface } from '@studnicky/errors';
import type { ErrorClassificationEntity } from '@studnicky/errors/entities';

import { HookInvoker } from '@studnicky/errors';
import { Predicates } from '@studnicky/types';

import type { CircuitBreakerCallRejectedEventEntity } from './entities/CircuitBreakerCallRejectedEventEntity.js';
import type { CircuitBreakerCallSucceededEventEntity } from './entities/CircuitBreakerCallSucceededEventEntity.js';
import type { CircuitBreakerClosedStateEntity } from './entities/CircuitBreakerClosedStateEntity.js';
import type { CircuitBreakerHalfOpenStateEntity } from './entities/CircuitBreakerHalfOpenStateEntity.js';
import type { CircuitBreakerManualOpenEventEntity } from './entities/CircuitBreakerManualOpenEventEntity.js';
import type { CircuitBreakerManualResetEventEntity } from './entities/CircuitBreakerManualResetEventEntity.js';
import type { CircuitBreakerOnCloseEffectEntity } from './entities/CircuitBreakerOnCloseEffectEntity.js';
import type { CircuitBreakerOnHalfOpenEffectEntity } from './entities/CircuitBreakerOnHalfOpenEffectEntity.js';
import type { CircuitBreakerOnOpenEffectEntity } from './entities/CircuitBreakerOnOpenEffectEntity.js';
import type { CircuitBreakerOnRejectEffectEntity } from './entities/CircuitBreakerOnRejectEffectEntity.js';
import type { CircuitBreakerOnSuccessEffectEntity } from './entities/CircuitBreakerOnSuccessEffectEntity.js';
import type { CircuitBreakerOnTripEffectEntity } from './entities/CircuitBreakerOnTripEffectEntity.js';
import type { CircuitBreakerOpenStateEntity } from './entities/CircuitBreakerOpenStateEntity.js';
import type { CircuitBreakerResetTimeoutElapsedEventEntity } from './entities/CircuitBreakerResetTimeoutElapsedEventEntity.js';
import type { CircuitStateEntity } from './entities/CircuitStateEntity.js';
import type { CircuitBreakerCallFailedEventInterface } from './interfaces/CircuitBreakerCallFailedEventInterface.js';
import type { CircuitBreakerOnFailureEffectInterface } from './interfaces/CircuitBreakerOnFailureEffectInterface.js';
import type { CircuitBreakerOptionsInterface } from './interfaces/CircuitBreakerOptionsInterface.js';

import { CircuitBreakerMachine } from './CircuitBreakerMachine.js';
import { CircuitBreakerOpenError } from './CircuitBreakerOpenError.js';
import { ResilienceConfigError } from './errors/ResilienceConfigError.js';

interface CircuitBreakerSubclassInterface<TInstance> extends Function {
  readonly 'prototype': TInstance;
}

class CircuitBreakerInstance {
  static belongsTo<TInstance extends object>(
    constructor: CircuitBreakerSubclassInterface<TInstance>,
    value: object
  ): value is TInstance {
    const result = value instanceof constructor;
    return result;
  }
}

export class CircuitBreaker {
  static readonly #OwnedHookInvoker = class CircuitBreakerHookInvoker extends HookInvoker {
    protected override onHookError(): void {}
  };

  readonly #resetTimeoutMs: number;
  readonly #name: string;
  readonly #clock: () => number;
  readonly #errorClassifier: ErrorClassifierFunctionInterface | ErrorClassifierInterface | undefined;
  readonly #machine: CircuitBreakerMachine;
  #machineState: CircuitBreakerClosedStateEntity.Type | CircuitBreakerHalfOpenStateEntity.Type | CircuitBreakerOpenStateEntity.Type;
  /**
   * Mirrors the `attemptNumber` semantics `classifyError`/`errorClassifier`
   * always saw pre-refactor: it counts consecutive failures while `closed`,
   * is zeroed on a `closed`-state success or `reset()`, and is otherwise left
   * untouched while `open`/`halfOpen` — including across a halfOpen failure,
   * where it still reports the count from before the circuit last tripped.
   * No test or doc exercises this value once the circuit leaves `closed`; it
   * is preserved here purely for exact behavioral parity rather than because
   * the value is meaningful in `open`/`halfOpen`.
   */
  #classifierAttemptCount = 0;

  /** Invokes lifecycle hooks, retaining diagnostics in the invoker while swallowing failures. */
  protected readonly hooks: HookInvoker;

  static create<TInstance extends CircuitBreaker = CircuitBreaker>(
    this: CircuitBreakerSubclassInterface<TInstance>,
    options: CircuitBreakerOptionsInterface
  ): TInstance {
    const resolveSubclassConstructor = (): CircuitBreakerSubclassInterface<TInstance> => {
      return this;
    };

    const result: unknown = Reflect.construct(resolveSubclassConstructor(), [options]);
    if (!Predicates.isObjectLike(result) || !CircuitBreakerInstance.belongsTo(resolveSubclassConstructor(), result)) {
      throw new TypeError('CircuitBreaker.create() did not construct the requested subclass.');
    }
    return result;
  }

  protected constructor(options: CircuitBreakerOptionsInterface) {
    this.hooks = new CircuitBreaker.#OwnedHookInvoker();
    if (options.failureThreshold < 1) {throw new ResilienceConfigError('failureThreshold must be >= 1');}
    if (options.resetTimeoutMs < 0) {throw new ResilienceConfigError('resetTimeoutMs must be >= 0');}
    this.#resetTimeoutMs = options.resetTimeoutMs;
    this.#name = options.name ?? 'circuit-breaker';
    this.#clock = options.clock ?? Date.now;
    this.#machine = new CircuitBreakerMachine({
      'failureThreshold': options.failureThreshold,
      'successThreshold': options.successThreshold ?? 1
    });
    this.#machineState = this.#machine.getInitialState();

    this.#errorClassifier = options.errorClassifier;
  }

  get state(): CircuitStateEntity.Type { const result = this.#machineState.variant;
    return result; }

  async execute<T>(callback: () => Promise<T>): Promise<T> {
    this.#checkHalfOpen();
    if (this.#machineState.variant === 'open') {
      this.#dispatch({ 'type': 'callRejected' });
      throw new CircuitBreakerOpenError(this.#name);
    }
    const wasHalfOpen = this.#machineState.variant === 'halfOpen';
    try {
      const result = await callback();
      this.#dispatch({ 'type': 'callSucceeded' });
      if (!wasHalfOpen) {
        this.#classifierAttemptCount = 0;
      }
      return result;
    } catch (caughtError) {
      const error = caughtError instanceof Error ? caughtError : new Error(String(caughtError));
      const classification = this.#classifyError(error, this.#classifierAttemptCount);
      if (!classification.retryable) {
        if (!wasHalfOpen) {
          this.#classifierAttemptCount += 1;
        }
        this.#dispatch({ 'at': this.#clock(), 'error': error, 'type': 'callFailed' });
      }
      throw error;
    }
  }

  reset(): void {
    this.#classifierAttemptCount = 0;
    this.#dispatch({ 'type': 'manualReset' });
  }

  forceOpen(): void {
    this.#dispatch({ 'at': this.#clock(), 'type': 'manualOpen' });
  }

  /**
   * Classify a thrown error to determine whether it counts as a circuit failure.
   *
   * Subclasses can override this method to provide custom classification logic.
   * If `errorClassifier` is provided in options, it takes precedence over this
   * method. This is the same `@studnicky/errors` classifier family
   * `@studnicky/retry`'s `Retry` class uses — `{ retryable: true }` means the
   * error is transient and already handled elsewhere (e.g. by a wrapped `Retry`),
   * so it does NOT count toward the failure threshold; `{ retryable: false }`
   * means the error is real, non-transient breakage, so it DOES count.
   *
   * Default implementation always returns `{ retryable: false }` — every thrown
   * error counts as a failure, preserving `CircuitBreaker`'s original behavior.
   *
   * @param error - The error thrown by the wrapped call
   * @param attemptNumber - Count of consecutive failures so far (`#failureCount`)
   * @returns Classification result indicating whether the error counts as a failure
   */
  protected classifyError(_error: Error, _attemptNumber: number): ErrorClassificationEntity.Type {
    const result: ErrorClassificationEntity.Type = { 'retryable': false };
    return result;
  }

  /**
   * Fires after `fn()` resolves successfully in any circuit state.
   * Override to add logging, metrics, or tracing. Must not throw or block.
   */
  protected onSuccess(): void {}

  /**
   * Fires after `fn()` throws in any circuit state.
   * Override to add logging, metrics, or tracing. Must not throw or block.
   */
  protected onFailure(_error: Error): void {}

  /**
   * Fires when the failure threshold is reached and the circuit transitions closed → open.
   * Does NOT fire on the halfOpen → open re-open path. Must not throw or block.
   */
  protected onTrip(): void {}

  /**
   * Fires every time the circuit state becomes open (threshold trip or halfOpen → open on failure).
   * Must not throw or block.
   */
  protected onOpen(): void {}

  /**
   * Fires when the circuit transitions open → halfOpen after resetTimeoutMs.
   * Must not throw or block.
   */
  protected onHalfOpen(): void {}

  /**
   * Fires when the circuit becomes closed (successThreshold reached in halfOpen or manual reset).
   * Must not throw or block.
   */
  protected onClose(): void {}

  /**
   * Fires when execute() short-circuits because the circuit is open.
   * Must not throw or block.
   */
  protected onReject(): void {}

  #classifyError(error: Error, attemptNumber: number): ErrorClassificationEntity.Type {
    const classifier = this.#errorClassifier;
    if (classifier === undefined) {
      const result = this.classifyError(error, attemptNumber);
      return result;
    }
    if (typeof classifier === 'function') {
      const result = classifier(error, attemptNumber);
      return result;
    }
    const result = classifier.classify(error, attemptNumber);
    return result;
  }

  #checkHalfOpen(): void {
    if (this.#machineState.variant === 'open' && this.#clock() - this.#machineState.openedAt >= this.#resetTimeoutMs) {
      this.#dispatch({ 'type': 'resetTimeoutElapsed' });
    }
  }

  /**
   * Advances the machine one event and plays back the effects `reduce()`
   * decided on — this is the ONLY place a lifecycle hook is invoked from, so
   * a hook can neither double-fire nor get skipped: the reducer emits its
   * `effects` list once per event, and this loop invokes each entry exactly
   * once, in the order the reducer returned them.
   */
  #dispatch(
    event: CircuitBreakerCallFailedEventInterface
    | CircuitBreakerCallRejectedEventEntity.Type
    | CircuitBreakerCallSucceededEventEntity.Type
    | CircuitBreakerManualOpenEventEntity.Type
    | CircuitBreakerManualResetEventEntity.Type
    | CircuitBreakerResetTimeoutElapsedEventEntity.Type
  ): void {
    const step = this.#machine.transition(this.#machineState, event);
    this.#machineState = step.state;
    const effectsLength = step.effects.length;
    for (let i = 0; i < effectsLength; i++) {
      const effect = step.effects.at(i);
      if (effect === undefined) {continue;}
      this.#applyEffect(effect);
    }
  }

  #applyEffect(
    effect: CircuitBreakerOnCloseEffectEntity.Type
    | CircuitBreakerOnFailureEffectInterface
    | CircuitBreakerOnHalfOpenEffectEntity.Type
    | CircuitBreakerOnOpenEffectEntity.Type
    | CircuitBreakerOnRejectEffectEntity.Type
    | CircuitBreakerOnSuccessEffectEntity.Type
    | CircuitBreakerOnTripEffectEntity.Type
  ): void {
    const handlers = new Map<typeof effect.variant, () => void>([
      ['onClose', (): void => { this.hooks.invoke('onClose', () => { const result = this.onClose(); return result; }); }],
      ['onFailure', (): void => {
        if (effect.variant === 'onFailure') {
          this.hooks.invoke('onFailure', () => { const result = this.onFailure(effect.error); return result; });
        }
      }],
      ['onHalfOpen', (): void => { this.hooks.invoke('onHalfOpen', () => { const result = this.onHalfOpen(); return result; }); }],
      ['onOpen', (): void => { this.hooks.invoke('onOpen', () => { const result = this.onOpen(); return result; }); }],
      ['onReject', (): void => { this.hooks.invoke('onReject', () => { const result = this.onReject(); return result; }); }],
      ['onSuccess', (): void => { this.hooks.invoke('onSuccess', () => { const result = this.onSuccess(); return result; }); }],
      ['onTrip', (): void => { this.hooks.invoke('onTrip', () => { const result = this.onTrip(); return result; }); }]
    ]);
    const handler = handlers.get(effect.variant);
    if (handler === undefined) {
      throw new TypeError(`No handler for effect '${effect.variant}'`);
    }
    handler();
  }
}
