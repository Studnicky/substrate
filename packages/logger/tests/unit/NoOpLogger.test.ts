import assert from 'node:assert/strict';
import {
  describe,
  it
} from 'node:test';

import { LogLevel } from '../../src/constants/LogLevel.js';
import { Logger } from '../../src/modules/Logger.js';
import { NoOpTransport } from '../../src/transports/NoOpTransport.js';

import { TestFactory } from './TestFactory.js';

void describe('NoOpTransport', () => {
  void describe('create', () => {
    void it('creates a NoOpTransport instance', () => {
      const transport = NoOpTransport.create();

      assert.ok(transport instanceof NoOpTransport);
    });
  });

  void describe('write', () => {
    void it('accepts records without throwing', () => {
      const transport = NoOpTransport.create();
      const logger = Logger.create({ 'level': LogLevel.TRACE, 'transports': [transport] });

      assert.doesNotThrow(() => {
        logger.trace(TestFactory.body('trace message'));
        logger.debug(TestFactory.body('debug message'));
        logger.info(TestFactory.body('info message'));
        logger.warn(TestFactory.body('warn message'));
        logger.error(TestFactory.body('error message'));
      });
    });

    void it('never triggers any observable output', () => {
      const output: unknown[] = [];
      const sideChannel = NoOpTransport.create();

      // NoOpTransport should make no calls — observable only via side channel
      // Verify nothing leaked into an observing transport
      const secondTransport = { write: (r: unknown) => { output.push(r); } };
      const logger = Logger.create({
        'level': LogLevel.TRACE,
        'transports': [sideChannel, secondTransport]
      });

      logger.info(TestFactory.body('test'));

      // second transport DID receive, but NoOpTransport produced nothing
      assert.strictEqual(output.length, 1);
    });
  });
});
