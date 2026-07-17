/**
 * LockPathHelpers Unit Tests
 *
 * Verifies dirname()/basename() semantics match node:path for the cases
 * FileLock#anyLockExists relies on: bare relative filenames, relative paths
 * with a directory component, and absolute paths.
 */

import { strictEqual } from 'node:assert/strict';
import { it } from 'node:test';

import { LockPathHelpers } from '../../src/LockPathHelpers.js';

it('dirname() returns "." for a bare relative filename', () => {
  strictEqual(LockPathHelpers.dirname('queue.json'), '.');
});

it('dirname() returns the parent for a relative path with a directory component', () => {
  strictEqual(LockPathHelpers.dirname('data/queue.json'), 'data');
});

it('dirname() returns "/" for an absolute path with a single segment', () => {
  strictEqual(LockPathHelpers.dirname('/queue.json'), '/');
});

it('dirname() returns the parent for an absolute path with multiple segments', () => {
  strictEqual(LockPathHelpers.dirname('/data/queue.json'), '/data');
});

it('basename() returns the full string for a bare relative filename', () => {
  strictEqual(LockPathHelpers.basename('queue.json'), 'queue.json');
});

it('basename() returns the last segment for a nested path', () => {
  strictEqual(LockPathHelpers.basename('/data/queue.json'), 'queue.json');
});
