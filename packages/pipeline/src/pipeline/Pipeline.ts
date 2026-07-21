/**
 * Generic typed async pipeline
 *
 * Executes an ordered list of transform functions against a context value,
 * passing the result of each function as input to the next.
 *
 * Subclasses may override the protected hook methods to observe pipeline
 * execution. All hooks return T and have pass-through defaults — super()
 * call is not required unless the subclass needs base behavior.
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
 * const authStage = async (ctx: RequestCtx) => ({
 *   ...ctx,
 *   headers: { ...ctx.headers, Authorization: `Bearer ${token}` }
 * });
 *
 * const pipeline = Pipeline.create<RequestCtx>([authStage]);
 *
 * const result = await pipeline.run({ url: '/api/data', headers: {} });
 * ```
 */

import { HookInvoker, ValidationError } from '@studnicky/errors';

import type { PipelineFunctionInterface } from '../interfaces/PipelineFunctionInterface.js';
import type { PipelineInterface } from '../interfaces/PipelineInterface.js';

import { PipelineOptionsEntity } from '../entities/PipelineOptionsEntity.js';
import { PipelineError } from '../errors/PipelineError.js';

export class Pipeline<T> implements PipelineInterface<T> {
  protected readonly hooks: HookInvoker;

  /**
   * Create a new Pipeline instance.
   *
   * @param stages - Ordered transform functions to run, fixed for the life
   *   of the instance.
   * @param options - Optional configuration. See `PipelineOptionsEntity`.
   * @returns New Pipeline instance
   *
   * @example
   * ```typescript
   * const pipeline = Pipeline.create<RequestCtx>([authStage]);
   * const withTimeout = Pipeline.create<RequestCtx>([authStage], { hookTimeoutMs: 5000 });
   * ```
   */
  static create<T>(
    stages: readonly PipelineFunctionInterface<T>[],
    options?: Readonly<PipelineOptionsEntity.Type>
  ): Pipeline<T> {
    // `new this()` so subclass factories return the subclass instance.
    return new this<T>(stages, options);
  }

  /**
   * @param stages - Ordered transform functions to run, fixed for the life
   *   of the instance.
   * @param options - Optional configuration, schema-validated against
   *   `PipelineOptionsEntity.Schema`. Left unset, hook invocation waits
   *   unbounded, matching prior behavior exactly.
   */
  protected constructor(
    stages: readonly PipelineFunctionInterface<T>[],
    options?: Readonly<PipelineOptionsEntity.Type>
  ) {
    if (options !== undefined && !PipelineOptionsEntity.validate(options)) {
      throw ValidationError.create({
        'message': 'Must match PipelineOptionsEntity.Schema',
        'path': 'options'
      });
    }
    this.hooks = options?.hookTimeoutMs === undefined
      ? new HookInvoker()
      : new HookInvoker({ 'timeoutMs': options.hookTimeoutMs });
    this.fns = stages;
  }

  protected readonly fns: readonly PipelineFunctionInterface<T>[];

  /**
   * Readonly snapshot of the transform functions in construction order.
   */
  get stages(): readonly PipelineFunctionInterface<T>[] {
    const result = [...this.fns];
    return result;
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
   * Pass-through default — override to transform per-stage input.
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
   * Pass-through default — override to transform per-stage output.
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
  private async runStage(fn: PipelineFunctionInterface<T>, input: T, index: number): Promise<T> {
    try {
      const output = await fn(input);
      return output;
    } catch (err: unknown) {
      await this.hooks.invokeAsync('onStageError', () => {
        const result = this.onStageError(index, err);
        return result;
      });
      throw new PipelineError('Pipeline stage failed', err);
    }
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
  async #runStageWithErrorHandling(fn: PipelineFunctionInterface<T>, input: T, index: number): Promise<T> {
    try {
      const output = await this.runStage(fn, input, index);
      return output;
    } catch (err: unknown) {
      await this.hooks.invokeAsync('onRunError', () => {
        const result = this.onRunError(err);
        return result;
      });
      throw err;
    }
  }

  /**
   * Run the context through all constructed transforms in order.
   */
  async run(ctx: T): Promise<T> {
    let current = this.onRunStart(ctx);
    const stageCount = this.fns.length;

    for (let i = 0; i < stageCount; i++) {
      const fn = this.fns[i]!;
      const input = this.beforeStage(current, i);
      await this.hooks.invokeAsync('onStageStart', () => {
        const result = this.onStageStart(i, input);
        return result;
      });

      const output = await this.#runStageWithErrorHandling(fn, input, i);

      await this.hooks.invokeAsync('onStageSuccess', () => {
        const result = this.onStageSuccess(i, output);
        return result;
      });
      current = this.afterStage(output, i);
    }

    return this.onRunComplete(current);
  }
}
