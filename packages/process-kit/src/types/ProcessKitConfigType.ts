/**
 * ProcessKit configuration type
 */

import type { EffectHandlerMapType, StateMachine } from '@studnicky/fsm';
import type { SchedulerProviderType } from '@studnicky/scheduler';
import type { Signal } from '@studnicky/signal';

/**
 * Configuration accepted by `ProcessKit.create()` / `ProcessKitBuilder`.
 *
 * `machine` is the only required field — a consumer always supplies their own
 * `StateMachine` subclass with its `reduce()`/`getInitialState()` implemented and
 * whichever of the 6 lifecycle hooks (`onTransition`, `onEnterState`, `onExitState`,
 * `onTransitionRejected`, `isTerminated`, `onTerminatedAccess`) it wants to observe.
 * Every other field is optional and defaulted internally.
 */
export type ProcessKitConfigType<
  TState extends { readonly 'variant': string },
  TEvent extends { readonly 'type': string },
  TEffect extends { readonly 'variant': string } = never
> = {
  /**
   * Effect handlers passed straight to `EffectInterpreter.create({ machine, handlers })`.
   * No default — a machine with no effects needs none.
   */
  'handlers'?: EffectHandlerMapType<TEffect, TEvent>;

  /**
   * The caller-supplied `StateMachine` subclass. Required — `ProcessKit` never invents a
   * reducer, only wires one to an interpreter, a scheduler, and a signal source.
   */
  'machine': StateMachine<TState, TEvent, TEffect>;

  /**
   * A pre-built `SchedulerProviderType`. Defaults to `RealTimeScheduler.create()`.
   * Pass a `VirtualScheduler` for deterministic test fixtures — no kit-side test-mode flag.
   */
  'scheduler'?: SchedulerProviderType;

  /**
   * A pre-built `Signal` instance. Defaults to `Signal.create()`.
   */
  'signal'?: Signal;
};
