/**
 * ProcessKit configuration contract
 */

import type { EffectHandlerInterface, StateMachine } from '@studnicky/fsm';
import type { SchedulerProviderInterface } from '@studnicky/scheduler';

/**
 * Configuration accepted by `ProcessKit.create()`.
 *
 * `machine` is the only required field — a consumer always supplies their own
 * `StateMachine` subclass with its `reduce()`/`getInitialState()` implemented and
 * whichever of the 6 lifecycle hooks (`onTransition`, `onEnterState`, `onExitState`,
 * `onTransitionRejected`, `isTerminated`, `onTerminatedAccess`) it wants to observe.
 * Every other field is optional and defaulted internally.
 */
export interface ProcessKitConfigInterface<
  TState extends { readonly 'variant': string },
  TEvent extends { readonly 'type': string },
  TEffect extends { readonly 'variant': string } = never
> {
  /**
   * Effect handler passed straight to `EffectInterpreter.create({ machine, handler })`.
   * No default — a machine with no effects needs none.
   */
  readonly 'handler'?: EffectHandlerInterface<TEffect, TEvent> | undefined;

  /**
   * The caller-supplied `StateMachine` subclass. Required — `ProcessKit` never invents a
   * reducer, only wires one to an interpreter and a scheduler.
   */
  readonly 'machine': StateMachine<TState, TEvent, TEffect>;

  /**
   * A pre-built `SchedulerProviderInterface`. Defaults to `RealTimeScheduler.create()`.
   * Pass a `VirtualScheduler` for deterministic test fixtures — no kit-side test-mode flag.
   */
  readonly 'scheduler'?: SchedulerProviderInterface | undefined;
}
