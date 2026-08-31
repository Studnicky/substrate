import {
  BrowserPersistence, StorageTarget
} from '../src/browser/index.js';
import {
  JsonStateCodec, Store
} from '../src/index.js';

const NUMBER_CODEC = JsonStateCodec.create<number>({ 'decode': (value: unknown): number => {
  if (typeof value !== 'number') {
    throw new Error('Expected a number');
  }

  return value;
} });

const TARGETS: StorageTarget[] = [
  StorageTarget.Memory,
  StorageTarget.LocalStorage,
  StorageTarget.SessionStorage,
  StorageTarget.IndexedDb
];

// #region usage
const count = TARGETS.length;

for (let index = 0; index < count; index += 1) {
  const target = TARGETS[index];

  if (target === undefined) {
    throw new Error('Missing browser storage target');
  }

  const key = `demo:browser-target:${target}`;
  const persistence = BrowserPersistence.create({ 'codec': NUMBER_CODEC, 'storageTarget': target });
  const store = Store.create({ 'initialState': 0, 'key': key, 'persistence': persistence });

  await store.setState(index + 1);

  const hydrated = Store.create({ 'initialState': 0, 'key': key, 'persistence': persistence });

  await hydrated.hydrate();

  console.log(`${target}: ${hydrated.getSnapshot()}`);
  await hydrated.clear();
}
// #endregion usage
