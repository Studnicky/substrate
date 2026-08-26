import type { OwnerTokenInterface } from './interfaces/index.js';

export class NodeOwnerToken implements OwnerTokenInterface {
  get(): string {
    const result = `${process.pid}`;
    return result;
  }
}
