import { resolve } from 'node:path';

export class WorkerFixturePath {
  /** Resolves a path written relative to a `tests/unit` spec to its absolute location. */
  static resolve(relativePath: string): string {
    const absolutePath = resolve(import.meta.dirname, relativePath);
    return absolutePath;
  }
}
