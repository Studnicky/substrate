import assert from 'node:assert/strict';
import {
  describe,
  it
} from 'node:test';

import { HookInvocationError } from '@studnicky/errors';

import { LOG_LEVEL } from '../../src/constants/LOG_LEVEL.js';
import type { LogLevelEntity } from '../../src/entities/LogLevelEntity.js';
import type { LogRecordEntity } from '../../src/entities/LogRecordEntity.js';
import { ConfigurationError } from '../../src/errors/ConfigurationError.js';
import type { LogMetadataInterface } from '../../src/interfaces/LogMetadataInterface.js';
import { Logger } from '../../src/modules/Logger.js';
import type { TransportInterface } from '../../src/transports/TransportInterface.js';
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
        () => { Reflect.apply(Logger.create, Logger, [{ 'metadata': 'not-an-object' }]); },
        ConfigurationError
      );
    });

    void it('snapshots caller-owned metadata and transport arrays', () => {
      const configuredTransport = MemoryTransport.create();
      const addedTransport = MemoryTransport.create();
      const transports: TransportInterface[] = [configuredTransport];
      const region = { 'name': 'east' };
      const metadata = { region, 'service': 'api' };
      const logger = Logger.create({
        'level': LOG_LEVEL.TRACE,
        metadata,
        transports
      });

      metadata.service = 'mutated';
      region.name = 'west';
      transports.push(addedTransport);
      logger.info(TestFactory.body('owned'));

      assert.deepStrictEqual(configuredTransport.records()[0]?.metadata, {
        'region': { 'name': 'east' },
        'service': 'api'
      });
      assert.strictEqual(addedTransport.records().length, 0);
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

    void it('a throwing onTransportError hook does not abort fan-out to remaining transports', () => {
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

      assert.doesNotThrow(() => {
        logger.info(TestFactory.body('msg'));
      });

      // the throwing hook is recorded instead of aborting fan-out
      assert.strictEqual(received.length, 1);
      assert.strictEqual(logger.hookErrorCount, 1);
      assert.strictEqual(logger.getHookErrors()[0]?.hookName, 'onTransportError');
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

    void it('child snapshots caller-owned metadata', () => {
      const memory = MemoryTransport.create();
      const parent = Logger.create({
        'level': LOG_LEVEL.TRACE,
        'metadata': { 'service': 'api' },
        'transports': [memory]
      });
      const attempt = { 'number': 1 };
      const metadata = { attempt, 'requestId': 'req-1' };
      const child = parent.child(metadata);

      metadata.requestId = 'mutated';
      attempt.number = 2;
      child.info(TestFactory.body('msg'));

      assert.deepStrictEqual(memory.records()[0]?.metadata, {
        'attempt': { 'number': 1 },
        'requestId': 'req-1',
        'service': 'api'
      });
    });

    void it('a throwing onChildCreate hook surfaces as HookInvocationError', () => {
      class ThrowingChildLogger extends Logger {
        protected override onChildCreate(): void {
          throw new Error('onChildCreate boom');
        }
      }

      const parent = ThrowingChildLogger.create({ 'level': LOG_LEVEL.TRACE });

      assert.throws(() => {
        parent.child({ requestId: 'req-1' });
      }, HookInvocationError);
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
      assert.deepStrictEqual(record.data, body);
      assert.notStrictEqual(record.data, body);
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

    void it('a throwing onLog hook surfaces as HookInvocationError and aborts transport fan-out', () => {
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

      assert.throws(() => {
        logger.info(TestFactory.body('msg'));
      }, HookInvocationError);

      assert.strictEqual(memory.records().length, 0);
    });
  });

  void describe('FunctionTransport bridging', () => {
    void it('calls the sink with the assembled record', () => {
      const captured: LogRecordEntity.Type[] = [];
      const transport = FunctionTransport.create((record) => {
        captured.push(record);
      });

      const logger = Logger.create({ 'level': LOG_LEVEL.TRACE, 'transports': [transport] });

      const body = TestFactory.body('bridge-test');

      logger.info(body);

      assert.strictEqual(captured.length, 1);
      assert.strictEqual(captured[0]?.data, body);
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
      const loggedLevels: LogLevelEntity.Type[] = [];
      const loggedRecords: LogRecordEntity.Type[] = [];

      class ObservedLogger extends Logger {
        constructor() { super({ 'level': LOG_LEVEL.TRACE }); }

        protected override onLog(level: LogLevelEntity.Type, record: LogRecordEntity.Type): void {
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
      const captured: LogRecordEntity.Type[] = [];

      class ObservedLogger extends Logger {
        constructor() { super({ 'level': LOG_LEVEL.TRACE, 'metadata': { 'service': 'test' } }); }

        protected override onLog(_level: LogLevelEntity.Type, record: LogRecordEntity.Type): void {
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
      const droppedLevels: LogLevelEntity.Type[] = [];

      class ObservedLogger extends Logger {
        constructor() { super({ 'level': LOG_LEVEL.INFO }); }

        protected override onDropped(level: LogLevelEntity.Type): void {
          droppedLevels.push(level);
        }
      }

      const logger = new ObservedLogger();
      logger.debug(TestFactory.body('dropped'));

      assert.strictEqual(droppedLevels.length, 1);
      assert.strictEqual(droppedLevels[0], LOG_LEVEL.DEBUG);
    });

    void it('onDropped does not fire when record meets or exceeds the floor', () => {
      const droppedLevels: LogLevelEntity.Type[] = [];

      class ObservedLogger extends Logger {
        constructor() { super({ 'level': LOG_LEVEL.INFO }); }

        protected override onDropped(level: LogLevelEntity.Type): void {
          droppedLevels.push(level);
        }
      }

      const logger = new ObservedLogger();
      logger.info(TestFactory.body('passes'));
      logger.warn(TestFactory.body('passes'));

      assert.strictEqual(droppedLevels.length, 0);
    });

    void it('onDropped fires for trace and debug when floor is INFO', () => {
      const droppedLevels: LogLevelEntity.Type[] = [];

      class ObservedLogger extends Logger {
        constructor() { super({ 'level': LOG_LEVEL.INFO }); }

        protected override onDropped(level: LogLevelEntity.Type): void {
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

    void it('a throwing onDropped hook surfaces as HookInvocationError', () => {
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

      assert.throws(() => {
        logger.info(TestFactory.body('dropped'));
      }, HookInvocationError);

      assert.strictEqual(memory.records().length, 0);
    });

    void it('onChildCreate fires after child creation with the passed bindings', () => {
      const capturedBindings: LogMetadataInterface[] = [];

      class ObservedLogger extends Logger {
        constructor() { super({}); }

        protected override onChildCreate(bindings: LogMetadataInterface): void {
          capturedBindings.push(bindings);
        }
      }

      const logger = new ObservedLogger();
      logger.child({ 'requestId': 'abc' });

      assert.strictEqual(capturedBindings.length, 1);
      assert.deepStrictEqual(capturedBindings[0], { 'requestId': 'abc' });
    });

    void it('onChildCreate receives the bindings passed to child(), not the merged metadata', () => {
      const capturedBindings: LogMetadataInterface[] = [];

      class ObservedLogger extends Logger {
        constructor() { super({ 'metadata': { 'service': 'api' } }); }

        protected override onChildCreate(bindings: LogMetadataInterface): void {
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

        protected override onTransportError(transport: TransportInterface, _record: LogRecordEntity.Type, error: unknown): void {
          capturedTransports.push(transport);
          errors.push(error);
        }
      }

      const logger = new ObservedLogger();
      logger.info(TestFactory.body('boom'));

      assert.strictEqual(errors.length, 1);
      const [firstError] = errors;
      assert.ok(firstError instanceof Error);
      assert.strictEqual(firstError.message, 'transport boom');
      assert.strictEqual(capturedTransports.length, 1);
    });

    void it('onTransportError does not fire when transport succeeds', () => {
      const errors: unknown[] = [];

      class ObservedLogger extends Logger {
        constructor() {
          const memory = MemoryTransport.create();
          super({ 'level': LOG_LEVEL.TRACE, 'transports': [memory] });
        }

        protected override onTransportError(_transport: TransportInterface, _record: LogRecordEntity.Type, error: unknown): void {
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

        protected override onTransportError(_transport: TransportInterface, _record: LogRecordEntity.Type, error: unknown): void {
          errors.push(error);
        }
      }

      const logger = new ObservedLogger();
      logger.info(TestFactory.body('multi-error'));

      assert.strictEqual(errors.length, 2);
    });

    void it('throwing onTransportError hook records are isolated between logger instances', () => {
      class ThrowingTransportErrorLogger extends Logger {
        readonly hookFailure = new Error('onTransportError boom');

        constructor() {
          const throwing = FunctionTransport.create(() => {
            throw new Error('transport boom');
          });
          super({ 'level': LOG_LEVEL.TRACE, 'transports': [throwing] });
        }

        protected override onTransportError(): void {
          throw this.hookFailure;
        }
      }

      const first = new ThrowingTransportErrorLogger();
      const second = new ThrowingTransportErrorLogger();

      assert.doesNotThrow(() => {
        first.info(TestFactory.body('first'));
      });

      const firstSnapshot = first.getHookErrors();
      assert.strictEqual(first.hookErrorCount, 1);
      assert.strictEqual(second.hookErrorCount, 0);
      assert.strictEqual(firstSnapshot.length, 1);
      assert.strictEqual(firstSnapshot[0]?.hookName, 'onTransportError');
      assert.ok(firstSnapshot[0]?.cause instanceof Error);
      assert.notStrictEqual(firstSnapshot[0].cause, first.hookFailure);
      assert.strictEqual(firstSnapshot[0].cause.message, first.hookFailure.message);

      assert.doesNotThrow(() => {
        second.info(TestFactory.body('second'));
      });

      assert.strictEqual(first.hookErrorCount, 1);
      assert.strictEqual(second.hookErrorCount, 1);
      assert.strictEqual(firstSnapshot.length, 1);
      const secondSnapshot = second.getHookErrors();
      assert.strictEqual(secondSnapshot.length, 1);
      assert.strictEqual(secondSnapshot[0]?.hookName, 'onTransportError');
      assert.ok(secondSnapshot[0]?.cause instanceof Error);
      assert.notStrictEqual(secondSnapshot[0].cause, second.hookFailure);
      assert.strictEqual(secondSnapshot[0].cause.message, second.hookFailure.message);
    });

    void it('getHookErrors records one failure and deeply detaches nested diagnostics', () => {
      const hookFailure = new Error('onTransportError boom', {
        'cause': { 'transports': ['primary'] }
      });

      class ThrowingTransportErrorLogger extends Logger {
        protected override onTransportError(): void {
          throw hookFailure;
        }
      }

      const throwingTransport = FunctionTransport.create(() => {
        throw new Error('transport boom');
      });
      const logger = ThrowingTransportErrorLogger.create({
        'level': LOG_LEVEL.TRACE,
        'transports': [throwingTransport]
      });

      logger.info(TestFactory.body('diagnostic'));

      assert.strictEqual(logger.hookErrorCount, 1);
      const firstCause = logger.getHookErrors()[0]?.cause;
      assert.ok(firstCause instanceof Error);
      firstCause.message = 'mutated';
      const firstDetails = firstCause.cause;
      assert.ok(firstDetails !== null && typeof firstDetails === 'object');
      const firstTransports = Reflect.get(firstDetails, 'transports');
      assert.ok(Array.isArray(firstTransports));
      firstTransports.push('secondary');

      const secondCause = logger.getHookErrors()[0]?.cause;
      assert.ok(secondCause instanceof Error);
      assert.strictEqual(secondCause.message, 'onTransportError boom');
      assert.deepStrictEqual(secondCause.cause, { 'transports': ['primary'] });
      assert.strictEqual(logger.hookErrorCount, 1);
    });

    void it('one failing transport with a failing onTransportError override does not block delivery to other transports', () => {
      const deliveries: string[] = [];

      class ThrowingTransportErrorLogger extends Logger {
        protected override onTransportError(): void {
          throw new Error('onTransportError boom');
        }
      }

      const transport1 = FunctionTransport.create(() => { deliveries.push('t1'); });
      const transport2 = FunctionTransport.create(() => { throw new Error('t2 write failure'); });
      const transport3 = FunctionTransport.create(() => { deliveries.push('t3'); });

      const logger = ThrowingTransportErrorLogger.create({
        'level': LOG_LEVEL.TRACE,
        'transports': [transport1, transport2, transport3]
      });

      assert.doesNotThrow(() => {
        logger.info(TestFactory.body('fan-out'));
      });

      assert.deepStrictEqual(deliveries, ['t1', 't3']);
      assert.strictEqual(logger.hookErrorCount, 1);
      assert.strictEqual(logger.getHookErrors()[0]?.hookName, 'onTransportError');
    });

    void it('records an async onTransportError rejection without blocking later transport delivery', async () => {
      const deliveries: string[] = [];
      const hookFailure = new Error('async onTransportError boom');
      const rejectionEvents: unknown[] = [];
      const onUnhandledRejection = (reason: unknown): void => { rejectionEvents.push(reason); };

      class AsyncRejectingTransportErrorLogger extends Logger {
        protected override async onTransportError(): Promise<void> {
          await Promise.resolve();
          throw hookFailure;
        }
      }

      const throwingTransport = FunctionTransport.create(() => {
        throw new Error('transport write failure');
      });
      const laterTransport = FunctionTransport.create(() => { deliveries.push('later'); });

      process.on('unhandledRejection', onUnhandledRejection);
      try {
        const logger = AsyncRejectingTransportErrorLogger.create({
          'level': LOG_LEVEL.TRACE,
          'transports': [throwingTransport, laterTransport]
        });

        logger.info(TestFactory.body('async-fan-out'));
        assert.deepStrictEqual(deliveries, ['later']);

        await new Promise((resolve) => { setImmediate(resolve); });
        await new Promise((resolve) => { setImmediate(resolve); });

        assert.strictEqual(rejectionEvents.length, 0);
        assert.strictEqual(logger.hookErrorCount, 1);
        const [entry] = logger.getHookErrors();
        assert.ok(entry);
        assert.strictEqual(entry.hookName, 'onTransportError');
        assert.ok(entry.cause instanceof Error);
        assert.notStrictEqual(entry.cause, hookFailure);
        assert.strictEqual(entry.cause.message, hookFailure.message);
      } finally {
        process.off('unhandledRejection', onUnhandledRejection);
      }
    });

    void it('HookInvocationError carries the failing hook name and the original cause', () => {
      class ThrowingLogLogger extends Logger {
        protected override onLog(): void {
          throw new Error('onLog boom');
        }
      }

      const logger = ThrowingLogLogger.create({ 'level': LOG_LEVEL.TRACE });

      try {
        logger.info(TestFactory.body('msg'));
        assert.fail('expected logger.info to throw');
      } catch (error) {
        assert.ok(error instanceof HookInvocationError);
        assert.strictEqual(error.hookName, 'onLog');
        const cause = error.cause;
        assert.ok(cause instanceof Error);
        assert.strictEqual(cause.message, 'onLog boom');
      }
    });
  });

  void describe('async hook override safety net', () => {
    void it('never produces an unhandled rejection when an async onLog override rejects (regression: the invoke() arrow must return the hook\'s result so HookInvoker can see and route the promise)', async () => {
      const rejectionEvents: unknown[] = [];
      const onUnhandledRejection = (reason: unknown): void => { rejectionEvents.push(reason); };
      process.on('unhandledRejection', onUnhandledRejection);

      class AsyncOnLogLogger extends Logger {
        protected override onLog(): Promise<void> {
          return Promise.reject(new Error('async onLog boom'));
        }
      }

      try {
        const logger = AsyncOnLogLogger.create({ 'level': LOG_LEVEL.TRACE });

        // Logger.emit() does not await/return the hook's promise — the
        // safety net must hold even when the calling site never observes it.
        logger.info(TestFactory.body('msg'));

        await new Promise((resolve) => { setImmediate(resolve); });
        await new Promise((resolve) => { setImmediate(resolve); });
        assert.strictEqual(rejectionEvents.length, 0);
      } finally {
        process.off('unhandledRejection', onUnhandledRejection);
      }
    });
  });
});
