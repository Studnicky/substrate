import type { OwnerTokenInterface } from '../interfaces/index.js';

export class NodeOwnerToken implements OwnerTokenInterface {
  readonly #token = globalThis.crypto.randomUUID();

  get(): string {
    return this.#token;
  }
}
