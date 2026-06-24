/** basicUsage — push items into a buffer, observe auto-grow, drain in FIFO order. Run: npx tsx examples/basicUsage.ts */

import assert from 'node:assert/strict';

// #region usage
import { CircularBuffer } from '../src/index.js';

const buf = new CircularBuffer<number>(3);

buf.push(1);
buf.push(2);
buf.push(3);
buf.push(4); // capacity doubles to 6; all items retained

console.log(`length after 4 pushes: ${buf.length}`);
console.log(`shift: ${buf.shift()}`);
console.log(`shift: ${buf.shift()}`);
console.log(`shift: ${buf.shift()}`);
console.log(`shift: ${buf.shift()}`);
console.log(`length after drain: ${buf.length}`);
// #endregion usage

assert.equal(buf.length, 0, 'length should be 0 after draining');

console.log('basicUsage: all assertions passed');
