/**
 * Generic typed async pipeline.
 *
 * A pipeline runs its ordered transform stages against one context value.
 * `beforeStage` and `afterStage` are the only protected hooks that can alter
 * that value or eject a run. All lifecycle hooks are observers: their return
 * values are ignored and a throw, rejected promise, or snapshot failure never
 * changes, delays, or replaces the stage or run outcome. Context observers receive
 * detached, deeply frozen snapshots. When a context cannot be snapshotted, that
 * observer is skipped.
 *
 * @example
 * ```typescript
 * import { Pipeline } from '@studnicky/pipeline/node';
 *
 * const pipeline = Pipeline.create<number>([(value) => value + 1]);
 * const result = await pipeline.run(1);
 * ```
 */


import { ImmutableSnapshot } from '@studnicky/json/browser';

import type { PipelineFunctionInterface } from '../interfaces/PipelineFunctionInterface.js';
import type { PipelineInterface } from '../interfaces/PipelineInterface.js';


export class Pipeline<T> implements PipelineInterface<T> {
  /**
   * Create a new Pipeline instance.
   *
   * @param stages - Ordered transform functions to run, fixed for the life
   *   of the instance.
   * @returns New Pipeline instance
   *
   * @example
   * ```typescript
   * const pipeline = Pipeline.create<RequestCtx>([authStage]);
   * ```
   */
  static create<T>(
    stages: readonly PipelineFunctionInterface<T>[]
  ): Pipeline<T> {
    // `new this()` so subclass factories return the subclass instance.
    return new this<T>(stages);
  }

  /**
   * @param stages - Ordered transform functions to run, fixed for the life
   *   of the instance.
   */
  protected constructor(
    stages: readonly PipelineFunctionInterface<T>[]
  ) {
    this.fns = [...stages];
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
   * Fires before the first stage. This is an observer: its return value is
   * ignored, and a thrown or rejected observer never affects the run.
   *
   * @param _context - Detached, deeply frozen snapshot of the context passed to run()
   */
  protected onRunStart(_context: Readonly<T>): void | Promise<void> {}

  /**
   * Called before each stage fn in run().
   * Return value is passed as the argument to that stage's fn.
   * Pass-through default — override to transform per-stage input.
   *
   * @param ctx - The context value that will be passed to the stage
   * @param _index - Zero-based index of the stage about to run
   * @returns Context to pass to the stage fn
   */
  protected beforeStage(context: T, _index: number): T {
    const result = context;
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
  protected afterStage(context: T, _index: number): T {
    const result = context;
    return result;
  }

  /**
   * Fires after every stage has completed. This is an observer: its return
   * value is ignored, and a thrown or rejected observer never affects the run.
   *
   * @param _context - Detached, deeply frozen snapshot of the final transformed context
   */
  protected onRunComplete(_context: Readonly<T>): void | Promise<void> {}

  /**
   * Fires at the start of each stage, after beforeStage() and before the stage.
   * The context is a detached, deeply frozen snapshot. Observer and snapshot failures are isolated from the pipeline outcome.
   */
  protected onStageStart(_index: number, _context: Readonly<T>): void | Promise<void> {}

  /** Fires after a successful stage and before afterStage(). The context is a detached, deeply frozen snapshot. */
  protected onStageSuccess(_index: number, _context: Readonly<T>): void | Promise<void> {}

  /** Fires when a stage throws, before the original error is propagated. */
  protected onStageError(_index: number, _error: unknown): void | Promise<void> {}

  /** Fires after onStageError when the original error is propagated. */
  protected onRunError(_error: unknown): void | Promise<void> {}

  static #ignoreObserverFailure(): void {}

  #observeContext(context: T, observer: (snapshot: Readonly<T>) => void | Promise<void>): void {
    this.#observe(() => {
      const snapshot = ImmutableSnapshot.from(context);
      const result = observer(snapshot);
      return result;
    });
  }

  #observe(observer: () => void | Promise<void>): void {
    try {
      const completion = observer();
      void Promise.resolve(completion).catch(Pipeline.#ignoreObserverFailure);
    } catch {}
  }

  private async runStage(stageFunction: PipelineFunctionInterface<T>, input: T, index: number): Promise<T> {
    try {
      const output = await stageFunction(input);
      return output;
    } catch (error: unknown) {
      this.#observe(() => {
        const result = this.onStageError(index, error);
        return result;
      });
      throw error;
    }
  }

  async #runStageWithErrorHandling(stageFunction: PipelineFunctionInterface<T>, input: T, index: number): Promise<T> {
    try {
      const output = await this.runStage(stageFunction, input, index);
      return output;
    } catch (error: unknown) {
      this.#observe(() => {
        const result = this.onRunError(error);
        return result;
      });
      throw error;
    }
  }

  /** Run the context through all constructed transforms in order. */
  async run(context: T): Promise<T> {
    this.#observeContext(context, (snapshot) => {
      const result = this.onRunStart(snapshot);
      return result;
    });
    let current = context;
    const stageCount = this.fns.length;

    for (let index = 0; index < stageCount; index += 1) {
      const stageFunction = this.fns[index]!;
      const input = this.beforeStage(current, index);
      this.#observeContext(input, (snapshot) => {
        const result = this.onStageStart(index, snapshot);
        return result;
      });

      const output = await this.#runStageWithErrorHandling(stageFunction, input, index);

      this.#observeContext(output, (snapshot) => {
        const result = this.onStageSuccess(index, snapshot);
        return result;
      });
      current = this.afterStage(output, index);
    }

    this.#observeContext(current, (snapshot) => {
      const result = this.onRunComplete(snapshot);
      return result;
    });
    return current;
  }
}
