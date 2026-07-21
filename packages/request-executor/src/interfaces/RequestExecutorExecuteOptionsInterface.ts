import type { RequestDeadlineEntity } from '../entities/RequestDeadlineEntity.js';

/** Per-call overrides accepted by `RequestExecutor.execute()`. */
export interface RequestExecutorExecuteOptionsInterface {
  /** Initial values seeded into the context scope when a context is composed. */
  readonly 'contextInitial'?: Record<string, unknown>;

  /** Deadline in milliseconds for this call, overriding the executor default. */
  readonly 'deadlineMs'?: RequestDeadlineEntity.Type['deadlineMs'];

  /** Caller signal merged with the deadline through the executor's composed `Signal` instance. */
  readonly 'signal'?: AbortSignal;
}
