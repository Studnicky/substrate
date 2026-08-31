import type { WebWorkerErrorEventInterface } from './WebWorkerErrorEventInterface.js';
import type { WebWorkerMessageEventInterface } from './WebWorkerMessageEventInterface.js';

/** Browser Worker lifecycle surface required by WebWorkerPool. */
export interface WebWorkerInterface {
  readonly 'addEventListener': {
    (type: 'error', listener: (event: WebWorkerErrorEventInterface) => void): void;
    (type: 'message', listener: (event: WebWorkerMessageEventInterface) => void): void;
  };
  readonly 'postMessage': (message: unknown) => void;
  readonly 'removeEventListener': {
    (type: 'error', listener: (event: WebWorkerErrorEventInterface) => void): void;
    (type: 'message', listener: (event: WebWorkerMessageEventInterface) => void): void;
  };
  readonly 'terminate': () => void;
}
