import { Mutex } from '@studnicky/mutex/node';
import { MemoryPersistence, Store } from '@studnicky/store/node';

// #region usage
const persistence = MemoryPersistence.create<number>();
const mutex = Mutex.create<string>();
const store = Store.create({ 'initialState': 0, 'key': 'demo:memory-counter', 'mutex': mutex, 'persistence': persistence });

store.subscribe((snapshot): void => {
  console.log(`subscriber received ${snapshot}`);
});

await store.update((snapshot): number => {
  const result = snapshot + 1;
  return result;
});

const hydrated = Store.create({ 'initialState': 0, 'key': 'demo:memory-counter', 'mutex': mutex, 'persistence': persistence });

await hydrated.hydrate();

console.log({
  'hydrated': hydrated.getSnapshot(),
  'snapshot': store.getSnapshot()
});
// #endregion usage
