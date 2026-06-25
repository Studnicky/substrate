import type { OwnerTokenInterface } from './OwnerTokenInterface.js';

export class NodeOwnerToken implements OwnerTokenInterface {
  get(): string {
    const result = String(process.pid);
    return result;
  }
}
