/** cpuMemoryPlatform — CPU topology, memory, and platform accessors. Run: npx tsx examples/cpuMemoryPlatform.ts */

import assert from 'node:assert/strict';

// #region usage
import { System } from '../src/index.js';

const cpu = System.cpu;
console.log('CPU:');
console.log(`  cpu.arch          = ${cpu.arch}`);
console.log(`  cpu.model         = ${cpu.model}`);
console.log(`  cpu.logicalCount  = ${cpu.logicalCount}`);
console.log(`  cpu.physicalCount = ${cpu.physicalCount}`);

console.log(`Optimal worker count = ${System.optimalWorkerCount}`);

const mem = System.memory;
console.log('Memory:');
console.log(`  memory.totalMb = ${mem.totalMb}`);
console.log(`  memory.freeMb  = ${mem.freeMb}`);

const plat = System.platform;
console.log('Platform:');
console.log(`  platform.os             = ${plat.os}`);
console.log(`  platform.nodeVersion    = ${plat.nodeVersion}`);
console.log(`  platform.isAppleSilicon = ${plat.isAppleSilicon}`);
// #endregion usage

assert.ok(Number.isInteger(cpu.logicalCount) && cpu.logicalCount > 0, 'logicalCount must be a positive integer');
assert.ok(Number.isInteger(cpu.physicalCount) && cpu.physicalCount > 0, 'physicalCount must be a positive integer');
assert.ok(cpu.physicalCount <= cpu.logicalCount, 'physicalCount must be <= logicalCount');
assert.ok(typeof cpu.arch === 'string' && cpu.arch.length > 0, 'arch must be a non-empty string');
assert.ok(typeof cpu.model === 'string' && cpu.model.length > 0, 'model must be a non-empty string');
assert.ok(System.optimalWorkerCount >= 1, 'optimalWorkerCount must be >= 1');
assert.ok(System.optimalWorkerCount <= cpu.logicalCount, 'optimalWorkerCount must be <= cpu.logicalCount');
assert.ok(mem.totalMb > 0, 'totalMb must be > 0');
assert.ok(mem.freeMb >= 0, 'freeMb must be >= 0');
assert.ok(mem.freeMb <= mem.totalMb, 'freeMb must be <= totalMb');
assert.ok(typeof plat.os === 'string' && plat.os.length > 0, 'os must be a non-empty string');
assert.ok(plat.nodeVersion.startsWith('v'), 'nodeVersion must start with "v"');
assert.equal(typeof plat.isAppleSilicon, 'boolean', 'platform.isAppleSilicon must be boolean');

console.log('cpuMemoryPlatform: all assertions passed');
