import {
  MemoryPersistence, Store
} from '../src/index.js';

// #region usage
const persistence = MemoryPersistence.create<number>();
const store = Store.create({ 'initialState': 0, 'key': 'demo:memory-counter', 'persistence': persistence });

store.subscribe((snapshot): void => {
  console.log(`subscriber received ${snapshot}`);
});

await store.update((snapshot): number => {
  const result = snapshot + 1;
  return result;
});

const hydrated = Store.create({ 'initialState': 0, 'key': 'demo:memory-counter', 'persistence': persistence });

await hydrated.hydrate();

console.log({
  'hydrated': hydrated.getSnapshot(),
  'snapshot': store.getSnapshot()
});
// #endregion usage
