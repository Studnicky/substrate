import assert from 'node:assert/strict';
import {
  describe,
  it
} from 'node:test';

import { LOG_LEVEL } from '../../src/constants/LOG_LEVEL.js';
import { ConfigurationError } from '../../src/errors/ConfigurationError.js';
import { Logger } from '../../src/modules/Logger.js';
import type { TransportInterface } from '../../src/transports/TransportInterface.js';
import type { LogLevelType } from '../../src/types/LogLevelType.js';
import type { LogMetadataType } from '../../src/types/LogMetadataType.js';
import type { LogRecordType } from '../../src/types/LogRecordType.js';
import { FunctionTransport } from '../../src/transports/FunctionTransport.js';
import { MemoryTransport } from '../../src/transports/MemoryTransport.js';
import { NoOpTransport } from '../../src/transports/NoOpTransport.js';

import { TestFactory } from './TestFactory.js';

void describe('Logger', () => {
  void describe('create', () => {
    void it('creates a logger with default INFO level and no transports', () => {
      const logger = Logger.create();

      assert.ok(logger instanceof Logger);
    });

    void it('creates a logger with explicit level string', () => {
      const logger = Logger.create({ level: 'debug' });

      assert.ok(logger instanceof Logger);
    });

    void it('creates a logger with explicit level numeric', () => {
      const logger = Logger.create({ level: LOG_LEVEL.DEBUG });

      assert.ok(logger instanceof Logger);
    });

    void it('creates a logger with metadata', () => {
      const logger = Logger.create({ metadata: { service: 'api' } });

      const memory = MemoryTransport.create();
      const childLogger = logger.child({});
      // Attach memory to a fresh logger with same config to test metadata flows
      const testLogger = Logger.create({
        'level': LOG_LEVEL.TRACE,
        'metadata': { service: 'api' },
        'transports': [memory]
      });

      testLogger.info(TestFactory.body('msg'));
      const records = memory.records();

      assert.strictEqual(records.length, 1);
      assert.deepStrictEqual(records[0]?.metadata, { service: 'api' });

      // childLogger is valid and unused intentionally — just verifying construction
      assert.ok(typeof childLogger.info === 'function');
    });

    void it('throws ConfigurationError when metadata is not a plain object', () => {
      assert.throws(
        () => Logger.create({ metadata: 'not-an-object' as unknown as Record<string, unknown> }),
        ConfigurationError
      );
    });
  });

  void describe('global level floor', () => {
    const scenarios: Array<{ description: string; level: number; expectedCount: number }> = [
      { description: 'TRACE level passes all records', level: LOG_LEVEL.TRACE, expectedCount: 5 },
      { description: 'DEBUG level passes debug and above', level: LOG_LEVEL.DEBUG, expectedCount: 4 },
      { description: 'INFO level passes info and above', level: LOG_LEVEL.INFO, expectedCount: 3 },
      { description: 'WARN level passes warn and above', level: LOG_LEVEL.WARN, expectedCount: 2 },
      { description: 'ERROR level passes error only', level: LOG_LEVEL.ERROR, expectedCount: 1 },
      { description: 'SILENT level passes nothing', level: LOG_LEVEL.SILENT, expectedCount: 0 }
    ];

    for (const { description, level, expectedCount } of scenarios) {
      void it(description, () => {
        const memory = MemoryTransport.create();
        const logger = Logger.create({ level, 'transports': [memory] });

        logger.trace(TestFactory.body('trace'));
        logger.debug(TestFactory.body('debug'));
        logger.info(TestFactory.body('info'));
        logger.warn(TestFactory.body('warn'));
        logger.error(TestFactory.body('error'));

        assert.strictEqual(memory.records().length, expectedCount);
      });
    }
  });

  void describe('per-transport level filter', () => {
    void it('transport with warn floor ignores records below warn', () => {
      const allMemory = MemoryTransport.create({ level: LOG_LEVEL.TRACE });
      const warnMemory = MemoryTransport.create({ level: LOG_LEVEL.WARN });

      const logger = Logger.create({
        'level': LOG_LEVEL.TRACE,
        'transports': [allMemory, warnMemory]
      });

      logger.debug(TestFactory.body('debug'));
      logger.info(TestFactory.body('info'));
      logger.warn(TestFactory.body('warn'));
      logger.error(TestFactory.body('error'));

      // allMemory receives everything at or above TRACE global floor
      assert.strictEqual(allMemory.records().length, 4);
      // warnMemory only receives warn and error
      assert.strictEqual(warnMemory.records().length, 2);
    });

    void it('transports with different floors receive correct subsets', () => {
      const debugMemory = MemoryTransport.create({ level: LOG_LEVEL.DEBUG });
      const errorMemory = MemoryTransport.create({ level: LOG_LEVEL.ERROR });

      const logger = Logger.create({
        'level': LOG_LEVEL.DEBUG,
        'transports': [debugMemory, errorMemory]
      });

      logger.debug(TestFactory.body('d'));
      logger.info(TestFactory.body('i'));
      logger.warn(TestFactory.body('w'));
      logger.error(TestFactory.body('e'));

      assert.strictEqual(debugMemory.records().length, 4);
      assert.strictEqual(errorMemory.records().length, 1);
      assert.strictEqual(errorMemory.records()[0]?.level, LOG_LEVEL.ERROR);
    });
  });

  void describe('fan-out to multiple transports', () => {
    void it('delivers each record to all transports', () => {
      const memory1 = MemoryTransport.create();
      const memory2 = MemoryTransport.create();

      const logger = Logger.create({
        'level': LOG_LEVEL.TRACE,
        'transports': [memory1, memory2]
      });

      logger.info(TestFactory.body('msg'));

      assert.strictEqual(memory1.records().length, 1);
      assert.strictEqual(memory2.records().length, 1);
    });

    void it('a throwing transport does not prevent others from receiving records', () => {
      const received: number[] = [];
      const throwingTransport = FunctionTransport.create(() => {
        throw new Error('transport failure');
      });
      const countingTransport = FunctionTransport.create(() => {
        received.push(1);
      });

      const logger = Logger.create({
        'level': LOG_LEVEL.TRACE,
        'transports': [throwingTransport, countingTransport]
      });

      logger.info(TestFactory.body('msg'));

      // countingTransport must still fire even though throwingTransport threw
      assert.strictEqual(received.length, 1);
    });

    void it('a throwing onTransportError hook does not prevent other transports from receiving records', () => {
      const received: number[] = [];

      class ThrowingTransportErrorLogger extends Logger {
        protected override onTransportError(): void {
          throw new Error('onTransportError boom');
        }
      }

      const throwingTransport = FunctionTransport.create(() => {
        throw new Error('transport failure');
      });
      const countingTransport = FunctionTransport.create(() => {
        received.push(1);
      });

      const logger = ThrowingTransportErrorLogger.create({
        'level': LOG_LEVEL.TRACE,
        'transports': [throwingTransport, countingTransport]
      });

      logger.info(TestFactory.body('msg'));

      assert.strictEqual(received.length, 1);
    });
  });

  void describe('child metadata merging', () => {
    void it('child inherits parent metadata', () => {
      const memory = MemoryTransport.create();
      const parent = Logger.create({
        'level': LOG_LEVEL.TRACE,
        'metadata': { service: 'api' },
        'transports': [memory]
      });

      const child = parent.child({ requestId: 'req-1' });

      child.info(TestFactory.body('msg'));

      const record = memory.records()[0];

      assert.ok(record);
      assert.deepStrictEqual(record.metadata, { service: 'api', requestId: 'req-1' });
    });

    void it('child metadata overrides parent key when key conflicts', () => {
      const memory = MemoryTransport.create();
      const parent = Logger.create({
        'level': LOG_LEVEL.TRACE,
        'metadata': { service: 'v1' },
        'transports': [memory]
      });

      const child = parent.child({ service: 'v2' });

      child.info(TestFactory.body('msg'));

      const record = memory.records()[0];

      assert.ok(record);
      assert.strictEqual(record.metadata.service, 'v2');
    });

    void it('grandchild merges metadata from both ancestors', () => {
      const memory = MemoryTransport.create();
      const parent = Logger.create({
        'level': LOG_LEVEL.TRACE,
        'metadata': { service: 'api' },
        'transports': [memory]
      });

      const child = parent.child({ requestId: 'req-1' });
      const grandchild = child.child({ operation: 'upload' });

      grandchild.info(TestFactory.body('msg'));

      const record = memory.records()[0];

      assert.ok(record);
      assert.deepStrictEqual(record.metadata, {
        'operation': 'upload',
        'requestId': 'req-1',
        'service': 'api'
      });
    });

    void it('child shares transports with parent', () => {
      const memory = MemoryTransport.create();
      const parent = Logger.create({
        'level': LOG_LEVEL.TRACE,
        'transports': [memory]
      });

      const child = parent.child({ scope: 'child' });

      parent.info(TestFactory.body('parent-msg'));
      child.info(TestFactory.body('child-msg'));

      assert.strictEqual(memory.records().length, 2);
    });

    void it('a throwing onChildCreate hook does not replace child()', () => {
      class ThrowingChildLogger extends Logger {
        protected override onChildCreate(): void {
          throw new Error('onChildCreate boom');
        }
      }

      const parent = ThrowingChildLogger.create({ 'level': LOG_LEVEL.TRACE });
      const child = parent.child({ requestId: 'req-1' });

      assert.ok(child instanceof Logger);
    });
  });

  void describe('record shape', () => {
    void it('record contains level, time, metadata, and data', () => {
      const memory = MemoryTransport.create();
      const logger = Logger.create({
        'level': LOG_LEVEL.TRACE,
        'metadata': { service: 'test' },
        'transports': [memory]
      });

      const before = Date.now();
      const body = TestFactory.body('hello', { extra: 'ctx' });

      logger.info(body);

      const after = Date.now();
      const record = memory.records()[0];

      assert.ok(record);
      assert.strictEqual(record.level, LOG_LEVEL.INFO);
      assert.ok(record.time >= before);
      assert.ok(record.time <= after);
      assert.deepStrictEqual(record.metadata, { service: 'test' });
      assert.strictEqual(record.data, body);
    });

    void it('each level maps to the correct LOG_LEVEL constant', () => {
      const memory = MemoryTransport.create();
      const logger = Logger.create({ 'level': LOG_LEVEL.TRACE, 'transports': [memory] });

      logger.trace(TestFactory.body('t'));
      logger.debug(TestFactory.body('d'));
      logger.info(TestFactory.body('i'));
      logger.warn(TestFactory.body('w'));
      logger.error(TestFactory.body('e'));

      const records = memory.records();

      assert.strictEqual(records[0]?.level, LOG_LEVEL.TRACE);
      assert.strictEqual(records[1]?.level, LOG_LEVEL.DEBUG);
      assert.strictEqual(records[2]?.level, LOG_LEVEL.INFO);
      assert.strictEqual(records[3]?.level, LOG_LEVEL.WARN);
      assert.strictEqual(records[4]?.level, LOG_LEVEL.ERROR);
    });

    void it('a throwing onLog hook does not replace emission', () => {
      class ThrowingLogLogger extends Logger {
        protected override onLog(): void {
          throw new Error('onLog boom');
        }
      }

      const memory = MemoryTransport.create();
      const logger = ThrowingLogLogger.create({
        'level': LOG_LEVEL.TRACE,
        'transports': [memory]
      });

      logger.info(TestFactory.body('msg'));

      assert.strictEqual(memory.records().length, 1);
    });
  });

  void describe('FunctionTransport bridging', () => {
    void it('calls the sink with the assembled record', () => {
      const captured: unknown[] = [];
      const transport = FunctionTransport.create((record) => {
        captured.push(record);
      });

      const logger = Logger.create({ 'level': LOG_LEVEL.TRACE, 'transports': [transport] });

      const body = TestFactory.body('bridge-test');

      logger.info(body);

      assert.strictEqual(captured.length, 1);
      assert.strictEqual((captured[0] as { data: unknown }).data, body);
    });
  });

  void describe('NoOpTransport silence', () => {
    void it('accepts records without throwing', () => {
      const noop = NoOpTransport.create();
      const logger = Logger.create({ 'level': LOG_LEVEL.TRACE, 'transports': [noop] });

      assert.doesNotThrow(() => {
        logger.trace(TestFactory.body('t'));
        logger.debug(TestFactory.body('d'));
        logger.info(TestFactory.body('i'));
        logger.warn(TestFactory.body('w'));
        logger.error(TestFactory.body('e'));
      });
    });
  });

  void describe('no transports (valid silent logger)', () => {
    void it('accepts all log calls without throwing when no transports configured', () => {
      const logger = Logger.create({ level: 'trace' });

      assert.doesNotThrow(() => {
        logger.trace(TestFactory.body('t'));
        logger.debug(TestFactory.body('d'));
        logger.info(TestFactory.body('i'));
        logger.warn(TestFactory.body('w'));
        logger.error(TestFactory.body('e'));
      });
    });
  });

  void describe('lifecycle hooks', () => {
    void it('onLog fires after record assembly and before transport fan-out', () => {
      const loggedLevels: LogLevelType[] = [];
      const loggedRecords: LogRecordType[] = [];

      class ObservedLogger extends Logger {
        constructor() { super({ 'level': LOG_LEVEL.TRACE }); }

        protected override onLog(level: LogLevelType, record: LogRecordType): void {
          loggedLevels.push(level);
          loggedRecords.push(record);
        }
      }

      const logger = new ObservedLogger();
      logger.info(TestFactory.body('hello'));

      assert.strictEqual(loggedLevels.length, 1);
      assert.strictEqual(loggedLevels[0], LOG_LEVEL.INFO);
      assert.ok(loggedRecords[0] !== undefined);
      assert.strictEqual(loggedRecords[0].level, LOG_LEVEL.INFO);
    });

    void it('onLog receives the assembled record with correct fields', () => {
      const captured: LogRecordType[] = [];

      class ObservedLogger extends Logger {
        constructor() { super({ 'level': LOG_LEVEL.TRACE, 'metadata': { 'service': 'test' } }); }

        protected override onLog(_level: LogLevelType, record: LogRecordType): void {
          captured.push(record);
        }
      }

      const logger = new ObservedLogger();
      const body = TestFactory.body('msg');
      logger.warn(body);

      assert.strictEqual(captured.length, 1);
      assert.strictEqual(captured[0]?.level, LOG_LEVEL.WARN);
      assert.strictEqual(captured[0]?.data, body);
      assert.deepStrictEqual(captured[0]?.metadata, { 'service': 'test' });
    });

    void it('onDropped fires when level is below the logger floor', () => {
      const droppedLevels: LogLevelType[] = [];

      class ObservedLogger extends Logger {
        constructor() { super({ 'level': LOG_LEVEL.INFO }); }

        protected override onDropped(level: LogLevelType): void {
          droppedLevels.push(level);
        }
      }

      const logger = new ObservedLogger();
      logger.debug(TestFactory.body('dropped'));

      assert.strictEqual(droppedLevels.length, 1);
      assert.strictEqual(droppedLevels[0], LOG_LEVEL.DEBUG);
    });

    void it('onDropped does not fire when record meets or exceeds the floor', () => {
      const droppedLevels: LogLevelType[] = [];

      class ObservedLogger extends Logger {
        constructor() { super({ 'level': LOG_LEVEL.INFO }); }

        protected override onDropped(level: LogLevelType): void {
          droppedLevels.push(level);
        }
      }

      const logger = new ObservedLogger();
      logger.info(TestFactory.body('passes'));
      logger.warn(TestFactory.body('passes'));

      assert.strictEqual(droppedLevels.length, 0);
    });

    void it('onDropped fires for trace and debug when floor is INFO', () => {
      const droppedLevels: LogLevelType[] = [];

      class ObservedLogger extends Logger {
        constructor() { super({ 'level': LOG_LEVEL.INFO }); }

        protected override onDropped(level: LogLevelType): void {
          droppedLevels.push(level);
        }
      }

      const logger = new ObservedLogger();
      logger.trace(TestFactory.body('trace-drop'));
      logger.debug(TestFactory.body('debug-drop'));
      logger.info(TestFactory.body('info-passes'));

      assert.strictEqual(droppedLevels.length, 2);
      assert.strictEqual(droppedLevels[0], LOG_LEVEL.TRACE);
      assert.strictEqual(droppedLevels[1], LOG_LEVEL.DEBUG);
    });

    void it('a throwing onDropped hook does not replace floor filtering', () => {
      class ThrowingDroppedLogger extends Logger {
        constructor() { super({ 'level': LOG_LEVEL.ERROR }); }

        protected override onDropped(): void {
          throw new Error('onDropped boom');
        }
      }

      const memory = MemoryTransport.create();
      const logger = ThrowingDroppedLogger.create({
        'level': LOG_LEVEL.ERROR,
        'transports': [memory]
      });
      logger.info(TestFactory.body('dropped'));

      assert.strictEqual(memory.records().length, 0);
    });

    void it('onChildCreate fires after child creation with the passed bindings', () => {
      const capturedBindings: LogMetadataType[] = [];

      class ObservedLogger extends Logger {
        constructor() { super({}); }

        protected override onChildCreate(bindings: LogMetadataType): void {
          capturedBindings.push(bindings);
        }
      }

      const logger = new ObservedLogger();
      logger.child({ 'requestId': 'abc' });

      assert.strictEqual(capturedBindings.length, 1);
      assert.deepStrictEqual(capturedBindings[0], { 'requestId': 'abc' });
    });

    void it('onChildCreate receives the bindings passed to child(), not the merged metadata', () => {
      const capturedBindings: LogMetadataType[] = [];

      class ObservedLogger extends Logger {
        constructor() { super({ 'metadata': { 'service': 'api' } }); }

        protected override onChildCreate(bindings: LogMetadataType): void {
          capturedBindings.push(bindings);
        }
      }

      const logger = new ObservedLogger();
      logger.child({ 'requestId': 'xyz' });

      // Hook receives only the bindings argument, not the merged { service, requestId }
      assert.deepStrictEqual(capturedBindings[0], { 'requestId': 'xyz' });
    });

    void it('onTransportError fires when a transport throws', () => {
      const errors: unknown[] = [];
      const capturedTransports: TransportInterface[] = [];

      class ObservedLogger extends Logger {
        constructor() {
          const throwingTransport = FunctionTransport.create(() => {
            throw new Error('transport boom');
          });
          super({ 'level': LOG_LEVEL.TRACE, 'transports': [throwingTransport] });
        }

        protected override onTransportError(transport: TransportInterface, _record: LogRecordType, error: unknown): void {
          capturedTransports.push(transport);
          errors.push(error);
        }
      }

      const logger = new ObservedLogger();
      logger.info(TestFactory.body('boom'));

      assert.strictEqual(errors.length, 1);
      assert.ok(errors[0] instanceof Error);
      assert.strictEqual((errors[0] as Error).message, 'transport boom');
      assert.strictEqual(capturedTransports.length, 1);
    });

    void it('onTransportError does not fire when transport succeeds', () => {
      const errors: unknown[] = [];

      class ObservedLogger extends Logger {
        constructor() {
          const memory = MemoryTransport.create();
          super({ 'level': LOG_LEVEL.TRACE, 'transports': [memory] });
        }

        protected override onTransportError(_transport: TransportInterface, _record: LogRecordType, error: unknown): void {
          errors.push(error);
        }
      }

      const logger = new ObservedLogger();
      logger.info(TestFactory.body('ok'));

      assert.strictEqual(errors.length, 0);
    });

    void it('onTransportError fires for each failing transport independently', () => {
      const errors: unknown[] = [];

      class ObservedLogger extends Logger {
        constructor() {
          const throwing1 = FunctionTransport.create(() => { throw new Error('first'); });
          const throwing2 = FunctionTransport.create(() => { throw new Error('second'); });
          super({ 'level': LOG_LEVEL.TRACE, 'transports': [throwing1, throwing2] });
        }

        protected override onTransportError(_transport: TransportInterface, _record: LogRecordType, error: unknown): void {
          errors.push(error);
        }
      }

      const logger = new ObservedLogger();
      logger.info(TestFactory.body('multi-error'));

      assert.strictEqual(errors.length, 2);
    });

    void it('a throwing onTransportError hook does not replace transport failure handling', () => {
      class ThrowingTransportErrorLogger extends Logger {
        constructor() {
          const throwing = FunctionTransport.create(() => {
            throw new Error('transport boom');
          });
          super({ 'level': LOG_LEVEL.TRACE, 'transports': [throwing] });
        }

        protected override onTransportError(): void {
          throw new Error('onTransportError boom');
        }
      }

      const logger = new ThrowingTransportErrorLogger();

      assert.doesNotThrow(() => {
        logger.info(TestFactory.body('boom'));
      });
    });
  });
});
