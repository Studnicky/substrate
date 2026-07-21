import assert from 'node:assert/strict';
import { it } from 'node:test';

import { ConfigurationError } from '@studnicky/config';
import {
  TimeUnitEntity,
  Timing,
  TimingOptionsEntity,
  TimingPrecisionEntity,
  TimingStatusEntity
} from '../../src/index.js';
import { TimingEvent } from '../../src/modules/TimingEvent.js';
import { TimingValidator } from '../../src/validation/TimingValidator.js';

void it('accepts valid maxEvents values', () => {
  const validValues = [
    1,
    10,
    1000,
    Infinity
  ];

  for (const maxEvents of validValues) {
    assert.doesNotThrow(() => {
      Timing.create({ 'maxEvents': maxEvents });
    });
  }

  // Test omitted maxEvents (defaults to no limit)
  assert.doesNotThrow(() => {
    Timing.create();
  });
});

void it('rejects invalid maxEvents values', () => {
  const invalidValues = [
    {
      description: 'non-integer',
      value: 10.5
    },
    {
      description: 'zero',
      value: 0
    },
    {
      description: 'negative',
      value: -1
    },
    {
      description: 'NaN',
      value: Number.NaN
    },
    {
      description: 'string',
      value: 'not-a-number'
    }
  ];

  for (const {
    description, value
  } of invalidValues) {
    assert.throws(
      () => {
        TimingValidator.validateMaxEvents(value);
      },
      ConfigurationError,
      `Should reject ${description}`
    );
  }
});

void it('accepts valid precision configurations', () => {
  const validConfigs = [
    {
      ms: 2,
      s: 4
    },
    {}
  ];

  for (const precision of validConfigs) {
    assert.doesNotThrow(() => {
      Timing.create({ 'precision': precision });
    });
  }

  // Test omitted precision (defaults to standard precision)
  assert.doesNotThrow(() => {
    Timing.create();
  });
});

void it('rejects non-object precision', () => {
  assert.throws(() => {
    TimingValidator.validatePrecision('not-an-object');
  }, ConfigurationError);
});

void it('rejects invalid precision values', () => {
  const invalidPrecisions = [
    {
      description: 'string',
      value: 'not-a-number'
    },
    {
      description: 'float',
      value: 2.5
    },
    {
      description: 'negative',
      value: -1
    },
    {
      description: 'too large (>20)',
      value: 21
    }
  ];

  for (const {
    description, value
  } of invalidPrecisions) {
    assert.throws(
      () => {
        TimingValidator.validatePrecision({ 'ms': value });
      },
      ConfigurationError,
      `Should reject ${description}`
    );
  }
});

void it('rejects invalid time units in precision', () => {
  assert.throws(() => {
    TimingValidator.validatePrecision({ 'invalid': 2 });
  }, ConfigurationError);
});

void it('validates canonical timing entity values', () => {
  assert.equal(TimeUnitEntity.validate('ms'), true);
  assert.equal(TimeUnitEntity.validate('days'), false);
  assert.equal(TimingStatusEntity.validate('complete'), true);
  assert.equal(TimingStatusEntity.validate('unknown'), false);
  assert.equal(TimingPrecisionEntity.validate({ 'ms': 3, 's': 6 }), true);
  assert.equal(TimingPrecisionEntity.validate({ 'invalid': 3 }), false);
  assert.equal(TimingOptionsEntity.validate({ 'maxEvents': 10, 'precision': { 'ms': 3 } }), true);
});

void it('applies precision with custom configuration', () => {
  const timer = Timing.create({ 'precision': { ms: 1 } });

  timer.event(TimingEvent.create({ 'component': 'GraphAdapter', 'operation': 'query' }));
  const events = timer.getEvents();

  assert.ok(events.initialize !== undefined);

  const valueStr = events.initialize.toString();
  const decimalPart = valueStr.split('.')[1];

  if (decimalPart !== undefined) {
    assert.ok(decimalPart.length <= 1, `Expected at most 1 decimal place, got ${decimalPart.length}`);
  }
});

void it('accepts valid configuration with all options', () => {
  assert.doesNotThrow(() => {
    Timing.create({ 'maxEvents': 100, 'precision': { ms: 2 } });
  });
});

void it('applies defaults when options not provided', () => {
  const timer = Timing.create();
  const events = timer.getEvents();

  assert.ok(events.initialize !== undefined);
});
