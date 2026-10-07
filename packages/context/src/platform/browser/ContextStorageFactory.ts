import type { ContextStorageInterface } from '../../interfaces/ContextStorageInterface.js';

import { BrowserContextStorage } from '../../browser/BrowserContextStorage.js';

export class ContextStorageFactory {
  static createDefault(): ContextStorageInterface {
    const result = new BrowserContextStorage();

    return result;
  }
}
