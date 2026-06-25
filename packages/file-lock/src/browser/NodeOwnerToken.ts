import type { OwnerTokenInterface } from '../OwnerTokenInterface.js';

export class NodeOwnerToken implements OwnerTokenInterface {
  get(): string {
    const result = globalThis.crypto.randomUUID();
    return result;
  }
}
