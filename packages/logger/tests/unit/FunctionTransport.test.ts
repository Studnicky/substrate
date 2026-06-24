import assert from 'node:assert/strict';
import {
  describe,
  it
} from 'node:test';

import { LogLevel } from '../../src/constants/LogLevel.js';
import { ConfigurationError } from '../../src/errors/ConfigurationError.js';
import { Logger } from '../../src/modules/Logger.js';
import { FunctionTransport } from '../../src/transports/FunctionTransport.js';
import type { LogRecordType } from '../../src/types/LogRecordType.js';

import { TestFactory } from './TestFactory.js';

void describe('FunctionTransport', () => {
  void describe('create', () => {
    void it('creates with a sink function', () => {
      const transport = FunctionTransport.create(() => {});

      assert.ok(transport instanceof FunctionTransport);
    });

    void it('creates with a level option', () => {
      const transport = FunctionTransport.create(() => {}, { level: 'warn' });

      assert.ok(transport instanceof FunctionTransport);
    });

    void it('throws ConfigurationError when sink is not a function', () => {
      assert.throws(
        () => FunctionTransport.create('not-a-function' as unknown as (r: LogRecordType) => void),
        ConfigurationError
      );
    });

    void it('throws ConfigurationError when level option has invalid type', () => {
      assert.throws(
        () => FunctionTransport.create(() => {}, { level: [] as unknown as string }),
        ConfigurationError
      );
    });
  });

  void describe('bridging', () => {
    void it('calls the sink with the assembled record', () => {
      const captured: LogRecordType[] = [];
      const transport = FunctionTransport.create((record) => {
        captured.push(record);
      });

      const logger = Logger.create({ 'level': LogLevel.TRACE, 'transports': [transport] });
      const body = TestFactory.body('bridge');

      logger.info(body);

      assert.strictEqual(captured.length, 1);
      assert.strictEqual(captured[0]?.data, body);
      assert.strictEqual(captured[0]?.level, LogLevel.INFO);
    });

    void it('calls the sink once per emit call', () => {
      let callCount = 0;
      const transport = FunctionTransport.create(() => { callCount++; });
      const logger = Logger.create({ 'level': LogLevel.TRACE, 'transports': [transport] });

      logger.trace(TestFactory.body('t'));
      logger.debug(TestFactory.body('d'));
      logger.info(TestFactory.body('i'));
      logger.warn(TestFactory.body('w'));
      logger.error(TestFactory.body('e'));

      assert.strictEqual(callCount, 5);
    });
  });

  void describe('level filtering', () => {
    void it('respects transport-level floor', () => {
      let callCount = 0;
      const transport = FunctionTransport.create(() => { callCount++; }, { level: LogLevel.WARN });
      const logger = Logger.create({ 'level': LogLevel.TRACE, 'transports': [transport] });

      logger.trace(TestFactory.body('t'));
      logger.debug(TestFactory.body('d'));
      logger.info(TestFactory.body('i'));
      logger.warn(TestFactory.body('w'));
      logger.error(TestFactory.body('e'));

      assert.strictEqual(callCount, 2);
    });
  });
});
