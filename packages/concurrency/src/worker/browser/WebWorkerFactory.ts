import { Predicates } from '@studnicky/types/browser';

import type {
  WorkerFactoryInterface, WorkerObservationInterface
} from '../interfaces/index.js';
import type { WebWorkerFactoryOptionsInterface } from './WebWorkerFactoryOptionsInterface.js';
import type { WebWorkerInterface } from './WebWorkerInterface.js';

import { WorkerPoolError } from '../errors/index.js';
import { WebWorkerObservation } from './WebWorkerObservation.js';

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

    const result = new WebWorkerFactory(options);

    return result;
  }

  static #isWorkerConstructor(value: unknown): value is typeof Worker {
    if (!Predicates.isFunction(value)) {
      return false;
    }

    try {
      const probe: unknown = Reflect.construct(Function, [], value);

      const result = typeof probe === 'function';

      return result;
    } catch {
      return false;
    }
  }

  public async create(): Promise<WebWorkerInterface> {
    const candidate: unknown = Reflect.get(globalThis, 'Worker');

    if (!WebWorkerFactory.#isWorkerConstructor(candidate)) {
      const result = Promise.reject(new WorkerPoolError({
        'code': 'webWorkerFactory.unavailable',
        'message': 'Web Workers are unavailable in this browser context'
      }));

      return await result;
    }
    const WorkerConstructor = candidate;

    const result = Promise.resolve().then((): WebWorkerInterface => {
      try {
        const worker = new WorkerConstructor(this.#script, this.#options);

        this.#workers.add(worker);

        return worker;
      } catch (cause) {
        throw new WorkerPoolError({
          'cause': cause,
          'code': 'webWorkerFactory.createFailed',
          'message': 'Web Worker construction failed'
        });
      }
    });

    return await result;
  }

  public async initialize(worker: WebWorkerInterface): Promise<void> {
    this.#assertOwned(worker);
    await Promise.resolve();
  }

  public observe(worker: WebWorkerInterface): WorkerObservationInterface {
    this.#assertOwned(worker);
    const result = new WebWorkerObservation(worker);

    return result;
  }

  public async terminate(worker: WebWorkerInterface): Promise<void> {
    if (!this.#workers.delete(worker)) {
      return;
    }
    try {
      worker.terminate();
    } catch (cause) {
      throw new WorkerPoolError({
        'cause': cause,
        'code': 'webWorkerFactory.terminateFailed',
        'message': 'Web Worker termination failed'
      });
    }
    await Promise.resolve();
  }

  #assertOwned(worker: WebWorkerInterface): void {
    if (this.#workers.has(worker)) {
      return;
    }
    throw new WorkerPoolError({
      'code': 'webWorkerFactory.foreignWorker',
      'message': 'WebWorkerFactory only manages workers it created'
    });
  }
}
