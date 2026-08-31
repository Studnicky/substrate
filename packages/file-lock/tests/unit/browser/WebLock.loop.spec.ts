import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type {
  LockInterface,
  WebLockManagerInterface
} from '../../../src/browser/index.js';
import { WebLock } from '../../../src/browser/index.js';

interface LockRequestInterface {
  readonly 'callback': () => Promise<undefined>;
  readonly 'reject': (reason: unknown) => void;
  readonly 'resolve': (value: undefined) => void;
}

class TestWebLockManager implements WebLockManagerInterface {
  readonly #requests: LockRequestInterface[] = [];
  #held = false;

  public request(
    _name: string,
    _options: { readonly 'mode': 'exclusive' },
    callback: () => Promise<undefined>
  ): Promise<undefined> {
    const result = new Promise<undefined>((resolve, reject) => {
      this.#requests.push({ 'callback': callback, reject, resolve });
    });

    this.#dispatch();
    return result;
  }

  #dispatch(): void {
    if (this.#held) {
      return;
    }

    const request = this.#requests.shift();
    if (request === undefined) {
      return;
    }

    this.#held = true;
    void request.callback().then(
      (value): void => {
        this.#held = false;
        request.resolve(value);
        this.#dispatch();
      },
      (error: unknown): void => {
        this.#held = false;
        request.reject(error);
        this.#dispatch();
      }
    );
  }
}

void describe('WebLock', () => {
  void it('implements the portable release contract and serializes acquisitions', async () => {
    const lockManager = new TestWebLockManager();
    const first: LockInterface = await WebLock.create({ 'lockManager': lockManager, 'name': 'inventory' });
    let secondAcquired = false;
    const second = WebLock.create({ 'lockManager': lockManager, 'name': 'inventory' }).then((lock): WebLock => {
      secondAcquired = true;
      return lock;
    });

    await Promise.resolve();
    assert.equal(secondAcquired, false);

    first.release();
    const secondLock = await second;
    assert.equal(secondAcquired, true);

    secondLock.release();
  });
});
