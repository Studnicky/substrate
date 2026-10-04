import type { EntityIntakeFunctionInterface } from '@studnicky/entity/interfaces';

import type { WorkerTransportInterface } from '../interfaces/index.js';
import type { WebWorkerErrorEventInterface } from './WebWorkerErrorEventInterface.js';
import type { WebWorkerInterface } from './WebWorkerInterface.js';
import type { WebWorkerMessageEventInterface } from './WebWorkerMessageEventInterface.js';
import type { WebWorkerMessageTransportOptionsInterface } from './WebWorkerMessageTransportOptionsInterface.js';

import { WorkerPoolError } from '../errors/index.js';

/** One-message request/response transport for native browser Workers. */
export class WebWorkerMessageTransport<TRequest, TResponse> implements WorkerTransportInterface<WebWorkerInterface, TRequest, TResponse> {
  readonly #decode: WebWorkerMessageTransportOptionsInterface<TResponse>['decode'];

  private constructor(options: WebWorkerMessageTransportOptionsInterface<TResponse>) {
    this.#decode = options.decode;
  }

  public static create<TRequest, TResponse>(
    options: WebWorkerMessageTransportOptionsInterface<TResponse>
  ): WebWorkerMessageTransport<TRequest, TResponse> {
    return new WebWorkerMessageTransport(options);
  }

  public static fromEntity<TRequest, TResponse>(
    intake: EntityIntakeFunctionInterface<TResponse>
  ): WebWorkerMessageTransport<TRequest, TResponse> {
    return new WebWorkerMessageTransport({ 'decode': intake });
  }

  public async request(worker: WebWorkerInterface, request: TRequest): Promise<TResponse> {
    const event = await new Promise<WebWorkerMessageEventInterface>((resolve, reject): void => {
      const cleanup = (): void => {
        worker.removeEventListener('error', onError);
        worker.removeEventListener('message', onMessage);
      };
      const onError = (errorEvent: WebWorkerErrorEventInterface): void => {
        cleanup();
        reject(new WorkerPoolError({
          'code': 'webWorkerTransport.error',
          'message': errorEvent.message === '' ? 'Web Worker failed while processing a request' : errorEvent.message
        }));
      };
      const onMessage = (messageEvent: WebWorkerMessageEventInterface): void => {
        cleanup();
        resolve(messageEvent);
      };

      worker.addEventListener('error', onError);
      worker.addEventListener('message', onMessage);
      try {
        worker.postMessage(request);
      } catch (cause) {
        cleanup();
        reject(new WorkerPoolError({
          'cause': cause,
          'code': 'webWorkerTransport.postFailed',
          'message': 'Web Worker request could not be posted'
        }));
      }
    });
    const result = this.#decode(event.data);
    return result;
  }
}
