/** basicVirtualFs — seed, write, read, rename, readdir, and stat. Run: npx tsx examples/basicVirtualFs.ts */

import assert from 'node:assert/strict';

// #region usage
import { VirtualFileSystem } from '../src/index.js';

const vfs = VirtualFileSystem.create({
  'seed': new Map([['/data/hello.txt', 'Hello, virtual world!']])
});

// Ensure /data directory entry exists for readdirSync
vfs.mkdirSync('/data', { 'recursive': true });

// Write a second file
vfs.writeFileSync('/data/config.json', '{"version":1}', 'utf8');

// Read both files
const hello = vfs.readFileSync('/data/hello.txt', 'utf8');
console.log(`hello.txt: ${hello}`);

const config = vfs.readFileSync('/data/config.json', 'utf8');
console.log(`config.json: ${config}`);

// Rename config.json → settings.json
vfs.renameSync('/data/config.json', '/data/settings.json');
console.log('renamed config.json → settings.json');

// List directory
const entries = vfs.readdirSync('/data');
console.log(`/data entries: ${entries.join(', ')}`);

// Stat the renamed file
const stat = vfs.statSync('/data/settings.json');
console.log(`settings.json isFile=${String(stat.isFile())} isDirectory=${String(stat.isDirectory())} mtimeMs=${stat.mtimeMs}`);
// #endregion usage

// Assertions
assert.equal(hello, 'Hello, virtual world!');
assert.equal(config, '{"version":1}');
assert.ok(!vfs.existsSync('/data/config.json'), 'config.json should not exist after rename');
assert.ok(vfs.existsSync('/data/settings.json'), 'settings.json should exist after rename');
assert.ok(entries.includes('hello.txt'), 'hello.txt should appear in readdirSync');
assert.ok(entries.includes('settings.json'), 'settings.json should appear in readdirSync');
assert.ok(stat.isFile(), 'stat should indicate a file');
assert.ok(!stat.isDirectory(), 'stat should not indicate a directory');

console.log('basicVirtualFs: all assertions passed');
