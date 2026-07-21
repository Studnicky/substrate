/**
 * Browser stub for UndiciDispatcher.
 * undici connection pooling requires a Node.js runtime.
 * Browser bundlers swap this file in place of the Node version via the
 * "browser" field in package.json.
 */

import type { DestroyOptionsEntity } from '../../entities/DestroyOptionsEntity.js';
import type { DispatcherHealthEntity } from '../../entities/DispatcherHealthEntity.js';
import type { UndiciDispatcherInterface } from '../../interfaces/UndiciDispatcherInterface.js';

import { ConfigurationError } from '../../errors/index.js';

const BROWSER_ERROR_MESSAGE =
  'undici connection pooling requires a Node.js runtime; the browser uses native fetch';

/**
 * Browser-environment stub. All instance methods throw ConfigurationError
 * because create() throws before any instance is constructed.
 */
export class UndiciDispatcher implements UndiciDispatcherInterface {
  static create(_agent: unknown): UndiciDispatcher {
    throw new ConfigurationError(BROWSER_ERROR_MESSAGE);
  }

  /** Browser construction follows the canonical create-only surface. */
  protected constructor() {}

  checkDispatcherHealth(_origin: string): DispatcherHealthEntity.Type {
    throw new ConfigurationError(BROWSER_ERROR_MESSAGE);
  }

  close(): Promise<void> {
    throw new ConfigurationError(BROWSER_ERROR_MESSAGE);
  }

  destroy(_options?: DestroyOptionsEntity.Type): Promise<void> {
    throw new ConfigurationError(BROWSER_ERROR_MESSAGE);
  }

  getStats(): Readonly<Record<string, unknown>> {
    throw new ConfigurationError(BROWSER_ERROR_MESSAGE);
  }
}
