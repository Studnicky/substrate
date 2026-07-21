import assert from 'node:assert/strict';
import { it } from 'node:test';

import { TIMING_STATUS } from '../../src/constants/index.js';
import { TimingEvent } from '../../src/modules/TimingEvent.js';

void it('returns event data with component.operation format', () => {
  const data = TimingEvent.create({
    'component': 'GraphAdapter',
    'operation': 'query'
  });

  assert.deepEqual(data, { 'event': 'GraphAdapter.query' });
});

void it('includes an optional status in the event name', () => {
  const data = TimingEvent.create({
    'component': 'DatabaseAdapter',
    'operation': 'connect',
    'status': TIMING_STATUS.START
  });

  assert.deepEqual(data, { 'event': 'DatabaseAdapter.connect.start' });
});

void it('works with domain-specific status constants', () => {
  const data = TimingEvent.create({
    'component': 'CacheService',
    'operation': 'get',
    'status': TIMING_STATUS.HIT
  });

  assert.equal(data.event, 'CacheService.get.hit');
});

void it('returns immutable event data', () => {
  const data = TimingEvent.create({
    'component': 'GraphAdapter',
    'operation': 'query'
  });

  assert.ok(Object.isFrozen(data));
});

void it('creates independent event values from independent configurations', () => {
  const query = TimingEvent.create({
    'component': 'GraphAdapter',
    'operation': 'query'
  });
  const insert = TimingEvent.create({
    'component': 'GraphAdapter',
    'operation': 'insert'
  });

  assert.equal(query.event, 'GraphAdapter.query');
  assert.equal(insert.event, 'GraphAdapter.insert');
});
