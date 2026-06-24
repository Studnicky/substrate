import assert from 'node:assert/strict';
import {
  describe,
  it
} from 'node:test';

import { LogLevel } from '../../src/constants/LogLevel.js';
import { ConfigurationError } from '../../src/errors/ConfigurationError.js';
import { Logger } from '../../src/modules/Logger.js';
import { MemoryTransport } from '../../src/transports/MemoryTransport.js';

import { TestFactory } from './TestFactory.js';

void describe('MemoryTransport', () => {
  void describe('create', () => {
    void it('creates with no options', () => {
      const transport = MemoryTransport.create();

      assert.ok(transport instanceof MemoryTransport);
    });

    void it('creates with level option', () => {
      const transport = MemoryTransport.create({ level: 'warn' });

      assert.ok(transport instanceof MemoryTransport);
    });

    void it('throws ConfigurationError on invalid level type', () => {
      assert.throws(
        () => new MemoryTransport({ level: {} as unknown as string }),
        ConfigurationError
      );
    });
  });

  void describe('records', () => {
    void it('starts empty', () => {
      const transport = new MemoryTransport();

      assert.strictEqual(transport.records().length, 0);
    });

    void it('captures records written via Logger', () => {
      const transport = new MemoryTransport();
      const logger = Logger.create({ 'level': LogLevel.TRACE, 'transports': [transport] });

      logger.info(TestFactory.body('hello'));

      assert.strictEqual(transport.records().length, 1);
    });

    void it('captures multiple records in order', () => {
      const transport = new MemoryTransport();
      const logger = Logger.create({ 'level': LogLevel.TRACE, 'transports': [transport] });

      logger.info(TestFactory.body('first'));
      logger.warn(TestFactory.body('second'));
      logger.error(TestFactory.body('third'));

      const records = transport.records();

      assert.strictEqual(records.length, 3);
      assert.strictEqual(records[0]?.data.message, 'first');
      assert.strictEqual(records[1]?.data.message, 'second');
      assert.strictEqual(records[2]?.data.message, 'third');
    });

    void it('returns readonly array (same reference reflects new writes)', () => {
      const transport = new MemoryTransport();
      const logger = Logger.create({ 'level': LogLevel.TRACE, 'transports': [transport] });
      const snapshot = transport.records();

      logger.info(TestFactory.body('msg'));

      // The returned array is the live buffer — length updates
      assert.strictEqual(snapshot.length, 1);
    });
  });

  void describe('level filtering', () => {
    const scenarios: Array<{ description: string; level: number; expectedCount: number }> = [
      { description: 'TRACE floor captures all five', level: LogLevel.TRACE, expectedCount: 5 },
      { description: 'DEBUG floor captures four', level: LogLevel.DEBUG, expectedCount: 4 },
      { description: 'INFO floor captures three', level: LogLevel.INFO, expectedCount: 3 },
      { description: 'WARN floor captures two', level: LogLevel.WARN, expectedCount: 2 },
      { description: 'ERROR floor captures one', level: LogLevel.ERROR, expectedCount: 1 },
      { description: 'SILENT floor captures none', level: LogLevel.SILENT, expectedCount: 0 }
    ];

    for (const { description, level, expectedCount } of scenarios) {
      void it(description, () => {
        const transport = new MemoryTransport({ level });
        const logger = Logger.create({ 'level': LogLevel.TRACE, 'transports': [transport] });

        logger.trace(TestFactory.body('trace'));
        logger.debug(TestFactory.body('debug'));
        logger.info(TestFactory.body('info'));
        logger.warn(TestFactory.body('warn'));
        logger.error(TestFactory.body('error'));

        assert.strictEqual(transport.records().length, expectedCount);
      });
    }
  });

  void describe('clear', () => {
    void it('empties the buffer', () => {
      const transport = new MemoryTransport();
      const logger = Logger.create({ 'level': LogLevel.TRACE, 'transports': [transport] });

      logger.info(TestFactory.body('msg'));
      transport.clear();

      assert.strictEqual(transport.records().length, 0);
    });

    void it('allows capturing new records after clear', () => {
      const transport = new MemoryTransport();
      const logger = Logger.create({ 'level': LogLevel.TRACE, 'transports': [transport] });

      logger.info(TestFactory.body('before'));
      transport.clear();
      logger.info(TestFactory.body('after'));

      assert.strictEqual(transport.records().length, 1);
      assert.strictEqual(transport.records()[0]?.data.message, 'after');
    });
  });
});
