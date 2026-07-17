/**
 * Generic typed async pipeline
 *
 * Executes an ordered list of transform functions against a context value,
 * passing the result of each function as input to the next.
 *
 * Subclasses may override the protected hook methods to observe or
 * intercept pipeline execution. All hooks return T and have pass-through
 * defaults — super() call is not required unless the subclass needs base
 * behavior.
 *
 * Fire points in run():
 * - `onRunStart(ctx)` — before the first stage; return value becomes the
 *   initial ctx passed to stage 0
 * - `beforeStage(ctx, index)` — before each stage fn; return value is
 *   passed to the stage fn
 * - `onStageStart(index, ctx)` — after beforeStage, before the stage fn;
 *   void observer, no-op by default
 * - `onStageSuccess(index, ctx)` — after the stage fn succeeds, before
 *   afterStage; void observer, no-op by default
 * - `afterStage(ctx, index)` — after each stage fn; return value becomes
 *   ctx for the next stage (or the final result if it was the last stage)
 * - `onStageError(index, error)` — when a stage fn throws, before the
 *   error is wrapped and re-thrown; void observer, no-op by default
 * - `onRunError(error)` — when a stage fn throws, immediately after
 *   onStageError, receiving the wrapped PipelineError; void observer,
 *   no-op by default. Fires only for stage fn failures — not for throws
 *   from `beforeStage`, `afterStage`, `onStageStart`, `onStageSuccess`,
 *   `onRunStart`, or `onRunComplete`
 * - `onRunComplete(ctx)` — after all stages complete; return value is the
 *   resolved result of run()
 *
 * All four void observer hooks (`onStageStart`, `onStageSuccess`,
 * `onStageError`, `onRunError`) are invoked through the composed
 * `hooks: HookInvoker` field (see `HookInvoker`). A hook implementation that
 * throws or rejects propagates as a `HookInvocationError` — it is not
 * swallowed.
 *
 * @example
 * ```typescript
 * import { Pipeline } from '@studnicky/pipeline';
 *
 * interface RequestCtx { url: string; headers: Record<string, string> }
 *
 * const pipeline = Pipeline.create<RequestCtx>();
 *
 * // Add auth header
 * const remove = pipeline.add(async (ctx) => ({
 *   ...ctx,
 *   headers: { ...ctx.headers, Authorization: `Bearer ${token}` }
 * }));
 *
 * const result = await pipeline.run({ url: '/api/data', headers: {} });
 *
 * // Remove when no longer needed
 * remove();
 * ```
 */

import { HookInvoker, ValidationError } from '@studnicky/errors';

import type { PipelineInterface } from '../interfaces/PipelineInterface.js';
import type { PipelineFnType } from '../types/PipelineFnType.js';

import { PipelineOptionsEntity } from '../entities/PipelineOptionsEntity.js';
import { PipelineError } from '../errors/PipelineError.js';
import { PipelineBuilder } from './PipelineBuilder.js';

export class Pipeline<T> implements PipelineInterface<T> {
  protected readonly hooks: HookInvoker;

  /**
   * Create a fluent builder for constructing a Pipeline instance.
   *
   * @returns A new PipelineBuilder
   *
   * @example
   * ```typescript
   * const pipeline = Pipeline.builder<RequestCtx>().build();
   * ```
   */
  static builder<T>(): PipelineBuilder<T> {
    const result = PipelineBuilder.create<T>((options) => { const instance = Pipeline.create<T>(options); return instance; });
    return result;
  }

  /**
   * Create a new Pipeline instance.
   *
   * @param options - Optional configuration. See `PipelineOptionsEntity`.
   * @returns New Pipeline instance
   *
   * @example
   * ```typescript
   * const pipeline = Pipeline.create<RequestCtx>();
   * const withTimeout = Pipeline.create<RequestCtx>({ hookTimeoutMs: 5000 });
   * ```
   */
  static create<T>(options?: Readonly<PipelineOptionsEntity.Type>): Pipeline<T> {
    // `new this()` so subclass factories return the subclass instance.
    return new this<T>(options);
  }

  /**
   * @param options - Optional configuration, schema-validated against
   *   `PipelineOptionsEntity.Schema`. Left unset, hook invocation waits
   *   unbounded, matching prior behavior exactly.
   */
  protected constructor(options?: Readonly<PipelineOptionsEntity.Type>) {
    if (options !== undefined && !PipelineOptionsEntity.validate(options)) {
      throw ValidationError.create({
        'message': 'Must match PipelineOptionsEntity.Schema',
        'path': 'options'
      });
    }
    this.hooks = options?.hookTimeoutMs === undefined
      ? new HookInvoker()
      : new HookInvoker({ 'timeoutMs': options.hookTimeoutMs });
  }

  protected fns: PipelineFnType<T>[] = [];

  /**
   * Per-call tokens kept in lockstep with `fns`, one per registered stage.
   * Each `add()` call mints a unique token so its `remove()` closure can
   * identify its own stage by token identity rather than by function
   * reference — this disambiguates duplicate `fn` values registered via
   * separate `add()` calls, which `Array.prototype.indexOf` cannot.
   */
  #tokens: symbol[] = [];

  /**
   * Readonly view of the registered transform functions.
   * Returns the live array reference as a readonly view — order reflects
   * registration order. Exposed so external observers can inspect pipeline
   * contents without subclassing.
   */
  get stages(): readonly PipelineFnType<T>[] {
    const result = this.fns;
    return result;
  }

  /**
   * Add a transform function to the pipeline
   *
   * @param fn - Transform function to add
   * @returns Function that removes this transform when called — identifies
   *   its stage by a per-call token, so it removes the exact stage it was
   *   returned for even if the same `fn` value was registered more than once
   */
  add(fn: PipelineFnType<T>): () => void {
    const token = Symbol('pipeline-stage');
    this.fns.push(fn);
    this.#tokens.push(token);

    return () => {
      const index = this.#tokens.indexOf(token);

      if (index !== -1) {
        this.fns.splice(index, 1);
        this.#tokens.splice(index, 1);
      }
    };
  }

  /**
   * Remove all transform functions
   */
  clear(): void {
    this.fns.length = 0;
    this.#tokens.length = 0;
  }

  // Fast path: the common case is no self-removal/reordering, so the stage
  // still sits at `expectedIndex`. Only fall back to the linear scan when
  // that assumption fails.
  #resolveTokenIndex(expectedIndex: number, token: symbol): number {
    if (this.#tokens[expectedIndex] === token) { return expectedIndex; }
    return this.#tokens.indexOf(token);
  }

  /**
   * Called before the first stage in run().
   * Return value becomes the initial ctx passed to stage 0.
   * Pass-through default — override to pre-process the initial context.
   *
   * @param ctx - The context passed to run()
   * @returns Context to use as input to the first stage
   */
  protected onRunStart(ctx: T): T {
    const result = ctx;
    return result;
  }

  /**
   * Called before each stage fn in run().
   * Return value is passed as the argument to that stage's fn.
   * Pass-through default — override to intercept per-stage input.
   *
   * @param ctx - The context value that will be passed to the stage
   * @param _index - Zero-based index of the stage about to run
   * @returns Context to pass to the stage fn
   */
  protected beforeStage(ctx: T, _index: number): T {
    const result = ctx;
    return result;
  }

  /**
   * Called after each stage fn in run().
   * Return value becomes ctx for the next stage (or the final result).
   * Pass-through default — override to intercept per-stage output.
   *
   * @param ctx - The context value returned by the stage fn
   * @param _index - Zero-based index of the stage that just ran
   * @returns Context to use as input to the next stage
   */
  protected afterStage(ctx: T, _index: number): T {
    const result = ctx;
    return result;
  }

  /**
   * Called after all stages complete in run().
   * Return value is the resolved result of run().
   * Pass-through default — override to post-process the final context.
   *
   * @param ctx - The context value after all stages
   * @returns Final resolved value
   */
  protected onRunComplete(ctx: T): T {
    const result = ctx;
    return result;
  }

  // ── Void observer hooks ────────────────────────────────────────────────────

  /**
   * Fires at the start of each stage, after beforeStage(), before the stage fn runs.
   * No-op by default. Overrides must not throw or block.
   *
   * @param _index - Zero-based index of the stage
   * @param _ctx - Context value being passed to the stage fn
   */
  protected onStageStart(_index: number, _ctx: T): void {}

  /**
   * Fires after each stage fn completes successfully, before afterStage().
   * No-op by default. Overrides must not throw or block.
   *
   * @param _index - Zero-based index of the stage
   * @param _ctx - Context value returned by the stage fn
   */
  protected onStageSuccess(_index: number, _ctx: T): void {}

  /**
   * Fires when a stage fn throws, before the error is wrapped and re-thrown.
   * No-op by default. Overrides must not throw or block.
   *
   * @param _index - Zero-based index of the failing stage
   * @param _error - The raw error thrown by the stage fn
   */
  protected onStageError(_index: number, _error: unknown): void {}

  /**
   * Fires when a stage fn throws, immediately after onStageError().
   * The error at this point is a PipelineError wrapping the original.
   * Fires only for stage fn failures — not for throws from `beforeStage`,
   * `afterStage`, `onStageStart`, `onStageSuccess`, `onRunStart`, or
   * `onRunComplete`. No-op by default. Overrides must not throw or block.
   *
   * @param _error - The PipelineError wrapping the stage fn's failure
   */
  protected onRunError(_error: unknown): void {}

  /**
   * Run the context through all registered transforms in order
   *
   * @param ctx - Initial context value
   * @returns Context after all transforms have been applied
   */
  private async runStage(fn: PipelineFnType<T>, input: T, index: number): Promise<T> {
    try {
      const output = await fn(input);
      return output;
    } catch (err: unknown) {
      await Promise.resolve(this.hooks.invoke('onStageError', () => {
        const result = this.onStageError(index, err);
        return result;
      }));
      throw new PipelineError('Pipeline stage failed', err);
    }
  }

  /**
   * `true` while index `i` still names a live stage. Deliberately re-reads
   * `this.fns.length` on every call rather than a cached count, so `run()`'s
   * loop sees a mid-run `add()`/`remove()` immediately.
   */
  #hasStageAt(i: number): boolean {
    return i < this.fns.length;
  }

  /**
   * Runs a single stage via `runStage` and fires `onRunError` if it throws,
   * re-throwing so the caller's control flow is unaffected. Extracted out of
   * `run()`'s loop body — a try-catch inline in a loop defeats V8
   * optimization of the enclosing function.
   *
   * @param fn - Stage function to run
   * @param input - Context value to pass to the stage fn
   * @param index - Zero-based index of the stage
   * @returns The stage fn's output
   * @throws The original error, after `onRunError` has fired
   */
  async #runStageWithErrorHandling(fn: PipelineFnType<T>, input: T, index: number): Promise<T> {
    try {
      const output = await this.runStage(fn, input, index);
      return output;
    } catch (err: unknown) {
      await Promise.resolve(this.hooks.invoke('onRunError', () => {
        const result = this.onRunError(err);
        return result;
      }));
      throw err;
    }
  }

  /**
   * Run the context through all registered transforms in order.
   *
   * `fns` (and its parallel `#tokens`) are live, mutable structures — see
   * the `stages` getter doc-comment. A stage fn may capture and later
   * invoke an `add()`-returned `remove()` closure, including removing
   * itself or a not-yet-run later stage, mid-run. The loop condition calls
   * `#hasStageAt(i)`, which re-reads `this.fns.length` on every iteration
   * rather than caching it, so a mid-run removal takes effect immediately:
   * a removed not-yet-run stage is skipped in the CURRENT run. When the
   * stage that just ran removed itself, the loop realigns to the current
   * stage's token position so the next not-yet-run stage is not also
   * skipped as a side effect of the array shift.
   */
  async run(ctx: T): Promise<T> {
    let current = this.onRunStart(ctx);

    for (let i = 0; this.#hasStageAt(i); i++) {
      const token = this.#tokens[i];
      const fn = this.fns[i]!;
      const input = this.beforeStage(current, i);
      await Promise.resolve(this.hooks.invoke('onStageStart', () => {
        const result = this.onStageStart(i, input);
        return result;
      }));

      const output = await this.#runStageWithErrorHandling(fn, input, i);

      await Promise.resolve(this.hooks.invoke('onStageSuccess', () => {
        const result = this.onStageSuccess(i, output);
        return result;
      }));
      current = this.afterStage(output, i);

      // Realign `i` to the live array after the stage ran, in case it
      // removed itself or an earlier stage. `token` identifies the
      // stage that just ran; if it is gone (self-removal), the
      // not-yet-run stage that was next now occupies index `i` — the
      // loop's `i++` must not skip past it, so back up by one. If it
      // moved (an earlier stage was removed), continue from its new
      // position so the following `i++` lands on the correct next stage.
      const newIndex = this.#resolveTokenIndex(i, token!);
      i = newIndex === -1 ? i - 1 : newIndex;
    }

    return this.onRunComplete(current);
  }
}
