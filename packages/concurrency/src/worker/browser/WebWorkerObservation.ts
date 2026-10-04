import type { WorkerObservationInterface } from '../interfaces/index.js';
import type { WebWorkerInterface } from './WebWorkerInterface.js';

export class WebWorkerObservation implements WorkerObservationInterface {
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
