import assert from 'node:assert/strict';
import {
  describe,
  it
} from 'node:test';

import { LOG_LEVEL } from '../../src/constants/LOG_LEVEL.js';
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
        () => { Reflect.apply(MemoryTransport.create, MemoryTransport, [{ 'level': {} }]); },
        ConfigurationError
      );
    });
  });

  void describe('records', () => {
    void it('starts empty', () => {
      const transport = MemoryTransport.create();

      assert.strictEqual(transport.records().length, 0);
    });

    void it('captures records written via Logger', () => {
      const transport = MemoryTransport.create();
      const logger = Logger.create({ 'level': LOG_LEVEL.TRACE, 'transports': [transport] });

      logger.info(TestFactory.body('hello'));

      assert.strictEqual(transport.records().length, 1);
    });

    void it('captures multiple records in order', () => {
      const transport = MemoryTransport.create();
      const logger = Logger.create({ 'level': LOG_LEVEL.TRACE, 'transports': [transport] });

      logger.info(TestFactory.body('first'));
      logger.warn(TestFactory.body('second'));
      logger.error(TestFactory.body('third'));

      const records = transport.records();

      assert.strictEqual(records.length, 3);
      assert.strictEqual(records[0]?.data.message, 'first');
      assert.strictEqual(records[1]?.data.message, 'second');
      assert.strictEqual(records[2]?.data.message, 'third');
    });

    void it('returns a defensive snapshot', () => {
      const transport = MemoryTransport.create();
      const logger = Logger.create({ 'level': LOG_LEVEL.TRACE, 'transports': [transport] });
      const snapshot = transport.records();

      logger.info(TestFactory.body('msg'));

      assert.strictEqual(snapshot.length, 0);
      const current = transport.records();
      Reflect.set(current, 0, undefined);
      assert.strictEqual(transport.records()[0]?.data.message, 'msg');
    });

    void it('does not expose mutable retained record state', () => {
      const transport = MemoryTransport.create();
      const logger = Logger.create({
        'level': LOG_LEVEL.TRACE,
        'metadata': { 'deployment': { 'region': 'east' } },
        'transports': [transport]
      });
      const context = { 'request': { 'attempt': 1 } };

      logger.info(TestFactory.body('immutable', context));
      const exposed = transport.records()[0];
      assert.ok(exposed);

      const exposedDeployment = Reflect.get(exposed.metadata, 'deployment');
      assert.ok(exposedDeployment !== null && typeof exposedDeployment === 'object');
      const exposedRegion = Reflect.get(exposedDeployment, 'region');
      const exposedRequest = Reflect.get(exposed.data.context, 'request');
      assert.ok(exposedRequest !== null && typeof exposedRequest === 'object');
      Reflect.set(exposed, 'level', LOG_LEVEL.SILENT);
      Reflect.set(exposedDeployment, 'region', 'west');
      Reflect.set(exposedRequest, 'attempt', 2);
      context.request.attempt = 3;

      const retained = transport.records()[0];
      assert.ok(retained);
      assert.strictEqual(retained.level, LOG_LEVEL.INFO);
      assert.strictEqual(exposedRegion, 'east');
      assert.deepStrictEqual(retained.metadata, { 'deployment': { 'region': 'east' } });
      assert.deepStrictEqual(retained.data.context, { 'request': { 'attempt': 1 } });
    });
  });

  void describe('level filtering', () => {
    const scenarios: Array<{ description: string; level: number; expectedCount: number }> = [
      { description: 'TRACE floor captures all five', level: LOG_LEVEL.TRACE, expectedCount: 5 },
      { description: 'DEBUG floor captures four', level: LOG_LEVEL.DEBUG, expectedCount: 4 },
      { description: 'INFO floor captures three', level: LOG_LEVEL.INFO, expectedCount: 3 },
      { description: 'WARN floor captures two', level: LOG_LEVEL.WARN, expectedCount: 2 },
      { description: 'ERROR floor captures one', level: LOG_LEVEL.ERROR, expectedCount: 1 },
      { description: 'SILENT floor captures none', level: LOG_LEVEL.SILENT, expectedCount: 0 }
    ];

    for (const { description, level, expectedCount } of scenarios) {
      void it(description, () => {
        const transport = MemoryTransport.create({ level });
        const logger = Logger.create({ 'level': LOG_LEVEL.TRACE, 'transports': [transport] });

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
      const transport = MemoryTransport.create();
      const logger = Logger.create({ 'level': LOG_LEVEL.TRACE, 'transports': [transport] });

      logger.info(TestFactory.body('msg'));
      transport.clear();

      assert.strictEqual(transport.records().length, 0);
    });

    void it('allows capturing new records after clear', () => {
      const transport = MemoryTransport.create();
      const logger = Logger.create({ 'level': LOG_LEVEL.TRACE, 'transports': [transport] });

      logger.info(TestFactory.body('before'));
      transport.clear();
      logger.info(TestFactory.body('after'));

      assert.strictEqual(transport.records().length, 1);
      assert.strictEqual(transport.records()[0]?.data.message, 'after');
    });
  });
});
