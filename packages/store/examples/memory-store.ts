/** memory-store — keep a Northstar Books cart coherent across checkout handlers. Run: npx tsx examples/memory-store.ts */

import { Mutex } from '@studnicky/concurrency/mutex';
import { MemoryPersistence, Store } from '@studnicky/store/node';

// #region usage
const persistence = MemoryPersistence.create<readonly string[]>();
const mutex = Mutex.create<string>();
const store = Store.create({ 'initialState': [], 'key': 'northstar:cart:customer-42', 'mutex': mutex, 'persistence': persistence });

store.subscribe((snapshot): void => {
  console.log(`subscriber received ${snapshot}`);
});

await store.update((snapshot): readonly string[] => {
  const result = [...snapshot, '978-0-14-118776-1'];
  return result;
});

const hydrated = Store.create({ 'initialState': [], 'key': 'northstar:cart:customer-42', 'mutex': mutex, 'persistence': persistence });

await hydrated.hydrate();

console.log({
  'activeCart': store.getSnapshot(),
  'hydratedCart': hydrated.getSnapshot()
});
// #endregion usage
