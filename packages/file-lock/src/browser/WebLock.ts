import type { LockInterface } from '../interfaces/LockInterface.js';
import type { WebLockCreateOptionsInterface } from './WebLockCreateOptionsInterface.js';
import type { WebLockManagerInterface } from './WebLockManagerInterface.js';

import { WebLockOptionsEntity } from '../entities/WebLockOptionsEntity.js';
import { FileLockConfigError } from '../errors/FileLockConfigError.js';

class WebLockManager {
  static isLockManager(value: object): value is WebLockManagerInterface {
    const result = Reflect.has(value, 'request') && typeof Reflect.get(value, 'request') === 'function';

    return result;
  }

  static get(): WebLockManagerInterface {
    const navigator: unknown = Reflect.get(globalThis, 'navigator');

    if (typeof navigator === 'object' && navigator !== null) {
      const locks: unknown = Reflect.get(navigator, 'locks');

      if (typeof locks === 'object' && locks !== null && WebLockManager.isLockManager(locks)) {
        return locks;
      }
    }

    throw new FileLockConfigError('Web Locks API is unavailable in this browser context.');
  }
}

/** Browser-origin mutex backed by the native Web Locks API. */
export class WebLock implements LockInterface {
  readonly #releaseSignal: PromiseWithResolvers<undefined>;
  #released: boolean;

  private constructor() {
    this.#releaseSignal = Promise.withResolvers<undefined>();
    this.#released = false;
  }

  public static async create(options: WebLockCreateOptionsInterface): Promise<WebLock> {
    const validated = WebLockOptionsEntity.intake({ 'name': options.name });
    const lock = new WebLock();
    const manager = options.lockManager ?? WebLockManager.get();

    return await new Promise<WebLock>((resolve, reject) => {
      manager.request(validated.name, { 'mode': 'exclusive' }, async () => {
        resolve(lock);
        await lock.#releaseSignal.promise;

        return undefined;
      }).catch(reject);
    });
  }

  public release(): void {
    if (this.#released) {
      return;
    }

    this.#released = true;
    this.#releaseSignal.resolve(undefined);
  }
}
