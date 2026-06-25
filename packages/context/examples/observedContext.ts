/** observedContext — full lifecycle trace via hook overrides. Run: npx tsx examples/observedContext.ts */

import assert from 'node:assert/strict';
import { AsyncLocalStorage } from 'node:async_hooks';

// #region usage
import type { ContextScopeOptionsInterface } from '../src/index.js';

import { Context, ContextScope } from '../src/index.js';

// --- Context subclass: traces get/set/delete/initialize/missingContext ---

class ObservedContext extends Context {
  readonly setEvents: { 'key': string; 'value': unknown }[] = [];
  readonly getEvents: { 'key': string; 'value': unknown }[] = [];
  readonly deleteEvents: { 'existed': boolean; 'key': string }[] = [];
  readonly initializeEvents: string[] = [];
  readonly missingContextEvents: string[] = [];

  protected override onInitialize(
    _initial: Record<string, unknown> | undefined,
    _scope: ContextScope
  ): void {
    console.log('[context] onInitialize');
    this.initializeEvents.push('initialize');
  }

  protected override onSet(key: string, value: unknown): void {
    console.log(`[context] onSet key=${key} value=${String(value)}`);
    this.setEvents.push({ 'key': key, 'value': value });
  }

  protected override onGet(key: string, value: unknown): void {
    console.log(`[context] onGet key=${key} value=${String(value)}`);
    this.getEvents.push({ 'key': key, 'value': value });
  }

  protected override onDelete(key: string, existed: boolean): void {
    console.log(`[context] onDelete key=${key} existed=${String(existed)}`);
    this.deleteEvents.push({ 'existed': existed, 'key': key });
  }

  protected override onMissingContext(_key?: string): boolean {
    console.log('[context] onMissingContext');
    this.missingContextEvents.push('missing');
    return false;
  }
}

// --- ContextScope subclass: traces all FSM/execute/terminate hooks ---
//
// NOTE: ContextScope's base constructor fires onExit/onEnter (created → active) via
// transition(). Class field initializers run AFTER super() returns, so they would
// overwrite any arrays stored in the constructor body before super(). We work around
// this by storing events in a WeakMap keyed on `this`, which is accessible as soon
// as `this` exists (inside the hooks, which run during super()).

const scopeEvents = new WeakMap<ObservedScope, {
  'afterExecuteCount': number[];
  'beforeExecuteCount': number[];
  'disposeEvents': string[];
  'enterEvents': { 'from': string; 'to': string }[];
  'errorEvents': unknown[];
  'exitEvents': { 'from': string; 'to': string }[];
  'terminatedAccessCount': number[];
  'terminateSnapshots': Record<string, unknown>[];
}>();

class ObservedScope extends ContextScope {
  static override create(options: ContextScopeOptionsInterface): ObservedScope {
    return new ObservedScope(options);
  }

  protected constructor(options: ContextScopeOptionsInterface) {
    // Seed the WeakMap entry BEFORE super() so hooks can write to it immediately
    const pending = {
      'afterExecuteCount': [] as number[],
      'beforeExecuteCount': [] as number[],
      'disposeEvents': [] as string[],
      'enterEvents': [] as { 'from': string; 'to': string }[],
      'errorEvents': [] as unknown[],
      'exitEvents': [] as { 'from': string; 'to': string }[],
      'terminatedAccessCount': [] as number[],
      'terminateSnapshots': [] as Record<string, unknown>[]
    };
    // `this` is not yet available before super(), but we can use a temporary key
    // via a module-level slot that the hooks pick up:
    ObservedScope._pending = pending;
    super(options);
    // After super(), `this` is available — move from slot to WeakMap
    scopeEvents.set(this, ObservedScope._pending);
    ObservedScope._pending = undefined;
  }

  // Module-level slot bridging pre-super() → post-super()
  private static _pending: ReturnType<typeof scopeEvents.get> | undefined;

  private get _e(): NonNullable<ReturnType<typeof scopeEvents.get>> {
    // During super() hooks, WeakMap entry not yet set — read from slot
    return scopeEvents.get(this) ?? ObservedScope._pending!;
  }

  get exitEvents(): { 'from': string; 'to': string }[] { return this._e.exitEvents; }
  get enterEvents(): { 'from': string; 'to': string }[] { return this._e.enterEvents; }
  get beforeExecuteCount(): number[] { return this._e.beforeExecuteCount; }
  get afterExecuteCount(): number[] { return this._e.afterExecuteCount; }
  get errorEvents(): unknown[] { return this._e.errorEvents; }
  get disposeEvents(): string[] { return this._e.disposeEvents; }
  get terminateSnapshots(): Record<string, unknown>[] { return this._e.terminateSnapshots; }
  get terminatedAccessCount(): number[] { return this._e.terminatedAccessCount; }

  protected override onExit(from: string, to: string): void {
    console.log(`[scope] onExit from=${from} to=${to}`);
    this._e.exitEvents.push({ 'from': from, 'to': to });
  }

  protected override onEnter(to: string, from: string): void {
    console.log(`[scope] onEnter state=${to} from=${from}`);
    this._e.enterEvents.push({ 'from': from, 'to': to });
  }

  protected override onBeforeExecute(): void {
    console.log('[scope] onBeforeExecute');
    this._e.beforeExecuteCount.push(1);
  }

  protected override onAfterExecute(): void {
    console.log('[scope] onAfterExecute');
    this._e.afterExecuteCount.push(1);
  }

  protected override onError(error: unknown): void {
    console.log(`[scope] onError error=${String(error)}`);
    this._e.errorEvents.push(error);
  }

  protected override onDispose(): void {
    console.log('[scope] onDispose');
    this._e.disposeEvents.push('dispose');
  }

  protected override onTerminate(snapshot: Record<string, unknown>): Record<string, unknown> {
    console.log(`[scope] onTerminate keys=${Object.keys(snapshot).sort().join(',')}`);
    this._e.terminateSnapshots.push(snapshot);
    return { ...snapshot, '_observedAt': Date.now() };
  }

  protected override onTerminatedAccess(): void {
    console.log('[scope] onTerminatedAccess');
    this._e.terminatedAccessCount.push(1);
  }
}

// ── Demonstration 1: ObservedContext hooks ──────────────────────────────────

console.log('\n=== ObservedContext demo ===');

// Context.create returns `Context` statically; cast to ObservedContext to access hooks.
const context = ObservedContext.create({ 'name': 'request' }) as ObservedContext;
const scope = context.initialize({ 'requestId': 'req-001' });

scope.execute(() => {
  context.set('userId', 'u-42');
  context.set('tempKey', 'will-be-deleted');
  context.get<string>('requestId');
  context.get<string>('userId');
  context.delete('tempKey');
  context.delete('nonexistent');
});

const snapshot1 = scope.terminate();
console.log('Final snapshot keys:', Object.keys(snapshot1).sort());

// ── Demonstration 2: ObservedScope hooks ───────────────────────────────────

console.log('\n=== ObservedScope demo ===');

const als = new AsyncLocalStorage<Map<string, unknown>>();
const observedScope = ObservedScope.create({
  'initial': { 'requestId': 'req-002' },
  'name': 'request',
  'storage': als
});

// Clean execute
observedScope.execute(() => { const result = 'clean run';
  return result; });

// Throwing execute — onError fires, scope stays usable
try {
  observedScope.execute(() => { throw new Error('simulated failure'); });
} catch {
  // Expected
}

// Another clean execute after the error
observedScope.execute(() => { const result = 'recovered';
  return result; });

// Terminate — triggers onDispose then onTerminate
const snapshot2 = observedScope.terminate();
console.log('Final snapshot keys:', Object.keys(snapshot2).sort());
// #endregion usage

// ── Assertions ─────────────────────────────────────────────────────────────

// ObservedContext assertions
assert.equal(context.initializeEvents.length, 1, 'onInitialize fired once');
assert.ok(context.setEvents.some((e) => { return e.key === 'requestId' || e.key === 'userId' || e.key === 'tempKey'; }), 'onSet fired for set keys');
assert.ok(context.setEvents.some((e) => { return e.key === 'userId'; }), 'onSet includes userId');
assert.ok(context.getEvents.some((e) => { return e.key === 'requestId'; }), 'onGet includes requestId');
assert.ok(context.deleteEvents.some((e) => { return e.key === 'tempKey' && e.existed === true; }), 'onDelete: tempKey existed');
assert.ok(context.deleteEvents.some((e) => { return e.key === 'nonexistent' && e.existed === false; }), 'onDelete: nonexistent did not exist');
assert.ok(!('tempKey' in snapshot1), 'tempKey removed from snapshot');
assert.equal(snapshot1.requestId, 'req-001', 'requestId preserved in snapshot');

// ObservedScope assertions
assert.ok(
  (observedScope.exitEvents ?? []).some((e) => { return e.from === 'active' && e.to === 'terminated'; }),
  'onExit fired for active→terminated'
);
assert.ok(
  (observedScope.enterEvents ?? []).some((e) => { return e.to === 'active' && e.from === 'created'; }),
  'onEnter fired for created→active'
);
assert.equal((observedScope.errorEvents ?? []).length, 1, 'onError fired once');
assert.ok((observedScope.errorEvents ?? [])[0] instanceof Error, 'onError received an Error');
assert.equal((observedScope.disposeEvents ?? []).length, 1, 'onDispose fired once');
assert.equal((observedScope.terminateSnapshots ?? []).length, 1, 'onTerminate fired once');
assert.ok('_observedAt' in snapshot2, 'onTerminate augmented snapshot with _observedAt');
assert.equal(snapshot2.requestId, 'req-002', 'requestId in final snapshot');

// onAfterExecute fired for the two clean executes (not for the throwing one)
assert.equal((observedScope.afterExecuteCount ?? []).length, 2, 'onAfterExecute did not fire on error path');
assert.equal((observedScope.beforeExecuteCount ?? []).length, 3, 'onBeforeExecute fired for all 3 executes');

console.log('\nobservedContext: all assertions passed');
