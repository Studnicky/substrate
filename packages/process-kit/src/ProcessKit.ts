/**
 * Reducer-with-effects process pattern composing @studnicky/fsm and /scheduler
 *
 * ---------------------------------------------------------------------------
 * ORCHESTRATION-BOUNDARY GUARDRAILS — read before extending this class.
 *
 * `ProcessKit` sits nearest the Dagonizer boundary of substrate's pattern kits, because a
 * reducer-with-effects shape is genuinely one step away from a workflow engine. Three
 * boundaries are load-bearing and must never be crossed by this class or a subclass:
 *
 * 1. `scheduleDispatch` must stay a single scheduled call to `dispatch()`/`send()` — it must
 *    never chain into nested `scheduler.scheduleAt` calls that branch on the resulting state
 *    (that is hand-rolling a workflow scheduler; a single `StateMachine` must own sequencing
 *    as ordinary transitions instead).
 * 2. `ProcessKit` must never grow a registry/lookup of multiple named instances — that shades
 *    into Dagonizer's node-placement concerns. Callers hold their own instance references.
 * 3. `stop()`/teardown must stay in-memory only — it must never grow checkpoint/resume
 *    persistence, which is reserved for Dagonizer's `dagonizer-store-*` packages.
 *
 * See `docs/concepts/composition-anti-patterns.md` (Process Kit orchestration-boundary risk
 * flags) and `docs/concepts/dagonizer-boundary.md` for the full rationale.
 * ---------------------------------------------------------------------------
 */

import type { ScheduledTaskInterface, SchedulerProviderInterface } from '@studnicky/scheduler';

import { EffectInterpreter } from '@studnicky/fsm';
import { RealTimeScheduler } from '@studnicky/scheduler';

import type { ProcessKitConfigInterface } from './interfaces/ProcessKitConfigInterface.js';

interface ProcessKitDepsInterface<
  TState extends { readonly 'variant': string },
  TEvent extends { readonly 'type': string },
  TEffect extends { readonly 'variant': string } = never
> {
  readonly 'interpreter': EffectInterpreter<TState, TEvent, TEffect>;
  readonly 'scheduler': SchedulerProviderInterface;
}

/**
 * Composes `@studnicky/fsm` (`StateMachine` + `EffectInterpreter`) and
 * `@studnicky/scheduler` into the "local process as explicit state plus scheduled
 * transitions" pattern.
 *
 * `ProcessKit` has no lifecycle hooks of its own. `dispatch()` returns the settled process
 * state, `scheduleDispatch()` returns a cancellable task handle, and callers retain ownership
 * of configured machines and schedulers when they need their lifecycle hooks.
 *
 * @example Direct composition
 * ```typescript
 * const kit = ProcessKit.create({ machine: new JobProcess() });
 * kit.start();
 * const state = await kit.dispatch({ type: 'start' });
 * ```
 */
export class ProcessKit<
  TState extends { readonly 'variant': string },
  TEvent extends { readonly 'type': string },
  TEffect extends { readonly 'variant': string } = never
> {
  /**
   * Creates a new ProcessKit, building the interpreter internally and defaulting any
   * omitted composed primitive.
   *
   * @param config - Composition configuration. `machine` is required.
   * @returns New ProcessKit instance
   */
  static create<
    S extends { readonly 'variant': string },
    E extends { readonly 'type': string },
    Ef extends { readonly 'variant': string } = never
  >(config: ProcessKitConfigInterface<S, E, Ef>): ProcessKit<S, E, Ef> {
    const interpreter = EffectInterpreter.create<S, E, Ef>({
      'handler': config.handler,
      'machine': config.machine
    });

    const result = new ProcessKit<S, E, Ef>({
      'interpreter': interpreter,
      'scheduler': config.scheduler ?? RealTimeScheduler.create()
    });
    return result;
  }

  readonly #interpreter: EffectInterpreter<TState, TEvent, TEffect>;
  readonly #scheduler: SchedulerProviderInterface;

  protected constructor(deps: ProcessKitDepsInterface<TState, TEvent, TEffect>) {
    this.#interpreter = deps.interpreter;
    this.#scheduler = deps.scheduler;
  }

  /**
   * Starts the composed `EffectInterpreter`, setting its initial state.
   */
  start(): void {
    this.#interpreter.start();
  }

  /**
   * Stops the composed `EffectInterpreter` and cancels every task tracked by the composed
   * scheduler. In-memory only — see the orchestration-boundary guardrails above.
   */
  stop(): void {
    this.#interpreter.stop();
    this.#scheduler.cancelAll();
  }

  /**
   * Sends `event` to the composed `EffectInterpreter` through its public mailbox and returns
   * the resulting state. This is the external entry point for driving the process — it always
   * goes through the interpreter's real `send()`, never the effect-handler `dispatch`
   * capability, which only reaches events still inside the same drain cycle.
   *
   * @param event - Event to send
   * @returns The interpreter's state after the event (and any same-cycle dispatched events)
   *   have fully drained
   */
  async dispatch(event: TEvent): Promise<TState> {
    await this.#interpreter.send(event);
    const result = this.#interpreter.getState();
    return result;
  }

  /**
   * Schedules `event` to be dispatched at `atMs` (epoch-ms) via the composed scheduler.
   *
   * The scheduled callback fires outside any drain cycle, so it goes through the same public
   * `dispatch()` (interpreter `send()`) path as a direct call — never the effect-handler
   * `dispatch` capability, which has no reach past the drain cycle that invoked it. Do not
   * chain further scheduled calls off the resulting state — see the orchestration-boundary
   * guardrails at the top of this file.
   *
   * @param atMs - Absolute epoch-ms at which to dispatch `event`
   * @param event - Event to dispatch when the scheduled time arrives
   * @returns The scheduled task handle, cancellable via `.cancel()`
   */
  scheduleDispatch(atMs: number, event: TEvent): ScheduledTaskInterface {
    const result = this.#scheduler.scheduleAt(atMs, async () => { await this.dispatch(event); });
    return result;
  }

}
