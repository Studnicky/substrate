/** observedEntityStore — override onUpsert, onRemove, and onReplaceAll to collect telemetry. Run: npx tsx examples/observedEntityStore.ts */

import assert from 'node:assert/strict';

import type { TaskEntity } from './entities/TaskEntity.js';

// #region usage
import { EntityStore } from '../src/index.js';

class TaskSelector {
  static selectId(task: TaskEntity.Type): string {
    const { id } = task;
    return id;
  }
}

class TelemetryStore extends EntityStore<TaskEntity.Type> {
  readonly upsertEvents: { 'id': string; 'title': string }[] = [];
  readonly removeEvents: { 'id': string }[] = [];
  readonly replaceAllEvents: { 'count': number }[] = [];

  static tracked(): TelemetryStore {
    return new TelemetryStore({ 'selectId': TaskSelector.selectId });
  }

  protected override onUpsert(id: string, entity: TaskEntity.Type): void {
    console.log(`[entity-store] upsert id=${id} title=${entity.title}`);
    this.upsertEvents.push({ 'id': id, 'title': entity.title });
  }

  protected override onRemove(id: string): void {
    console.log(`[entity-store] remove id=${id}`);
    this.removeEvents.push({ 'id': id });
  }

  protected override onReplaceAll(count: number): void {
    console.log(`[entity-store] replaceAll count=${count}`);
    this.replaceAllEvents.push({ 'count': count });
  }
}

const store = TelemetryStore.tracked();

store.upsertOne({ 'id': 'task-1', 'title': 'Write proposal' });
store.upsertMany([
  { 'id': 'task-2', 'title': 'Review PR' },
  { 'id': 'task-3', 'title': 'Ship release' }
]);
store.removeOne('task-2');
store.removeOne('missing'); // no-op — does not fire onRemove
store.setAll([
  { 'id': 'task-4', 'title': 'Deploy' },
  { 'id': 'task-5', 'title': 'Announce' }
]);

console.log('All entities:', store.getAll());
console.log('Upsert events:', store.upsertEvents);
console.log('Remove events:', store.removeEvents);
console.log('ReplaceAll events:', store.replaceAllEvents);
// #endregion usage

assert.equal(store.size, 2);
assert.deepEqual(store.getIds(), ['task-4', 'task-5']);

assert.equal(store.upsertEvents.length, 3);
assert.equal(store.removeEvents.length, 1);
assert.deepEqual(store.removeEvents[0], { 'id': 'task-2' });

assert.equal(store.replaceAllEvents.length, 1);
assert.deepEqual(store.replaceAllEvents[0], { 'count': 2 });

console.log('observedEntityStore: all assertions passed');
