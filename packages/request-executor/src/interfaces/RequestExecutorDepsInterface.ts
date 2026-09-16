import type { FetchClientInterface } from '@studnicky/fetch/interfaces';
import type { OperationPipelineInterface } from '@studnicky/pipeline/interfaces';
import type { RetryInterface } from '@studnicky/retry/interfaces';
import type { SignalInterface } from '@studnicky/signal/interfaces';

import type { RequestExecutorConfigDataEntity } from '../entities/RequestExecutorConfigDataEntity.js';
import type { RequestExecutorOperationContextInterface } from './RequestExecutorOperationContextInterface.js';
import type { RequestScopeFactoryInterface } from './RequestScopeFactoryInterface.js';

/** Fully resolved runtime dependencies retained by a `RequestExecutor`. */
export interface RequestExecutorDepsInterface {
  readonly 'deadlineMs': RequestExecutorConfigDataEntity.Type['deadlineMs'] | undefined;
  readonly 'fetchClient': FetchClientInterface;
  readonly 'pipeline': OperationPipelineInterface<RequestExecutorOperationContextInterface> | undefined;
  readonly 'retry': RetryInterface;
  readonly 'scope': RequestScopeFactoryInterface | undefined;
  readonly 'signal': SignalInterface;
}
