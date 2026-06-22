import { deepStrictEqual, rejects, strictEqual } from 'node:assert/strict';

import { BatchCollector } from './BatchCollector.js';
import { Delay } from './Delay.js';

const collectBatches = BatchCollector.collect.bind(BatchCollector) as typeof BatchCollector.collect;
const delay = Delay.ms.bind(Delay) as typeof Delay.ms;

export { BatchCollector, collectBatches, deepStrictEqual, Delay, delay, rejects, strictEqual };
