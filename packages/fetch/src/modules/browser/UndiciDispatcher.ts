/**
 * Browser stub for UndiciDispatcher.
 * undici connection pooling requires a Node.js runtime.
 * Browser bundlers swap this file in place of the Node version via the
 * "browser" field in package.json.
 */

import type { Agent } from 'undici';

import type { UndiciDispatcherInterface } from '../../interfaces/UndiciDispatcherInterface.js';
import type { DestroyOptionsType } from '../../types/DestroyOptionsType.js';
import type { DispatcherConfigType } from '../../types/DispatcherConfigType.js';
import type { DispatcherHealthType } from '../../types/DispatcherHealthType.js';

import { ConfigurationError } from '../../errors/index.js';
import { UndiciDispatcherBuilder } from '../UndiciDispatcherBuilder.js';

const BROWSER_ERROR_MESSAGE =
  'undici connection pooling requires a Node.js runtime; the browser uses native fetch';

/**
 * Browser-environment stub. All instance methods throw ConfigurationError
 * because create() throws before any instance is constructed.
 */
export class UndiciDispatcher implements UndiciDispatcherInterface {
  static create(_config: DispatcherConfigType = {}): UndiciDispatcher {
    throw new ConfigurationError(BROWSER_ERROR_MESSAGE);
  }

  static builder(): UndiciDispatcherBuilder {
    const result = UndiciDispatcherBuilder.create((_options) => {
      throw new ConfigurationError(BROWSER_ERROR_MESSAGE);
    });
    return result;
  }

  checkDispatcherHealth(_origin: string): DispatcherHealthType {
    throw new ConfigurationError(BROWSER_ERROR_MESSAGE);
  }

  close(): Promise<void> {
    throw new ConfigurationError(BROWSER_ERROR_MESSAGE);
  }

  destroy(_options?: DestroyOptionsType): Promise<void> {
    throw new ConfigurationError(BROWSER_ERROR_MESSAGE);
  }

  getAgent(): Agent {
    throw new ConfigurationError(BROWSER_ERROR_MESSAGE);
  }

  getSignal(): AbortSignal {
    throw new ConfigurationError(BROWSER_ERROR_MESSAGE);
  }

  getStats(): Readonly<Record<string, unknown>> {
    throw new ConfigurationError(BROWSER_ERROR_MESSAGE);
  }
}
