import type { FetchClientInterface } from '@studnicky/fetch/interfaces';

/** Runtime values passed to every request execution policy. */
export interface RequestExecutorOperationContextInterface {
  /** Fetch client supplied to the executor. */
  readonly 'fetchClient': FetchClientInterface;

  /** Signal composed for this individual execution. */
  readonly 'signal': AbortSignal;
}
