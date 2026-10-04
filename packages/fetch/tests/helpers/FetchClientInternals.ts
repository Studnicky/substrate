import assert from 'node:assert/strict';

import type { FetchClient } from '../../src/node/index.js';

import { UndiciDispatcher } from '../../src/node/index.js';

/**
 * Reaches the private members of a `FetchClient` that have no public surface, so a test can drive
 * the error-wrapping paths directly. Every call goes through `Reflect` on the member name.
 */
export class FetchClientInternals {
  static async handleSocketExhaustion(client: FetchClient, url: string, errorCode: string): Promise<unknown> {
    const method: unknown = Reflect.get(client, 'handleSocketExhaustion');
    assert.ok(typeof method === 'function', 'FetchClient exposes handleSocketExhaustion');
    const pending: unknown = Reflect.apply(method, client, [url, errorCode, 'GET', 'request-1', 1]);
    const outcome = await pending;
    return outcome;
  }

  static stubDispatcherHealth(client: FetchClient): void {
    const dispatcher: unknown = Reflect.get(client, 'dispatcher');
    assert.ok(dispatcher instanceof UndiciDispatcher, 'the client holds an UndiciDispatcher');
    Reflect.set(dispatcher, 'checkDispatcherHealth', () => {
      const health = { 'stats': { 'freeConnections': 0, 'maxConnections': 2, 'pendingRequests': 1, 'queuedRequests': 0 } };
      return health;
    });
  }

  static async wrapUndiciError(client: FetchClient, error: Error, url: string): Promise<unknown> {
    const method: unknown = Reflect.get(client, 'wrapUndiciError');
    assert.ok(typeof method === 'function', 'FetchClient exposes wrapUndiciError');
    const pending: unknown = Reflect.apply(method, client, [error, url, 'GET', 'request-1', 1]);
    const outcome = await pending;
    return outcome;
  }
}
