import type { RequestExecutorExecuteOptionsDataEntity } from '../entities/RequestExecutorExecuteOptionsDataEntity.js';

/** Per-call overrides accepted by `RequestExecutor.execute()`. */
export interface RequestExecutorExecuteOptionsInterface {
  /** Deadline in milliseconds for this call, overriding the executor default. */
  readonly 'deadlineMs'?: RequestExecutorExecuteOptionsDataEntity.Type['deadlineMs'];

  /** Initial values seeded into the request scope when a scope factory is composed. */
  readonly 'scopeInitial'?: RequestExecutorExecuteOptionsDataEntity.Type['scopeInitial'];

  /** Caller signal merged with the deadline through the executor's composed `Signal` instance. */
  readonly 'signal'?: AbortSignal;
}
