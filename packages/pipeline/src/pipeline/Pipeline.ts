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
 * - `afterStage(ctx, index)` — after each stage fn; return value becomes
 *   ctx for the next stage (or the final result if it was the last stage)
 * - `onRunComplete(ctx)` — after all stages complete; return value is the
 *   resolved result of run()
 *
 * @example
 * ```typescript
 * import { Pipeline } from '@studnicky/pipeline';
 *
 * interface RequestCtx { url: string; headers: Record<string, string> }
 *
 * const pipeline = new Pipeline<RequestCtx>();
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

import type { PipelineInterface } from '../interfaces/PipelineInterface.js';
import type { PipelineFnType } from '../types/PipelineFnType.js';

import { PipelineError } from '../errors/PipelineError.js';

export class Pipeline<T> implements PipelineInterface<T> {
  protected fns: PipelineFnType<T>[] = [];

  /**
   * Readonly view of the registered transform functions.
   * Returns the live array reference as a readonly view — order reflects
   * registration order. Exposed so external observers (e.g. `InterceptorManager`)
   * can inspect pipeline contents without subclassing.
   */
  get stages(): readonly PipelineFnType<T>[] {
    const result = this.fns;
    return result;
  }

  /**
   * Add a transform function to the pipeline
   *
   * @param fn - Transform function to add
   * @returns Function that removes this transform when called
   */
  add(fn: PipelineFnType<T>): () => void {
    this.fns.push(fn);

    return () => {
      const index = this.fns.indexOf(fn);

      if (index !== -1) {
        this.fns.splice(index, 1);
      }
    };
  }

  /**
   * Remove all transform functions
   */
  clear(): void {
    this.fns.length = 0;
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

  /**
   * Run the context through all registered transforms in order
   *
   * @param ctx - Initial context value
   * @returns Context after all transforms have been applied
   */
  private async runStage(fn: PipelineFnType<T>, input: T): Promise<T> {
    try {
      const output = await fn(input);
      return output;
    } catch (err: unknown) {
      throw new PipelineError('Pipeline stage failed', err);
    }
  }

  async run(ctx: T): Promise<T> {
    let current = this.onRunStart(ctx);

    const fnsLen = this.fns.length;
    for (let i = 0; i < fnsLen; i++) {
      const fn = this.fns[i]!;
      const input = this.beforeStage(current, i);
      const output = await this.runStage(fn, input);
      current = this.afterStage(output, i);
    }

    return this.onRunComplete(current);
  }
}
