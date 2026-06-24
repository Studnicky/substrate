/** snapshot — GPU detection and full system snapshot. Run: npx tsx examples/snapshot.ts */

import assert from 'node:assert/strict';

// #region usage
import { System } from '../src/index.js';

const VALID_COMPUTE_APIS = new Set(['cuda', 'metal', 'opencl', 'software']);

console.log('GPU:');
const gpu = System.gpu();

if (gpu === null) {
  console.log('  gpu = null (no hardware GPU detected)');
} else {
  console.log(`  gpu.name        = ${gpu.name}`);
  console.log(`  gpu.computeApi  = ${gpu.computeApi}`);
  console.log(`  gpu.vramMb      = ${gpu.vramMb ?? 'null'}`);
}

console.log('Snapshot:');
const info = System.snapshot();

console.log(`  snapshot.cpu.logicalCount  = ${info.cpu.logicalCount}`);
console.log(`  snapshot.memory.totalMb    = ${info.memory.totalMb}`);
console.log(`  snapshot.platform.os       = ${info.platform.os}`);
console.log(`  snapshot.gpu               = ${info.gpu === null ? 'null' : info.gpu.name}`);
// #endregion usage

if (gpu !== null) {
  assert.ok(typeof gpu.name === 'string' && gpu.name.length > 0, 'gpu.name must be a non-empty string');
  assert.ok(VALID_COMPUTE_APIS.has(gpu.computeApi), `gpu.computeApi must be one of ${[...VALID_COMPUTE_APIS].join(', ')}`);
  assert.ok(gpu.vramMb === null || (typeof gpu.vramMb === 'number' && gpu.vramMb >= 0), 'gpu.vramMb must be null or a non-negative number');
}

assert.ok('cpu' in info, 'snapshot must have cpu property');
assert.ok('memory' in info, 'snapshot must have memory property');
assert.ok('platform' in info, 'snapshot must have platform property');
assert.ok('gpu' in info, 'snapshot must have gpu property');
assert.ok(info.cpu.logicalCount > 0, 'snapshot.cpu.logicalCount must be > 0');
assert.ok(info.memory.totalMb > 0, 'snapshot.memory.totalMb must be > 0');

console.log('snapshot: all assertions passed');
