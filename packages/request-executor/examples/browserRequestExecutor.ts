import type { OperationFunctionInterface } from '@studnicky/pipeline/interfaces';
import type { RequestExecutorOperationContextInterface } from '@studnicky/request-executor/interfaces';

import { BrowserFetchClient } from '@studnicky/fetch/browser';
import { OperationPipeline } from '@studnicky/pipeline/browser';
import { RequestExecutor } from '@studnicky/request-executor/browser';
import { Retry } from '@studnicky/retry/browser';
import { Signal } from '@studnicky/signal/browser';

class BrowserExecutionPolicy {
  static async observe<TResult>(
    context: RequestExecutorOperationContextInterface,
    next: OperationFunctionInterface<RequestExecutorOperationContextInterface, TResult>
  ): Promise<TResult> {
    console.log({ 'aborted': context.signal.aborted, 'stage': 'before' });
    const result = await next(context);
    console.log({ 'stage': 'after' });
    return result;
  }
}

const originalFetch = globalThis.fetch;
let failuresRemaining = 2;

globalThis.fetch = (): Promise<Response> => {
  if (failuresRemaining > 0) {
    failuresRemaining -= 1;
    const result = Promise.resolve(new Response('retry', { 'status': 503 }));
    return result;
  }

  const result = Promise.resolve(new Response('ready', { 'status': 200 }));
  return result;
};

try {
  const executor = RequestExecutor.create({
    'fetchClient': BrowserFetchClient.create({ 'baseURL': 'https://example.test' }),
    'pipeline': OperationPipeline.create([BrowserExecutionPolicy.observe]),
    'retry': Retry.create({ 'maximumRetries': 3 }),
    'signal': Signal.create()
  });
  const response = await executor.execute(async (client, signal): Promise<Response> => {
    const result = await client.get('/health', { 'signal': signal });
    if (!result.ok) {
      throw new Error(`HTTP ${String(result.status)}`);
    }
    return result;
  });

  console.log({ 'body': await response.text(), 'status': response.status });
} finally {
  globalThis.fetch = originalFetch;
}
