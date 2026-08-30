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

  public async request(worker: WebWorkerInterface, request: TRequest): Promise<TResponse> {
    return await new Promise<TResponse>((resolve, reject): void => {
      const cleanup = (): void => {
        worker.removeEventListener('error', onError);
        worker.removeEventListener('message', onMessage);
      };
      const onError = (event: WebWorkerErrorEventInterface): void => {
        cleanup();
        reject(new WorkerPoolError({
          'code': 'webWorkerTransport.error',
          'message': event.message === '' ? 'Web Worker failed while processing a request' : event.message
        }));
      };
      const onMessage = (event: WebWorkerMessageEventInterface): void => {
        cleanup();
        try {
          resolve(this.#decode(event.data));
        } catch (error) {
          reject(error);
        }
      };

      worker.addEventListener('error', onError);
      worker.addEventListener('message', onMessage);
      try {
        worker.postMessage(request);
      } catch (error) {
        cleanup();
        reject(error);
      }
    });
  }
}
