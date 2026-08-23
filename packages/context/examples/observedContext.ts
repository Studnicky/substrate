/** observedContext — trace Context lifecycle hooks while scopes remain factory-owned. Run: npx tsx examples/observedContext.ts */

import assert from 'node:assert/strict';

// #region usage
import type { ContextScopeInterface } from '../src/interfaces/index.js';

import { Context } from '../src/index.js';

class ObservedContext extends Context {
  readonly deleteEvents: { 'existed': boolean; 'key': string }[] = [];
  readonly getEvents: { 'key': string; 'value': unknown }[] = [];
  readonly initializeEvents: string[] = [];
  readonly missingContextEvents: string[] = [];
  readonly setEvents: { 'key': string; 'value': unknown }[] = [];

  protected override onDelete(key: string, existed: boolean): void {
    console.log(`[context] onDelete key=${key} existed=${String(existed)}`);
    this.deleteEvents.push({ 'existed': existed, 'key': key });
  }

  protected override onGet(key: string, value: unknown): void {
    console.log(`[context] onGet key=${key} value=${String(value)}`);
    this.getEvents.push({ 'key': key, 'value': value });
  }

  protected override onInitialize(
    _initial: Record<string, unknown> | undefined,
    _scope: ContextScopeInterface
  ): void {
    console.log('[context] onInitialize');
    this.initializeEvents.push('initialize');
  }

  protected override onMissingContext(_key?: string): boolean {
    console.log('[context] onMissingContext');
    this.missingContextEvents.push('missing');
    return false;
  }

  protected override onSet(key: string, value: unknown): void {
    console.log(`[context] onSet key=${key} value=${String(value)}`);
    this.setEvents.push({ 'key': key, 'value': value });
  }
}

const context = ObservedContext.create({ 'name': 'request' });
const scope = context.initialize({ 'requestId': 'req-001' });

scope.execute(() => {
  context.set('userId', 'u-42');
  context.set('tempKey', 'will-be-deleted');
  context.get('requestId');
  context.get('userId');
  context.delete('tempKey');
  context.delete('nonexistent');
});

const snapshot = scope.terminate();
console.log('Final snapshot keys:', Object.keys(snapshot).sort());
// #endregion usage

assert.equal(context.initializeEvents.length, 1, 'onInitialize fired once');
assert.ok(context.setEvents.some((event) => { const result = event.key === 'userId'; return result; }));
assert.ok(context.getEvents.some((event) => { const result = event.key === 'requestId'; return result; }));
assert.ok(context.deleteEvents.some((event) => {
  const result = event.key === 'tempKey' && event.existed;
  return result;
}));
assert.ok(context.deleteEvents.some((event) => {
  const result = event.key === 'nonexistent' && !event.existed;
  return result;
}));
assert.ok(!('tempKey' in snapshot));
assert.equal(snapshot.requestId, 'req-001');

console.log('observedContext: all assertions passed');
