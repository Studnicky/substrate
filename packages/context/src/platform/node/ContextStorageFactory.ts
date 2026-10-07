import type { ContextStorageInterface } from '../../interfaces/ContextStorageInterface.js';

import { NodeContextStorage } from '../../node/NodeContextStorage.js';

export class ContextStorageFactory {
  static createDefault(): ContextStorageInterface {
    const result = new NodeContextStorage();

    return result;
  }
}
