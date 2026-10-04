import { RuntimeError } from '@studnicky/errors/node';
import { setTimeout } from 'node:timers/promises';

export class FailingOperation {
  attempts = 0;

  /** Counts the attempt, waits `delayMs` when positive, then rejects with `message`. */
  readonly run = async (): Promise<string> => {
    this.attempts += 1;
    if (this.#delayMs > 0) {
      await setTimeout(this.#delayMs);
    }
    throw RuntimeError.create(this.#message);
  };

  readonly #delayMs: number;

  readonly #message: string;

  constructor(message: string, delayMs = 0) {
    this.#message = message;
    this.#delayMs = delayMs;
  }
}
