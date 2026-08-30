import { Predicates } from '@studnicky/types';

import type { WorkerFactoryInterface, WorkerObservationInterface } from '../interfaces/index.js';
import type { WebWorkerFactoryOptionsInterface } from './WebWorkerFactoryOptionsInterface.js';
import type { WebWorkerInterface } from './WebWorkerInterface.js';

import { WorkerPoolError } from '../errors/index.js';

interface WebWorkerConstructorInterface {
  new (script: string | URL, options?: WebWorkerFactoryOptionsInterface['options']): WebWorkerInterface;
}

class WebWorkerObservation implements WorkerObservationInterface {
  readonly #onError: () => void;
  readonly #worker: WebWorkerInterface;
  #alive = true;

  public constructor(worker: WebWorkerInterface) {
    this.#worker = worker;
    this.#onError = (): void => {
      this.#alive = false;
    };
    this.#worker.addEventListener('error', this.#onError);
  }

  public close(): void {
    this.#worker.removeEventListener('error', this.#onError);
  }

  public isAlive(): boolean {
    const result = this.#alive;
    return result;
  }
}

/** Native browser Worker factory for `WebWorkerPool`. */
export class WebWorkerFactory implements WorkerFactoryInterface<WebWorkerInterface> {
  readonly #options: WebWorkerFactoryOptionsInterface['options'];
  readonly #script: string | URL;
  readonly #workers = new Set<WebWorkerInterface>();

  private constructor(options: WebWorkerFactoryOptionsInterface) {
    this.#options = options.options;
    this.#script = options.script;
  }

  public static create(options: WebWorkerFactoryOptionsInterface): WebWorkerFactory {
    if (Predicates.isString(options.script) && options.script.length === 0) {
      throw new WorkerPoolError({
        'code': 'webWorkerFactory.invalidScript',
        'message': 'WebWorkerFactory script must be a non-empty string or URL'
      });
    }

    return new WebWorkerFactory(options);
  }

  static #isWorkerConstructor(value: unknown): value is WebWorkerConstructorInterface {
    const result = Predicates.isFunction(value);
    return result;
  }

  public create(): Promise<WebWorkerInterface> {
    const candidate: unknown = Reflect.get(globalThis, 'Worker');
    if (!WebWorkerFactory.#isWorkerConstructor(candidate)) {
      const result = Promise.reject(new WorkerPoolError({
        'code': 'webWorkerFactory.unavailable',
        'message': 'Web Workers are unavailable in this browser context'
      }));
      return result;
    }
    const workerConstructor = candidate;

    const result = Promise.resolve().then((): WebWorkerInterface => {
      const worker = new workerConstructor(this.#script, this.#options);
      this.#workers.add(worker);
      return worker;
    });
    return result;
  }

  public initialize(_worker: WebWorkerInterface): Promise<void> {
    const result = Promise.resolve();
    return result;
  }

  public observe(worker: WebWorkerInterface): WorkerObservationInterface {
    const result = new WebWorkerObservation(worker);
    return result;
  }

  public async terminate(worker: WebWorkerInterface): Promise<void> {
    if (!this.#workers.delete(worker)) {
      return;
    }
    worker.terminate();
    await Promise.resolve();
  }
}
