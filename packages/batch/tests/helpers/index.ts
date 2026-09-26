import { deepStrictEqual, rejects, strictEqual } from 'node:assert/strict';

import { BatchCollector } from './BatchCollector.js';
import { Delay } from './Delay.js';

function collectBatches<T>(generator: AsyncGenerator<T[], void, unknown>): Promise<T[]> {
  return BatchCollector.collect(generator);
}
const delay = Delay.ms.bind(Delay);

export { BatchCollector, collectBatches, deepStrictEqual, Delay, delay, rejects, strictEqual };
