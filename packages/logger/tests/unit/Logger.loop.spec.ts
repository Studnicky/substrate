import { HookInvocationError, RuntimeError } from '@studnicky/errors/node';
import assert from 'node:assert/strict';

import type { LogLevelEntity } from '../../src/entities/LogLevelEntity.js';
import type { LogRecordEntity } from '../../src/entities/LogRecordEntity.js';
import type { TransportInterface } from '../../src/transports/TransportInterface.js';
import type { LoggerScenarioCaseEntity } from './entities/LoggerScenarioCaseEntity.js';

import { LOG_LEVEL } from '../../src/constants/LOG_LEVEL.js';
import { Logger } from '../../src/modules/Logger.js';
import { LoggerOptionGuards } from '../../src/modules/LoggerOptionGuards.js';
import { FunctionTransport } from '../../src/transports/FunctionTransport.js';
import { MemoryTransport } from '../../src/transports/MemoryTransport.js';
import { NoOpTransport } from '../../src/transports/NoOpTransport.js';
import { TestFactory } from '../helpers/TestFactory.js';

class LoggerScenarioDispatcher {
  static async runAsyncOnLogUnhandled(
    _scenarioCase: Extract<LoggerScenarioCaseEntity.Type, { 'shape': 'async-onLog-unhandled' }>
  ): Promise<void> {
    const rejectionEvents: unknown[] = [];
    const onUnhandledRejection = (reason: unknown): void => {
      rejectionEvents.push(reason);
    };
    class AsyncOnLogLogger extends Logger {
      protected override onLog(): Promise<void> {
        const result = Promise.reject(RuntimeError.create('async onLog boom'));
        return result;
      }
    }
    process.on('unhandledRejection', onUnhandledRejection);
    try {
      const logger = AsyncOnLogLogger.create({ 'level': LOG_LEVEL.TRACE });
      logger.info(TestFactory.body('msg'));
      await new Promise((resolve) => {
        setImmediate(resolve);
      });
      await new Promise((resolve) => {
        setImmediate(resolve);
      });
      assert.strictEqual(rejectionEvents.length, 0);
    } finally {
      process.off('unhandledRejection', onUnhandledRejection);
    }
    return;
  }

  static async runAsyncOnTransportError(
    _scenarioCase: Extract<LoggerScenarioCaseEntity.Type, { 'shape': 'async-onTransportError' }>
  ): Promise<void> {
    const deliveries: string[] = [];
    const hookFailure = RuntimeError.create('async onTransportError boom');
    const rejectionEvents: unknown[] = [];
    const onUnhandledRejection = (reason: unknown): void => {
      rejectionEvents.push(reason);
    };
    class AsyncRejectingTransportErrorLogger extends Logger {
      protected override async onTransportError(): Promise<void> {
        await Promise.resolve();
        throw hookFailure;
      }
    }
    const throwingTransport = FunctionTransport.create(() => {
      throw RuntimeError.create('transport write failure');
    });
    const laterTransport = FunctionTransport.create(() => {
      deliveries.push('later');
    });
    process.on('unhandledRejection', onUnhandledRejection);
    try {
      const logger = AsyncRejectingTransportErrorLogger.create({
        'level': LOG_LEVEL.TRACE,
        'transports': [throwingTransport, laterTransport]
      });
      logger.info(TestFactory.body('async-fan-out'));
      assert.deepStrictEqual(deliveries, ['later']);
      await new Promise((resolve) => {
        setImmediate(resolve);
      });
      await new Promise((resolve) => {
        setImmediate(resolve);
      });
      assert.strictEqual(rejectionEvents.length, 0);
      assert.strictEqual(logger.hookErrorCount, 1);
      const [entry] = logger.getHookErrors();
      assert.ok(entry !== undefined);
      assert.strictEqual(entry.hookName, 'onTransportError');
      assert.ok(entry.cause instanceof Error);
      assert.notStrictEqual(entry.cause, hookFailure);
      assert.strictEqual(entry.cause.message, hookFailure.message);
    } finally {
      process.off('unhandledRejection', onUnhandledRejection);
    }
    return;
  }

  static runChildCreateHook(
    _scenarioCase: Extract<LoggerScenarioCaseEntity.Type, { 'shape': 'child-create-hook' }>
  ): void {
    class ThrowingChildLogger extends Logger {
      protected override onChildCreate(): void {
        throw RuntimeError.create('onChildCreate boom');
      }
    }
    const parent = ThrowingChildLogger.create({ 'level': LOG_LEVEL.TRACE });
    assert.throws(() => {
      parent.child({ 'requestId': 'req-1' });
    }, HookInvocationError);
    return;
  }

  static runChildInheritsMetadata(
    _scenarioCase: Extract<LoggerScenarioCaseEntity.Type, { 'shape': 'child-inherits-metadata' }>
  ): void {
    const memory = MemoryTransport.create();
    const parent = Logger.create({
      'level': LOG_LEVEL.TRACE,
      'metadata': { 'service': 'api' },
      'transports': [memory]
    });
    const child = parent.child({ 'requestId': 'req-1' });
    child.info(TestFactory.body('msg'));
    const record = memory.records()[0];
    assert.ok(record !== undefined);
    assert.deepStrictEqual(record.metadata, {
      'requestId': 'req-1',
      'service': 'api'
    });
    return;
  }

  static runChildOverridesMetadata(
    _scenarioCase: Extract<LoggerScenarioCaseEntity.Type, { 'shape': 'child-overrides-metadata' }>
  ): void {
    const memory = MemoryTransport.create();
    const parent = Logger.create({
      'level': LOG_LEVEL.TRACE,
      'metadata': { 'service': 'v1' },
      'transports': [memory]
    });
    const child = parent.child({ 'service': 'v2' });
    child.info(TestFactory.body('msg'));
    const record = memory.records()[0];
    assert.ok(record !== undefined);
    assert.strictEqual(record.metadata.service, 'v2');
    return;
  }

  static runChildSharesTransports(
    _scenarioCase: Extract<LoggerScenarioCaseEntity.Type, { 'shape': 'child-shares-transports' }>
  ): void {
    const memory = MemoryTransport.create();
    const parent = Logger.create({
      'level': LOG_LEVEL.TRACE,
      'transports': [memory]
    });
    const child = parent.child({ 'scope': 'child' });
    parent.info(TestFactory.body('parent-msg'));
    child.info(TestFactory.body('child-msg'));
    assert.strictEqual(memory.records().length, 2);
    return;
  }

  static runChildSnapshotsMetadata(
    _scenarioCase: Extract<LoggerScenarioCaseEntity.Type, { 'shape': 'child-snapshots-metadata' }>
  ): void {
    const memory = MemoryTransport.create();
    const parent = Logger.create({
      'level': LOG_LEVEL.TRACE,
      'metadata': { 'service': 'api' },
      'transports': [memory]
    });
    const attempt = { 'number': 1 };
    const metadata = { 'attempt': attempt, 'requestId': 'req-1' };
    const child = parent.child(metadata);
    metadata.requestId = 'mutated';
    attempt.number = 2;
    child.info(TestFactory.body('msg'));
    assert.deepStrictEqual(memory.records()[0]?.metadata, {
      'attempt': { 'number': 1 },
      'requestId': 'req-1',
      'service': 'api'
    });
    return;
  }

  static runCreateDefault(
    _scenarioCase: Extract<LoggerScenarioCaseEntity.Type, { 'shape': 'create-default' }>
  ): void {
    const droppedLevels: LogLevelEntity.Type[] = [];
    const loggedLevels: LogLevelEntity.Type[] = [];
    class ObservedLogger extends Logger {
      protected override onDropped(level: LogLevelEntity.Type): void {
        droppedLevels.push(level);
      }
      protected override onLog(level: LogLevelEntity.Type): void {
        loggedLevels.push(level);
      }
    }
    const logger = ObservedLogger.create();
    assert.ok(logger instanceof Logger);
    logger.debug(TestFactory.body('debug'));
    logger.info(TestFactory.body('info'));
    assert.deepStrictEqual(droppedLevels, [LOG_LEVEL.DEBUG]);
    assert.deepStrictEqual(loggedLevels, [LOG_LEVEL.INFO]);
    return;
  }

  static runCreateInvalidMetadata(
    _scenarioCase: Extract<LoggerScenarioCaseEntity.Type, { 'shape': 'create-invalid-metadata' }>
  ): void {
    assert.strictEqual(LoggerOptionGuards.isValidMetadata('not-an-object'), false);
    return;
  }

  static runCreateInvalidTransports(
    _scenarioCase: Extract<LoggerScenarioCaseEntity.Type, { 'shape': 'create-invalid-transports' }>
  ): void {
    assert.strictEqual(LoggerOptionGuards.isValidTransports('not-an-array'), false);
    return;
  }

  static runCreateNumericLevel(
    scenarioCase: Extract<LoggerScenarioCaseEntity.Type, { 'shape': 'create-numeric-level' }>
  ): void {
    const droppedLevels: LogLevelEntity.Type[] = [];
    const loggedLevels: LogLevelEntity.Type[] = [];
    class ObservedLogger extends Logger {
      protected override onDropped(level: LogLevelEntity.Type): void {
        droppedLevels.push(level);
      }
      protected override onLog(level: LogLevelEntity.Type): void {
        loggedLevels.push(level);
      }
    }
    const logger = ObservedLogger.create({ 'level': scenarioCase.level });
    assert.ok(logger instanceof Logger);
    logger.trace(TestFactory.body('trace'));
    logger.debug(TestFactory.body('debug'));
    assert.deepStrictEqual(droppedLevels, [LOG_LEVEL.TRACE]);
    assert.deepStrictEqual(loggedLevels, [LOG_LEVEL.DEBUG]);
    return;
  }

  static runCreateStringLevel(
    scenarioCase: Extract<LoggerScenarioCaseEntity.Type, { 'shape': 'create-string-level' }>
  ): void {
    const droppedLevels: LogLevelEntity.Type[] = [];
    const loggedLevels: LogLevelEntity.Type[] = [];
    class ObservedLogger extends Logger {
      protected override onDropped(level: LogLevelEntity.Type): void {
        droppedLevels.push(level);
      }
      protected override onLog(level: LogLevelEntity.Type): void {
        loggedLevels.push(level);
      }
    }
    const logger = ObservedLogger.create({ 'level': scenarioCase.level });
    assert.ok(logger instanceof Logger);
    logger.trace(TestFactory.body('trace'));
    logger.debug(TestFactory.body('debug'));
    assert.deepStrictEqual(droppedLevels, [LOG_LEVEL.TRACE]);
    assert.deepStrictEqual(loggedLevels, [LOG_LEVEL.DEBUG]);
    return;
  }

  static runCreateWithMetadata(
    scenarioCase: Extract<LoggerScenarioCaseEntity.Type, { 'shape': 'create-with-metadata' }>
  ): void {
    const logger = Logger.create({ 'metadata': scenarioCase.metadata });
    const memory = MemoryTransport.create();
    const childLogger = logger.child({});
    const testLogger = Logger.create({
      'level': scenarioCase.level,
      'metadata': scenarioCase.metadata,
      'transports': [memory]
    });
    testLogger.info(TestFactory.body('msg'));
    const records = memory.records();
    assert.strictEqual(records.length, 1);
    assert.deepStrictEqual(records[0]?.metadata, scenarioCase.metadata);
    assert.ok(typeof childLogger.info === 'function');
    return;
  }

  static runFanoutMultipleTransports(
    _scenarioCase: Extract<LoggerScenarioCaseEntity.Type, { 'shape': 'fanout-multiple-transports' }>
  ): void {
    const memory1 = MemoryTransport.create();
    const memory2 = MemoryTransport.create();
    const logger = Logger.create({
      'level': LOG_LEVEL.TRACE,
      'transports': [memory1, memory2]
    });
    logger.info(TestFactory.body('msg'));
    assert.strictEqual(memory1.records().length, 1);
    assert.strictEqual(memory2.records().length, 1);
    return;
  }

  static runFanoutOnTransportErrorThrows(
    _scenarioCase: Extract<
      LoggerScenarioCaseEntity.Type,
      { 'shape': 'fanout-onTransportError-throws' }
    >
  ): void {
    const received: number[] = [];
    class ThrowingTransportErrorLogger extends Logger {
      protected override onTransportError(): void {
        throw RuntimeError.create('onTransportError boom');
      }
    }
    const throwingTransport = FunctionTransport.create(() => {
      throw RuntimeError.create('transport failure');
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
    assert.strictEqual(received.length, 1);
    assert.strictEqual(logger.hookErrorCount, 1);
    assert.strictEqual(logger.getHookErrors()[0]?.hookName, 'onTransportError');
    return;
  }

  static runFanoutTransportThrows(
    _scenarioCase: Extract<LoggerScenarioCaseEntity.Type, { 'shape': 'fanout-transport-throws' }>
  ): void {
    const received: number[] = [];
    const throwingTransport = FunctionTransport.create(() => {
      throw RuntimeError.create('transport failure');
    });
    const countingTransport = FunctionTransport.create(() => {
      received.push(1);
    });
    const logger = Logger.create({
      'level': LOG_LEVEL.TRACE,
      'transports': [throwingTransport, countingTransport]
    });
    logger.info(TestFactory.body('msg'));
    assert.strictEqual(received.length, 1);
    return;
  }

  static runFunctionTransportBridge(
    _scenarioCase: Extract<LoggerScenarioCaseEntity.Type, { 'shape': 'function-transport-bridge' }>
  ): void {
    const captured: LogRecordEntity.Type[] = [];
    const transport = FunctionTransport.create((record) => {
      captured.push(record);
    });
    const logger = Logger.create({
      'level': LOG_LEVEL.TRACE,
      'transports': [transport]
    });
    const body = TestFactory.body('bridge-test');
    logger.info(body);
    assert.strictEqual(captured.length, 1);
    assert.strictEqual(captured[0]?.data, body);
    return;
  }

  static runGlobalFloor(
    scenarioCase: Extract<LoggerScenarioCaseEntity.Type, { 'shape': 'global-floor' }>
  ): void {
    const memory = MemoryTransport.create();
    const logger = Logger.create({
      'level': scenarioCase.level,
      'transports': [memory]
    });
    logger.trace(TestFactory.body('trace'));
    logger.debug(TestFactory.body('debug'));
    logger.info(TestFactory.body('info'));
    logger.warn(TestFactory.body('warn'));
    logger.error(TestFactory.body('error'));
    const records = memory.records();
    assert.strictEqual(records.length, scenarioCase.expectedCount);
    assert.deepStrictEqual(
      records.map((record) => {
        return record.level;
      }),
      scenarioCase.expectedLevels
    );
    return;
  }

  static runGrandchildMergesMetadata(
    _scenarioCase: Extract<LoggerScenarioCaseEntity.Type, { 'shape': 'grandchild-merges-metadata' }>
  ): void {
    const memory = MemoryTransport.create();
    const parent = Logger.create({
      'level': LOG_LEVEL.TRACE,
      'metadata': { 'service': 'api' },
      'transports': [memory]
    });
    const child = parent.child({ 'requestId': 'req-1' });
    const grandchild = child.child({ 'operation': 'upload' });
    grandchild.info(TestFactory.body('msg'));
    const record = memory.records()[0];
    assert.ok(record !== undefined);
    assert.deepStrictEqual(record.metadata, {
      'operation': 'upload',
      'requestId': 'req-1',
      'service': 'api'
    });
    return;
  }

  static runHookInvocationErrorCause(
    _scenarioCase: Extract<LoggerScenarioCaseEntity.Type, { 'shape': 'hook-invocation-error-cause' }>
  ): void {
    class ThrowingLogLogger extends Logger {
      protected override onLog(): void {
        throw RuntimeError.create('onLog boom');
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
    return;
  }

  static runNoTransportsSilent(
    _scenarioCase: Extract<LoggerScenarioCaseEntity.Type, { 'shape': 'no-transports-silent' }>
  ): void {
    const logger = Logger.create({ 'level': 'trace' });
    assert.doesNotThrow(() => {
      logger.trace(TestFactory.body('t'));
      logger.debug(TestFactory.body('d'));
      logger.info(TestFactory.body('i'));
      logger.warn(TestFactory.body('w'));
      logger.error(TestFactory.body('e'));
    });
    return;
  }

  static runNoopTransportSilence(
    _scenarioCase: Extract<LoggerScenarioCaseEntity.Type, { 'shape': 'noop-transport-silence' }>
  ): void {
    const noop = NoOpTransport.create();
    const logger = Logger.create({
      'level': LOG_LEVEL.TRACE,
      'transports': [noop]
    });
    assert.doesNotThrow(() => {
      logger.trace(TestFactory.body('t'));
      logger.debug(TestFactory.body('d'));
      logger.info(TestFactory.body('i'));
      logger.warn(TestFactory.body('w'));
      logger.error(TestFactory.body('e'));
    });
    return;
  }

  static runOnChildCreateBindings(
    _scenarioCase: Extract<LoggerScenarioCaseEntity.Type, { 'shape': 'onChildCreate-bindings' }>
  ): void {
    const capturedBindings: LogRecordEntity.Type['metadata'][] = [];
    class ObservedLogger extends Logger {
      constructor() {
        super({ 'metadata': { 'service': 'api' } });
      }
      protected override onChildCreate(bindings: LogRecordEntity.Type['metadata']): void {
        capturedBindings.push(bindings);
      }
    }
    const logger = new ObservedLogger();
    logger.child({ 'requestId': 'xyz' });
    assert.deepStrictEqual(capturedBindings[0], { 'requestId': 'xyz' });
    return;
  }

  static runOnChildCreateHooks(
    _scenarioCase: Extract<LoggerScenarioCaseEntity.Type, { 'shape': 'onChildCreate-hooks' }>
  ): void {
    const capturedBindings: LogRecordEntity.Type['metadata'][] = [];
    class ObservedLogger extends Logger {
      constructor() {
        super({});
      }
      protected override onChildCreate(bindings: LogRecordEntity.Type['metadata']): void {
        capturedBindings.push(bindings);
      }
    }
    const logger = new ObservedLogger();
    logger.child({ 'requestId': 'abc' });
    assert.strictEqual(capturedBindings.length, 1);
    assert.deepStrictEqual(capturedBindings[0], { 'requestId': 'abc' });
    return;
  }

  static runOnDroppedAtFloor(
    _scenarioCase: Extract<LoggerScenarioCaseEntity.Type, { 'shape': 'onDropped-at-floor' }>
  ): void {
    const droppedLevels: LogLevelEntity.Type[] = [];
    class ObservedLogger extends Logger {
      constructor() {
        super({ 'level': LOG_LEVEL.INFO });
      }
      protected override onDropped(level: LogLevelEntity.Type): void {
        droppedLevels.push(level);
      }
    }
    const logger = new ObservedLogger();
    logger.info(TestFactory.body('passes'));
    logger.warn(TestFactory.body('passes'));
    assert.strictEqual(droppedLevels.length, 0);
    return;
  }

  static runOnDroppedBelowFloor(
    _scenarioCase: Extract<LoggerScenarioCaseEntity.Type, { 'shape': 'onDropped-below-floor' }>
  ): void {
    const droppedLevels: LogLevelEntity.Type[] = [];
    class ObservedLogger extends Logger {
      constructor() {
        super({ 'level': LOG_LEVEL.INFO });
      }
      protected override onDropped(level: LogLevelEntity.Type): void {
        droppedLevels.push(level);
      }
    }
    const logger = new ObservedLogger();
    logger.debug(TestFactory.body('dropped'));
    assert.strictEqual(droppedLevels.length, 1);
    assert.strictEqual(droppedLevels[0], LOG_LEVEL.DEBUG);
    return;
  }

  static runOnDroppedHookError(
    _scenarioCase: Extract<LoggerScenarioCaseEntity.Type, { 'shape': 'onDropped-hook-error' }>
  ): void {
    class ThrowingDroppedLogger extends Logger {
      constructor() {
        super({ 'level': LOG_LEVEL.ERROR });
      }
      protected override onDropped(): void {
        throw RuntimeError.create('onDropped boom');
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
    return;
  }

  static runOnDroppedTraceDebug(
    _scenarioCase: Extract<LoggerScenarioCaseEntity.Type, { 'shape': 'onDropped-trace-debug' }>
  ): void {
    const droppedLevels: LogLevelEntity.Type[] = [];
    class ObservedLogger extends Logger {
      constructor() {
        super({ 'level': LOG_LEVEL.INFO });
      }
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
    return;
  }

  static runOnLogAssembledRecord(
    _scenarioCase: Extract<LoggerScenarioCaseEntity.Type, { 'shape': 'onLog-assembled-record' }>
  ): void {
    const captured: LogRecordEntity.Type[] = [];
    class ObservedLogger extends Logger {
      constructor() {
        super({ 'level': LOG_LEVEL.TRACE, 'metadata': { 'service': 'test' } });
      }
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
    return;
  }

  static runOnLogBeforeTransport(
    _scenarioCase: Extract<LoggerScenarioCaseEntity.Type, { 'shape': 'onLog-before-transport' }>
  ): void {
    const loggedLevels: LogLevelEntity.Type[] = [];
    const loggedRecords: LogRecordEntity.Type[] = [];
    class ObservedLogger extends Logger {
      constructor() {
        super({ 'level': LOG_LEVEL.TRACE });
      }
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
    return;
  }

  static runOnTransportErrorDetachedCause(
    _scenarioCase: Extract<
      LoggerScenarioCaseEntity.Type,
      { 'shape': 'onTransportError-detached-cause' }
    >
  ): void {
    const hookFailure = RuntimeError.create('onTransportError boom', {
      'cause': { 'transports': ['primary'] }
    });
    class ThrowingTransportErrorLogger extends Logger {
      protected override onTransportError(): void {
        throw hookFailure;
      }
    }
    const throwingTransport = FunctionTransport.create(() => {
      throw RuntimeError.create('transport boom');
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
    const firstTransports: unknown = Reflect.get(firstDetails, 'transports');
    assert.ok(Array.isArray(firstTransports));
    firstTransports.push('secondary');
    const secondCause = logger.getHookErrors()[0]?.cause;
    assert.ok(secondCause instanceof Error);
    assert.strictEqual(secondCause.message, 'onTransportError boom');
    assert.deepStrictEqual(secondCause.cause, { 'transports': ['primary'] });
    assert.strictEqual(logger.hookErrorCount, 1);
    return;
  }

  static runOnTransportErrorEachFailure(
    _scenarioCase: Extract<
      LoggerScenarioCaseEntity.Type,
      { 'shape': 'onTransportError-each-failure' }
    >
  ): void {
    const errors: Error[] = [];
    class ObservedLogger extends Logger {
      constructor() {
        const throwing1 = FunctionTransport.create(() => {
          throw RuntimeError.create('first');
        });
        const throwing2 = FunctionTransport.create(() => {
          throw RuntimeError.create('second');
        });
        super({ 'level': LOG_LEVEL.TRACE, 'transports': [throwing1, throwing2] });
      }
      protected override onTransportError(
        _transport: TransportInterface,
        _record: LogRecordEntity.Type,
        error: Error
      ): void {
        errors.push(error);
      }
    }
    const logger = new ObservedLogger();
    logger.info(TestFactory.body('multi-error'));
    assert.strictEqual(errors.length, 2);
    return;
  }

  static runOnTransportErrorFanoutContinues(
    _scenarioCase: Extract<
      LoggerScenarioCaseEntity.Type,
      { 'shape': 'onTransportError-fanout-continues' }
    >
  ): void {
    const deliveries: string[] = [];
    class ThrowingTransportErrorLogger extends Logger {
      protected override onTransportError(): void {
        throw RuntimeError.create('onTransportError boom');
      }
    }
    const transport1 = FunctionTransport.create(() => {
      deliveries.push('t1');
    });
    const transport2 = FunctionTransport.create(() => {
      throw RuntimeError.create('t2 write failure');
    });
    const transport3 = FunctionTransport.create(() => {
      deliveries.push('t3');
    });
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
    return;
  }

  static runOnTransportErrorFires(
    _scenarioCase: Extract<LoggerScenarioCaseEntity.Type, { 'shape': 'onTransportError-fires' }>
  ): void {
    const errors: Error[] = [];
    const capturedTransports: TransportInterface[] = [];
    class ObservedLogger extends Logger {
      constructor() {
        const throwing = FunctionTransport.create(() => {
          throw RuntimeError.create('transport boom');
        });
        super({ 'level': LOG_LEVEL.TRACE, 'transports': [throwing] });
        capturedTransports.push(throwing);
      }
      protected override onTransportError(
        _transport: TransportInterface,
        _record: LogRecordEntity.Type,
        error: Error
      ): void {
        errors.push(error);
      }
    }
    const logger = new ObservedLogger();
    logger.info(TestFactory.body('boom'));
    assert.strictEqual(errors.length, 1);
    const [firstError] = errors;
    assert.ok(firstError !== undefined);
    assert.strictEqual(firstError.message, 'transport boom');
    assert.strictEqual(capturedTransports.length, 1);
    return;
  }

  static runOnTransportErrorIsolation(
    _scenarioCase: Extract<LoggerScenarioCaseEntity.Type, { 'shape': 'onTransportError-isolation' }>
  ): void {
    class ThrowingTransportErrorLogger extends Logger {
      readonly hookFailure = RuntimeError.create('onTransportError boom');
      constructor() {
        const throwing = FunctionTransport.create(() => {
          throw RuntimeError.create('transport boom');
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
    return;
  }

  static runOnTransportErrorSucceeds(
    _scenarioCase: Extract<LoggerScenarioCaseEntity.Type, { 'shape': 'onTransportError-succeeds' }>
  ): void {
    const errors: Error[] = [];
    class ObservedLogger extends Logger {
      constructor() {
        const memory = MemoryTransport.create();
        super({ 'level': LOG_LEVEL.TRACE, 'transports': [memory] });
      }
      protected override onTransportError(
        _transport: TransportInterface,
        _record: LogRecordEntity.Type,
        error: Error
      ): void {
        errors.push(error);
      }
    }
    const logger = new ObservedLogger();
    logger.info(TestFactory.body('ok'));
    assert.strictEqual(errors.length, 0);
    return;
  }

  static runRecordLevelMapping(
    _scenarioCase: Extract<LoggerScenarioCaseEntity.Type, { 'shape': 'record-level-mapping' }>
  ): void {
    const memory = MemoryTransport.create();
    const logger = Logger.create({
      'level': LOG_LEVEL.TRACE,
      'transports': [memory]
    });
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
    return;
  }

  static runRecordOnLogThrows(
    _scenarioCase: Extract<LoggerScenarioCaseEntity.Type, { 'shape': 'record-onLog-throws' }>
  ): void {
    class ThrowingLogLogger extends Logger {
      protected override onLog(): void {
        throw RuntimeError.create('onLog boom');
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
    return;
  }

  static runRecordShape(
    _scenarioCase: Extract<LoggerScenarioCaseEntity.Type, { 'shape': 'record-shape' }>
  ): void {
    const memory = MemoryTransport.create();
    const logger = Logger.create({
      'level': LOG_LEVEL.TRACE,
      'metadata': { 'service': 'test' },
      'transports': [memory]
    });
    const before = Date.now();
    const body = TestFactory.body('hello', { 'extra': 'ctx' });
    logger.info(body);
    const after = Date.now();
    const record = memory.records()[0];
    assert.ok(record !== undefined);
    assert.strictEqual(record.level, LOG_LEVEL.INFO);
    assert.ok(record.time >= before);
    assert.ok(record.time <= after);
    assert.deepStrictEqual(record.metadata, { 'service': 'test' });
    assert.deepStrictEqual(record.data, body);
    assert.notStrictEqual(record.data, body);
    return;
  }

  static runSnapshotMetadataAndTransports(
    _scenarioCase: Extract<
      LoggerScenarioCaseEntity.Type,
      { 'shape': 'snapshot-metadata-and-transports' }
    >
  ): void {
    const configuredTransport = MemoryTransport.create();
    const addedTransport = MemoryTransport.create();
    const transports: TransportInterface[] = [configuredTransport];
    const region = { 'name': 'east' };
    const metadata = { 'region': region, 'service': 'api' };
    const logger = Logger.create({
      'level': LOG_LEVEL.TRACE,
      'metadata': metadata,
      'transports': transports
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
    return;
  }

  static runTransportFloorMixed(
    scenarioCase: Extract<LoggerScenarioCaseEntity.Type, { 'shape': 'transport-floor-mixed' }>
  ): void {
    const debugMemory = MemoryTransport.create({
      'level': scenarioCase.transportLevels.debug
    });
    const errorMemory = MemoryTransport.create({
      'level': scenarioCase.transportLevels.error
    });
    const logger = Logger.create({
      'level': scenarioCase.loggerLevel,
      'transports': [debugMemory, errorMemory]
    });
    logger.debug(TestFactory.body('d'));
    logger.info(TestFactory.body('i'));
    logger.warn(TestFactory.body('w'));
    logger.error(TestFactory.body('e'));
    assert.strictEqual(debugMemory.records().length, scenarioCase.expectedCounts.debug);
    assert.strictEqual(errorMemory.records().length, scenarioCase.expectedCounts.error);
    assert.strictEqual(errorMemory.records()[0]?.level, scenarioCase.transportLevels.error);
    return;
  }

  static runTransportFloorWarn(
    scenarioCase: Extract<LoggerScenarioCaseEntity.Type, { 'shape': 'transport-floor-warn' }>
  ): void {
    const allMemory = MemoryTransport.create({
      'level': scenarioCase.transportLevels.all
    });
    const warnMemory = MemoryTransport.create({
      'level': scenarioCase.transportLevels.warn
    });
    const logger = Logger.create({
      'level': scenarioCase.loggerLevel,
      'transports': [allMemory, warnMemory]
    });
    logger.debug(TestFactory.body('debug'));
    logger.info(TestFactory.body('info'));
    logger.warn(TestFactory.body('warn'));
    logger.error(TestFactory.body('error'));
    assert.strictEqual(allMemory.records().length, scenarioCase.expectedCounts.all);
    assert.strictEqual(warnMemory.records().length, scenarioCase.expectedCounts.warn);
    assert.deepStrictEqual(
      allMemory.records().map((record) => {
        return record.level;
      }),
      scenarioCase.expectedLevels.all
    );
    assert.deepStrictEqual(
      warnMemory.records().map((record) => {
        return record.level;
      }),
      scenarioCase.expectedLevels.warn
    );
    return;
  }

  static async runCase<Shape extends LoggerScenarioCaseEntity.Type['shape']>(
    shape: Shape,
    scenarioCase: Extract<LoggerScenarioCaseEntity.Type, { 'shape': Shape }>
  ): Promise<void> {
    await runnerMap[shape](scenarioCase);
  }
}

const runnerMap: {
  [Shape in LoggerScenarioCaseEntity.Type['shape']]: (
    scenarioCase: Extract<LoggerScenarioCaseEntity.Type, { 'shape': Shape }>
  ) => Promise<void> | void;
} = {
  'async-onLog-unhandled': LoggerScenarioDispatcher.runAsyncOnLogUnhandled,
  'async-onTransportError': LoggerScenarioDispatcher.runAsyncOnTransportError,
  'child-create-hook': LoggerScenarioDispatcher.runChildCreateHook,
  'child-inherits-metadata': LoggerScenarioDispatcher.runChildInheritsMetadata,
  'child-overrides-metadata': LoggerScenarioDispatcher.runChildOverridesMetadata,
  'child-shares-transports': LoggerScenarioDispatcher.runChildSharesTransports,
  'child-snapshots-metadata': LoggerScenarioDispatcher.runChildSnapshotsMetadata,
  'create-default': LoggerScenarioDispatcher.runCreateDefault,
  'create-invalid-metadata': LoggerScenarioDispatcher.runCreateInvalidMetadata,
  'create-invalid-transports': LoggerScenarioDispatcher.runCreateInvalidTransports,
  'create-numeric-level': LoggerScenarioDispatcher.runCreateNumericLevel,
  'create-string-level': LoggerScenarioDispatcher.runCreateStringLevel,
  'create-with-metadata': LoggerScenarioDispatcher.runCreateWithMetadata,
  'fanout-multiple-transports': LoggerScenarioDispatcher.runFanoutMultipleTransports,
  'fanout-onTransportError-throws': LoggerScenarioDispatcher.runFanoutOnTransportErrorThrows,
  'fanout-transport-throws': LoggerScenarioDispatcher.runFanoutTransportThrows,
  'function-transport-bridge': LoggerScenarioDispatcher.runFunctionTransportBridge,
  'global-floor': LoggerScenarioDispatcher.runGlobalFloor,
  'grandchild-merges-metadata': LoggerScenarioDispatcher.runGrandchildMergesMetadata,
  'hook-invocation-error-cause': LoggerScenarioDispatcher.runHookInvocationErrorCause,
  'no-transports-silent': LoggerScenarioDispatcher.runNoTransportsSilent,
  'noop-transport-silence': LoggerScenarioDispatcher.runNoopTransportSilence,
  'onChildCreate-bindings': LoggerScenarioDispatcher.runOnChildCreateBindings,
  'onChildCreate-hooks': LoggerScenarioDispatcher.runOnChildCreateHooks,
  'onDropped-at-floor': LoggerScenarioDispatcher.runOnDroppedAtFloor,
  'onDropped-below-floor': LoggerScenarioDispatcher.runOnDroppedBelowFloor,
  'onDropped-hook-error': LoggerScenarioDispatcher.runOnDroppedHookError,
  'onDropped-trace-debug': LoggerScenarioDispatcher.runOnDroppedTraceDebug,
  'onLog-assembled-record': LoggerScenarioDispatcher.runOnLogAssembledRecord,
  'onLog-before-transport': LoggerScenarioDispatcher.runOnLogBeforeTransport,
  'onTransportError-detached-cause': LoggerScenarioDispatcher.runOnTransportErrorDetachedCause,
  'onTransportError-each-failure': LoggerScenarioDispatcher.runOnTransportErrorEachFailure,
  'onTransportError-fanout-continues': LoggerScenarioDispatcher.runOnTransportErrorFanoutContinues,
  'onTransportError-fires': LoggerScenarioDispatcher.runOnTransportErrorFires,
  'onTransportError-isolation': LoggerScenarioDispatcher.runOnTransportErrorIsolation,
  'onTransportError-succeeds': LoggerScenarioDispatcher.runOnTransportErrorSucceeds,
  'record-level-mapping': LoggerScenarioDispatcher.runRecordLevelMapping,
  'record-onLog-throws': LoggerScenarioDispatcher.runRecordOnLogThrows,
  'record-shape': LoggerScenarioDispatcher.runRecordShape,
  'snapshot-metadata-and-transports': LoggerScenarioDispatcher.runSnapshotMetadataAndTransports,
  'transport-floor-mixed': LoggerScenarioDispatcher.runTransportFloorMixed,
  'transport-floor-warn': LoggerScenarioDispatcher.runTransportFloorWarn
};
