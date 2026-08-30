import type { RequestDeadlineEntity } from '../entities/RequestDeadlineEntity.js';

/** Per-call overrides accepted by `RequestExecutor.execute()`. */
export interface RequestExecutorExecuteOptionsInterface {
  /** Deadline in milliseconds for this call, overriding the executor default. */
  readonly 'deadlineMs'?: RequestDeadlineEntity.Type['deadlineMs'];

  /** Initial values seeded into the request scope when a scope factory is composed. */
  readonly 'scopeInitial'?: Record<string, unknown>;

  /** Caller signal merged with the deadline through the executor's composed `Signal` instance. */
  readonly 'signal'?: AbortSignal;
}
