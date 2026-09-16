import { Mutex } from '@studnicky/mutex/browser';
import {
  BrowserPersistence, JsonStateCodec, MemoryPersistence, StorageTarget, Store
} from '@studnicky/store/browser';
import { StrataStore } from '@studnicky/strata-store-kit/browser';

const NUMBER_CODEC = JsonStateCodec.create<number>({ 'decode': (value: unknown): number => {
  if (typeof value !== 'number') {
    throw new Error('Expected a number');
  }

  return value;
} });

// #region usage
const key = 'demo:layered-counter';
const mutex = Mutex.create<string>();
const cache = Store.create({ 'initialState': 0, 'key': key, 'persistence': MemoryPersistence.create<number>() });
const durable = Store.create({
  'initialState': 0,
  'key': key,
  'persistence': BrowserPersistence.create({ 'codec': NUMBER_CODEC, 'storageTarget': StorageTarget.LocalStorage })
});

await durable.setState(7);

const counter = StrataStore.create({ 'layers': [cache, durable], 'mutex': mutex, 'mutexKey': key });

counter.subscribe((snapshot): void => {
  console.log(`durable subscriber received ${snapshot}`);
});

await counter.hydrate();
await counter.update((snapshot): number => {
  const result = snapshot + 1;
  return result;
});

console.log({
  'cache': cache.getSnapshot(),
  'consumer': counter.getSnapshot(),
  'durable': durable.getSnapshot()
});

await counter.clear();
counter.dispose();
// #endregion usage
