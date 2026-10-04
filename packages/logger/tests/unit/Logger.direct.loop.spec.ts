import { VirtualClockProvider, VirtualTimeCounter } from '@studnicky/clock/node';
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { Logger } from '../../src/modules/Logger.js';
import { MemoryTransport } from '../../src/transports/MemoryTransport.js';
import { TestFactory } from '../helpers/TestFactory.js';

void describe('Logger', () => {
  void it('timestamps records with an injected clock', () => {
    const counter = VirtualTimeCounter.create({ 'startMs': 42 });
    const transport = MemoryTransport.create();
    const logger = Logger.create({
      'clock': VirtualClockProvider.create(counter),
      'transports': [transport]
    });

    logger.info(TestFactory.body('deterministic time'));

    assert.equal(transport.records()[0]?.time, 42);
  });
});
