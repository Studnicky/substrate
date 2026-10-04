import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { WorkerPoolError } from '../../../src/worker/errors/index.js';

export class WorkerFixturePath {
  /** Resolves a path written relative to a `tests/unit` spec to its absolute location. */
  static resolve(relativePath: string): string {
    const absolutePath = resolve(import.meta.dirname, relativePath);
    return absolutePath;
  }

  /** Resolves a path relative to the module URL supplied by a scenario spec. */
  static resolveFromModule(relativePath: string, moduleUrl: string): string {
    try {
      const workerUrl = new URL(relativePath, moduleUrl);
      const absolutePath = fileURLToPath(workerUrl);
      return absolutePath;
    } catch (cause) {
      throw WorkerPoolError.from(
        cause,
        'workerPool.invalidWorkerPath',
        'worker path cannot be resolved'
      );
    }
  }
}
