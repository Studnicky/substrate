/** 05-event-recorder — EventRecorder collapses push-to-array + console.log into one call. Run: npx tsx packages/errors/examples/05-event-recorder.ts */

import assert from 'node:assert/strict';

// #region usage
// Published as a subpath export: import { EventRecorder } from '@studnicky/errors/observers';
import { EventRecorder } from '../src/observers/index.js';

// json-schema-uninexpressible: minimal demo-only event type for a runnable doc example, not a shipped domain shape
type CacheEventType = { 'event': 'hit' | 'miss'; 'key': string };

class TracingCache {
  readonly #store = new Map<string, number>();
  readonly #recorder = new EventRecorder<CacheEventType>();

  get events(): CacheEventType[] { return this.#recorder.events; }

  protected onAccess(key: string, hit: boolean): void {
    const event: CacheEventType = { 'event': hit ? 'hit' : 'miss', 'key': key };
    this.#recorder.record(event, `[cache] ${event.event} key=${key}`);
  }

  set(key: string, value: number): void {
    this.#store.set(key, value);
  }

  get(key: string): number | undefined {
    const value = this.#store.get(key);
    this.onAccess(key, value !== undefined);
    return value;
  }
}

const cache = new TracingCache();
cache.set('a', 1);
cache.get('a'); // onAccess(a, true)
cache.get('b'); // onAccess(b, false)
// #endregion usage

assert.deepEqual(cache.events, [
  { 'event': 'hit', 'key': 'a' },
  { 'event': 'miss', 'key': 'b' }
]);

console.log('05-event-recorder: all assertions passed');
