/** layered-browser-store — keep a Northstar Books cart in memory and durable browser checkout storage. */

import { Mutex } from '@studnicky/concurrency/mutex';
import {
  BrowserPersistence, JsonStateCodec, MemoryPersistence, StorageTarget, Store
} from '@studnicky/store/browser';
import { StrataStore } from '@studnicky/store/strata/browser';

const NUMBER_CODEC = JsonStateCodec.create<number>({ 'decode': (value: unknown): number => {
  if (typeof value !== 'number') {
    throw new Error('Expected a number');
  }

  return value;
} });

// #region usage
const key = 'northstar:checkout:cart-1042';
const mutex = Mutex.create<string>();
const cache = Store.create({ 'initialState': 0, 'key': key, 'persistence': MemoryPersistence.create<number>() });
const durable = Store.create({
  'initialState': 0,
  'key': key,
  'persistence': BrowserPersistence.create({ 'codec': NUMBER_CODEC, 'storageTarget': StorageTarget.LocalStorage })
});

await durable.setState(3);

const cartQuantity = StrataStore.create({ 'layers': [cache, durable], 'mutex': mutex, 'mutexKey': key });

cartQuantity.subscribe((snapshot): void => {
  console.log(`durable subscriber received ${snapshot}`);
});

await cartQuantity.hydrate();
await cartQuantity.update((snapshot): number => {
  const result = snapshot + 1;
  return result;
});

console.log({
  'cache': cache.getSnapshot(),
  'checkoutCartQuantity': cartQuantity.getSnapshot(),
  'durable': durable.getSnapshot()
});

await cartQuantity.clear();
cartQuantity.dispose();
// #endregion usage
