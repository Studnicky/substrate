import type { DispatcherConfigEntity } from '../../entities/DispatcherConfigEntity.js';

import { ConfigurationError } from '../../errors/index.js';

const BROWSER_ERROR_MESSAGE =
  'undici connection pooling requires a Node.js runtime; the browser uses native fetch';

/** Rejects Node-only connection pooling in browser builds. */
export class DispatcherAgent {
  private constructor() {
    throw new TypeError('DispatcherAgent is a static factory');
  }

  static create(_config: DispatcherConfigEntity.Type): never {
    throw new ConfigurationError(BROWSER_ERROR_MESSAGE);
  }
}
