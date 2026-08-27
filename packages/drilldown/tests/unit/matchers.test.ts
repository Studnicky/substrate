import assert from 'node:assert/strict';
import { it } from 'node:test';

import type { MatchContextInterface, PartitionGroupInterface } from '../../src/index.js';

import { matcherRegistry } from '../../src/modules/matchers/index.js';

function emptyGroup(): PartitionGroupInterface {
  return { 'groupValue': { 'match': 'placeholder', 'type': 'string' }, 'nodes': [], 'nodeValue': null };
}

const numericContext: MatchContextInterface = {
  'toDateTimestamp': () => { return null; },
  'toStrictNumber': (value) => { const result = typeof value === 'number' ? value : null;
  return result; }
};

const dateContext: MatchContextInterface = {
  'toDateTimestamp': (value) => { const result = typeof value === 'number' ? value : null;
  return result; },
  'toStrictNumber': () => { return null; }
};

it('alphabetic matcher matches case-insensitive lexicographic ranges', () => {
  const handler = matcherRegistry.byType['alphabetic'];
  const matcher = { 'end': 'mango', 'group': emptyGroup(), 'start': 'apple' };

  assert.equal(handler.match(matcher, undefined, 'banana', numericContext), true);
  assert.equal(handler.match(matcher, undefined, 'Kiwi', numericContext), true);
  assert.equal(handler.match(matcher, undefined, 'zebra', numericContext), false);
  assert.equal(handler.match(matcher, undefined, 'aardvark', numericContext), false);
});

it('range matcher matches an inclusive-minimum, exclusive-maximum numeric window', () => {
  const handler = matcherRegistry.byType['range'];
  const matcher = { 'group': emptyGroup(), 'maximum': 20, 'minimum': 10 };

  assert.equal(handler.match(matcher, 10, '10', numericContext), true);
  assert.equal(handler.match(matcher, 15, '15', numericContext), true);
  assert.equal(handler.match(matcher, 20, '20', numericContext), false);
  assert.equal(handler.match(matcher, 25, '25', numericContext), false);
});

it('date matcher matches an inclusive-after, exclusive-before epoch-ms window', () => {
  const handler = matcherRegistry.byType['date'];
  const after = Date.UTC(2024, 0, 1);
  const before = Date.UTC(2024, 1, 1);
  const matcher = { 'afterTs': after, 'beforeTs': before, 'group': emptyGroup() };

  assert.equal(handler.match(matcher, after, '', dateContext), true);
  assert.equal(handler.match(matcher, Date.UTC(2024, 0, 15), '', dateContext), true);
  assert.equal(handler.match(matcher, before, '', dateContext), false);
  assert.equal(handler.match(matcher, Date.UTC(2023, 11, 31), '', dateContext), false);
});

it('semver matcher matches caret-range satisfaction', () => {
  const handler = matcherRegistry.byType['semver'];
  const matcher = { 'group': emptyGroup(), 'range': '^1.2.0' };

  assert.equal(handler.match(matcher, undefined, '1.2.0', numericContext), true);
  assert.equal(handler.match(matcher, undefined, '1.9.9', numericContext), true);
  assert.equal(handler.match(matcher, undefined, '1.1.0', numericContext), false);
  assert.equal(handler.match(matcher, undefined, '2.0.0', numericContext), false);
});

it('cidr matcher matches IPv4 addresses within the subnet', () => {
  const handler = matcherRegistry.byType['cidr'];
  const created = handler.createMatcher({ 'cidr': '10.0.0.0/24', 'type': 'cidr' }, emptyGroup());
  assert.ok(created !== null);

  assert.equal(handler.match(created, undefined, '10.0.0.5', numericContext), true);
  assert.equal(handler.match(created, undefined, '10.0.1.5', numericContext), false);
});

it('sequential matcher matches numbers within a shared prefix/suffix window', () => {
  const handler = matcherRegistry.byType['sequential'];
  const matcher = { 'group': emptyGroup(), 'maximum': 10, 'minimum': 1, 'prefix': 'server-', 'suffix': '' };

  assert.equal(handler.match(matcher, undefined, 'server-5', numericContext), true);
  assert.equal(handler.match(matcher, undefined, 'server-10', numericContext), true);
  assert.equal(handler.match(matcher, undefined, 'server-11', numericContext), false);
  assert.equal(handler.match(matcher, undefined, 'other-5', numericContext), false);
});
