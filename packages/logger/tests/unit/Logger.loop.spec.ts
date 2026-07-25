import assert from 'node:assert/strict';
import {
  describe, it
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

import { TestFactory } from '../helpers/TestFactory.js';
import scenarioGroups from './Logger.scenarios.json';

type ScenarioCase =
  | { description: string; expected: { asserted: boolean }; shape: 'create-default'; name: string }
  | { description: string; expected: { asserted: boolean }; shape: 'create-string-level'; level: 'debug'; name: string }
  | { description: string; expected: { asserted: boolean }; shape: 'create-numeric-level'; level: LogLevelEntity.Type; name: string }
  | { description: string; expected: { asserted: boolean }; shape: 'create-with-metadata'; level: LogLevelEntity.Type; metadata: LogMetadataInterface; name: string }
  | { description: string; expected: { asserted: boolean }; shape: 'create-invalid-metadata'; name: string }
  | { description: string; expected: { asserted: boolean }; expectedMessage: string; shape: 'create-invalid-transports'; name: string }
  | { description: string; expected: { asserted: boolean }; shape: 'snapshot-metadata-and-transports'; name: string }
  | { description: string; expected: { asserted: boolean }; expectedCount: number; shape: 'global-floor'; level: number; name: string }
  | {
      description: string;
      expected: { asserted: boolean };
      expectedCounts: {
        all: number;
        warn: number;
      };
      shape: 'transport-floor-warn';
      loggerLevel: LogLevelEntity.Type;
      name: string;
      transportLevels: {
        all: LogLevelEntity.Type;
        warn: LogLevelEntity.Type;
      };
    }
  | {
      description: string;
      expected: { asserted: boolean };
      expectedCounts: {
        debug: number;
        error: number;
      };
      shape: 'transport-floor-mixed';
      loggerLevel: LogLevelEntity.Type;
      name: string;
      transportLevels: {
        debug: LogLevelEntity.Type;
        error: LogLevelEntity.Type;
      };
    }
  | { description: string; expected: { asserted: boolean }; shape: 'fanout-multiple-transports'; name: string }
  | { description: string; expected: { asserted: boolean }; shape: 'fanout-transport-throws'; name: string }
  | { description: string; expected: { asserted: boolean }; shape: 'fanout-onTransportError-throws'; name: string }
  | { description: string; expected: { asserted: boolean }; shape: 'child-inherits-metadata'; name: string }
  | { description: string; expected: { asserted: boolean }; shape: 'child-overrides-metadata'; name: string }
  | { description: string; expected: { asserted: boolean }; shape: 'grandchild-merges-metadata'; name: string }
  | { description: string; expected: { asserted: boolean }; shape: 'child-shares-transports'; name: string }
  | { description: string; expected: { asserted: boolean }; shape: 'child-snapshots-metadata'; name: string }
  | { description: string; expected: { asserted: boolean }; shape: 'child-create-hook'; name: string }
  | { description: string; expected: { asserted: boolean }; shape: 'record-shape'; name: string }
  | { description: string; expected: { asserted: boolean }; shape: 'record-level-mapping'; name: string }
  | { description: string; expected: { asserted: boolean }; shape: 'record-onLog-throws'; name: string }
  | { description: string; expected: { asserted: boolean }; shape: 'function-transport-bridge'; name: string }
  | { description: string; expected: { asserted: boolean }; shape: 'noop-transport-silence'; name: string }
  | { description: string; expected: { asserted: boolean }; shape: 'no-transports-silent'; name: string }
  | { description: string; expected: { asserted: boolean }; shape: 'onLog-before-transport'; name: string }
  | { description: string; expected: { asserted: boolean }; shape: 'onLog-assembled-record'; name: string }
  | { description: string; expected: { asserted: boolean }; shape: 'onDropped-below-floor'; name: string }
  | { description: string; expected: { asserted: boolean }; shape: 'onDropped-at-floor'; name: string }
  | { description: string; expected: { asserted: boolean }; shape: 'onDropped-trace-debug'; name: string }
  | { description: string; expected: { asserted: boolean }; shape: 'onDropped-hook-error'; name: string }
  | { description: string; expected: { asserted: boolean }; shape: 'onChildCreate-hooks'; name: string }
  | { description: string; expected: { asserted: boolean }; shape: 'onChildCreate-bindings'; name: string }
  | { description: string; expected: { asserted: boolean }; shape: 'onTransportError-fires'; name: string }
  | { description: string; expected: { asserted: boolean }; shape: 'onTransportError-succeeds'; name: string }
  | { description: string; expected: { asserted: boolean }; shape: 'onTransportError-each-failure'; name: string }
  | { description: string; expected: { asserted: boolean }; shape: 'onTransportError-isolation'; name: string }
  | { description: string; expected: { asserted: boolean }; shape: 'onTransportError-detached-cause'; name: string }
  | { description: string; expected: { asserted: boolean }; shape: 'onTransportError-fanout-continues'; name: string }
  | { description: string; expected: { asserted: boolean }; shape: 'async-onTransportError'; name: string }
  | { description: string; expected: { asserted: boolean }; shape: 'hook-invocation-error-cause'; name: string }
  | { description: string; expected: { asserted: boolean }; shape: 'async-onLog-unhandled'; name: string };

type ScenarioShape = ScenarioCase['shape'];
type ScenarioCaseByShape = {
  [Shape in ScenarioShape]: Extract<ScenarioCase, { shape: Shape }>;
};
type ScenarioRunner<Shape extends ScenarioShape> = (scenarioCase: ScenarioCaseByShape[Shape]) => Promise<void> | void;
type ScenarioRunnerMap = {
  [Shape in ScenarioShape]: ScenarioRunner<Shape>;
};

const runnerMap: ScenarioRunnerMap = {
  'create-default': (scenarioCase) => {
    const logger = Logger.create();
    assert.ok(logger instanceof Logger);
    assert.strictEqual(scenarioCase.expected.asserted, true);
    return;
  },

  'create-string-level': (scenarioCase) => {
    const logger = Logger.create({ level: scenarioCase.level });
    assert.ok(logger instanceof Logger);
    assert.strictEqual(scenarioCase.expected.asserted, true);
    return;
  },

  'create-numeric-level': (scenarioCase) => {
    const logger = Logger.create({ level: scenarioCase.level });
    assert.ok(logger instanceof Logger);
    assert.strictEqual(scenarioCase.expected.asserted, true);
    return;
  },

  'create-with-metadata': (scenarioCase) => {
    const logger = Logger.create({ metadata: scenarioCase.metadata });
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
    assert.strictEqual(scenarioCase.expected.asserted, true);
    return;
  },

  'create-invalid-metadata': (scenarioCase) => {
    assert.throws(() => {
      Reflect.apply(Logger.create, Logger, [{ 'metadata': 'not-an-object' }]);
    }, ConfigurationError);
    assert.strictEqual(scenarioCase.expected.asserted, true);
    return;
  },

  'create-invalid-transports': (scenarioCase) => {
    assert.throws(
      () => {
        Reflect.apply(Logger.create, Logger, [{ 'transports': 'not-an-array' }]);
      },
      {
        'message': scenarioCase.expectedMessage,
        'name': 'ConfigurationError'
      }
    );
    assert.strictEqual(scenarioCase.expected.asserted, true);
    return;
  },

  'snapshot-metadata-and-transports': (scenarioCase) => {
    const configuredTransport = MemoryTransport.create();
    const addedTransport = MemoryTransport.create();
    const transports: TransportInterface[] = [configuredTransport];
    const region = { 'name': 'east' };
    const metadata = { region, 'service': 'api' };
    const logger = Logger.create({ 'level': LOG_LEVEL.TRACE, metadata, transports });
    metadata.service = 'mutated';
    region.name = 'west';
    transports.push(addedTransport);
    logger.info(TestFactory.body('owned'));
    assert.deepStrictEqual(configuredTransport.records()[0]?.metadata, { 'region': { 'name': 'east' }, 'service': 'api' });
    assert.strictEqual(addedTransport.records().length, 0);
    assert.strictEqual(scenarioCase.expected.asserted, true);
    return;
  },

  'global-floor': (scenarioCase) => {
    const memory = MemoryTransport.create();
    const logger = Logger.create({ level: scenarioCase.level, 'transports': [memory] });
    logger.trace(TestFactory.body('trace'));
    logger.debug(TestFactory.body('debug'));
    logger.info(TestFactory.body('info'));
    logger.warn(TestFactory.body('warn'));
    logger.error(TestFactory.body('error'));
    assert.strictEqual(memory.records().length, scenarioCase.expectedCount);
    assert.strictEqual(scenarioCase.expected.asserted, true);
    return;
  },

  'transport-floor-warn': (scenarioCase) => {
    const allMemory = MemoryTransport.create({ level: scenarioCase.transportLevels.all });
    const warnMemory = MemoryTransport.create({ level: scenarioCase.transportLevels.warn });
    const logger = Logger.create({ 'level': scenarioCase.loggerLevel, 'transports': [allMemory, warnMemory] });
    logger.debug(TestFactory.body('debug'));
    logger.info(TestFactory.body('info'));
    logger.warn(TestFactory.body('warn'));
    logger.error(TestFactory.body('error'));
    assert.strictEqual(allMemory.records().length, scenarioCase.expectedCounts.all);
    assert.strictEqual(warnMemory.records().length, scenarioCase.expectedCounts.warn);
    assert.strictEqual(scenarioCase.expected.asserted, true);
    return;
  },

  'transport-floor-mixed': (scenarioCase) => {
    const debugMemory = MemoryTransport.create({ level: scenarioCase.transportLevels.debug });
    const errorMemory = MemoryTransport.create({ level: scenarioCase.transportLevels.error });
    const logger = Logger.create({ 'level': scenarioCase.loggerLevel, 'transports': [debugMemory, errorMemory] });
    logger.debug(TestFactory.body('d'));
    logger.info(TestFactory.body('i'));
    logger.warn(TestFactory.body('w'));
    logger.error(TestFactory.body('e'));
    assert.strictEqual(debugMemory.records().length, scenarioCase.expectedCounts.debug);
    assert.strictEqual(errorMemory.records().length, scenarioCase.expectedCounts.error);
    assert.strictEqual(errorMemory.records()[0]?.level, scenarioCase.transportLevels.error);
    assert.strictEqual(scenarioCase.expected.asserted, true);
    return;
  },

  'fanout-multiple-transports': (scenarioCase) => {
    const memory1 = MemoryTransport.create();
    const memory2 = MemoryTransport.create();
    const logger = Logger.create({ 'level': LOG_LEVEL.TRACE, 'transports': [memory1, memory2] });
    logger.info(TestFactory.body('msg'));
    assert.strictEqual(memory1.records().length, 1);
    assert.strictEqual(memory2.records().length, 1);
    assert.strictEqual(scenarioCase.expected.asserted, true);
    return;
  },

  'fanout-transport-throws': (scenarioCase) => {
    const received: number[] = [];
    const throwingTransport = FunctionTransport.create(() => { throw new Error('transport failure'); });
    const countingTransport = FunctionTransport.create(() => { received.push(1); });
    const logger = Logger.create({ 'level': LOG_LEVEL.TRACE, 'transports': [throwingTransport, countingTransport] });
    logger.info(TestFactory.body('msg'));
    assert.strictEqual(received.length, 1);
    assert.strictEqual(scenarioCase.expected.asserted, true);
    return;
  },

  'fanout-onTransportError-throws': (scenarioCase) => {
    const received: number[] = [];
    class ThrowingTransportErrorLogger extends Logger {
      protected override onTransportError(): void {
        throw new Error('onTransportError boom');
      }
    }
    const throwingTransport = FunctionTransport.create(() => { throw new Error('transport failure'); });
    const countingTransport = FunctionTransport.create(() => { received.push(1); });
    const logger = ThrowingTransportErrorLogger.create({ 'level': LOG_LEVEL.TRACE, 'transports': [throwingTransport, countingTransport] });
    assert.doesNotThrow(() => {
      logger.info(TestFactory.body('msg'));
    });
    assert.strictEqual(received.length, 1);
    assert.strictEqual(logger.hookErrorCount, 1);
    assert.strictEqual(logger.getHookErrors()[0]?.hookName, 'onTransportError');
    assert.strictEqual(scenarioCase.expected.asserted, true);
    return;
  },

  'child-inherits-metadata': (scenarioCase) => {
    const memory = MemoryTransport.create();
    const parent = Logger.create({ 'level': LOG_LEVEL.TRACE, 'metadata': { service: 'api' }, 'transports': [memory] });
    const child = parent.child({ requestId: 'req-1' });
    child.info(TestFactory.body('msg'));
    const record = memory.records()[0];
    assert.ok(record);
    assert.deepStrictEqual(record.metadata, { service: 'api', requestId: 'req-1' });
    assert.strictEqual(scenarioCase.expected.asserted, true);
    return;
  },

  'child-overrides-metadata': (scenarioCase) => {
    const memory = MemoryTransport.create();
    const parent = Logger.create({ 'level': LOG_LEVEL.TRACE, 'metadata': { service: 'v1' }, 'transports': [memory] });
    const child = parent.child({ service: 'v2' });
    child.info(TestFactory.body('msg'));
    const record = memory.records()[0];
    assert.ok(record);
    assert.strictEqual(record.metadata.service, 'v2');
    assert.strictEqual(scenarioCase.expected.asserted, true);
    return;
  },

  'grandchild-merges-metadata': (scenarioCase) => {
    const memory = MemoryTransport.create();
    const parent = Logger.create({ 'level': LOG_LEVEL.TRACE, 'metadata': { service: 'api' }, 'transports': [memory] });
    const child = parent.child({ requestId: 'req-1' });
    const grandchild = child.child({ operation: 'upload' });
    grandchild.info(TestFactory.body('msg'));
    const record = memory.records()[0];
    assert.ok(record);
    assert.deepStrictEqual(record.metadata, { 'operation': 'upload', 'requestId': 'req-1', 'service': 'api' });
    assert.strictEqual(scenarioCase.expected.asserted, true);
    return;
  },

  'child-shares-transports': (scenarioCase) => {
    const memory = MemoryTransport.create();
    const parent = Logger.create({ 'level': LOG_LEVEL.TRACE, 'transports': [memory] });
    const child = parent.child({ scope: 'child' });
    parent.info(TestFactory.body('parent-msg'));
    child.info(TestFactory.body('child-msg'));
    assert.strictEqual(memory.records().length, 2);
    assert.strictEqual(scenarioCase.expected.asserted, true);
    return;
  },

  'child-snapshots-metadata': (scenarioCase) => {
    const memory = MemoryTransport.create();
    const parent = Logger.create({ 'level': LOG_LEVEL.TRACE, 'metadata': { 'service': 'api' }, 'transports': [memory] });
    const attempt = { 'number': 1 };
    const metadata = { attempt, 'requestId': 'req-1' };
    const child = parent.child(metadata);
    metadata.requestId = 'mutated';
    attempt.number = 2;
    child.info(TestFactory.body('msg'));
    assert.deepStrictEqual(memory.records()[0]?.metadata, { 'attempt': { 'number': 1 }, 'requestId': 'req-1', 'service': 'api' });
    assert.strictEqual(scenarioCase.expected.asserted, true);
    return;
  },

  'child-create-hook': (scenarioCase) => {
    class ThrowingChildLogger extends Logger {
      protected override onChildCreate(): void {
        throw new Error('onChildCreate boom');
      }
    }
    const parent = ThrowingChildLogger.create({ 'level': LOG_LEVEL.TRACE });
    assert.throws(() => {
      parent.child({ requestId: 'req-1' });
    }, HookInvocationError);
    assert.strictEqual(scenarioCase.expected.asserted, true);
    return;
  },

  'record-shape': (scenarioCase) => {
    const memory = MemoryTransport.create();
    const logger = Logger.create({ 'level': LOG_LEVEL.TRACE, 'metadata': { service: 'test' }, 'transports': [memory] });
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
    assert.strictEqual(scenarioCase.expected.asserted, true);
    return;
  },

  'record-level-mapping': (scenarioCase) => {
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
    assert.strictEqual(scenarioCase.expected.asserted, true);
    return;
  },

  'record-onLog-throws': (scenarioCase) => {
    class ThrowingLogLogger extends Logger {
      protected override onLog(): void {
        throw new Error('onLog boom');
      }
    }
    const memory = MemoryTransport.create();
    const logger = ThrowingLogLogger.create({ 'level': LOG_LEVEL.TRACE, 'transports': [memory] });
    assert.throws(() => {
      logger.info(TestFactory.body('msg'));
    }, HookInvocationError);
    assert.strictEqual(memory.records().length, 0);
    assert.strictEqual(scenarioCase.expected.asserted, true);
    return;
  },

  'function-transport-bridge': (scenarioCase) => {
    const captured: LogRecordEntity.Type[] = [];
    const transport = FunctionTransport.create((record) => {
      captured.push(record);
    });
    const logger = Logger.create({ 'level': LOG_LEVEL.TRACE, 'transports': [transport] });
    const body = TestFactory.body('bridge-test');
    logger.info(body);
    assert.strictEqual(captured.length, 1);
    assert.strictEqual(captured[0]?.data, body);
    assert.strictEqual(scenarioCase.expected.asserted, true);
    return;
  },

  'noop-transport-silence': (scenarioCase) => {
    const noop = NoOpTransport.create();
    const logger = Logger.create({ 'level': LOG_LEVEL.TRACE, 'transports': [noop] });
    assert.doesNotThrow(() => {
      logger.trace(TestFactory.body('t'));
      logger.debug(TestFactory.body('d'));
      logger.info(TestFactory.body('i'));
      logger.warn(TestFactory.body('w'));
      logger.error(TestFactory.body('e'));
    });
    assert.strictEqual(scenarioCase.expected.asserted, true);
    return;
  },

  'no-transports-silent': (scenarioCase) => {
    const logger = Logger.create({ level: 'trace' });
    assert.doesNotThrow(() => {
      logger.trace(TestFactory.body('t'));
      logger.debug(TestFactory.body('d'));
      logger.info(TestFactory.body('i'));
      logger.warn(TestFactory.body('w'));
      logger.error(TestFactory.body('e'));
    });
    assert.strictEqual(scenarioCase.expected.asserted, true);
    return;
  },

  'onLog-before-transport': (scenarioCase) => {
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
    assert.strictEqual(scenarioCase.expected.asserted, true);
    return;
  },

  'onLog-assembled-record': (scenarioCase) => {
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
    assert.strictEqual(scenarioCase.expected.asserted, true);
    return;
  },

  'onDropped-below-floor': (scenarioCase) => {
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
    assert.strictEqual(scenarioCase.expected.asserted, true);
    return;
  },

  'onDropped-at-floor': (scenarioCase) => {
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
    assert.strictEqual(scenarioCase.expected.asserted, true);
    return;
  },

  'onDropped-trace-debug': (scenarioCase) => {
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
    assert.strictEqual(scenarioCase.expected.asserted, true);
    return;
  },

  'onDropped-hook-error': (scenarioCase) => {
    class ThrowingDroppedLogger extends Logger {
      constructor() { super({ 'level': LOG_LEVEL.ERROR }); }
      protected override onDropped(): void {
        throw new Error('onDropped boom');
      }
    }
    const memory = MemoryTransport.create();
    const logger = ThrowingDroppedLogger.create({ 'level': LOG_LEVEL.ERROR, 'transports': [memory] });
    assert.throws(() => {
      logger.info(TestFactory.body('dropped'));
    }, HookInvocationError);
    assert.strictEqual(memory.records().length, 0);
    assert.strictEqual(scenarioCase.expected.asserted, true);
    return;
  },

  'onChildCreate-hooks': (scenarioCase) => {
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
    assert.strictEqual(scenarioCase.expected.asserted, true);
    return;
  },

  'onChildCreate-bindings': (scenarioCase) => {
    const capturedBindings: LogMetadataInterface[] = [];
    class ObservedLogger extends Logger {
      constructor() { super({ 'metadata': { 'service': 'api' } }); }
      protected override onChildCreate(bindings: LogMetadataInterface): void {
        capturedBindings.push(bindings);
      }
    }
    const logger = new ObservedLogger();
    logger.child({ 'requestId': 'xyz' });
    assert.deepStrictEqual(capturedBindings[0], { 'requestId': 'xyz' });
    assert.strictEqual(scenarioCase.expected.asserted, true);
    return;
  },

  'onTransportError-fires': (scenarioCase) => {
    const errors: unknown[] = [];
    const capturedTransports: TransportInterface[] = [];
    class ObservedLogger extends Logger {
      constructor() {
        const throwing = FunctionTransport.create(() => { throw new Error('transport boom'); });
        super({ 'level': LOG_LEVEL.TRACE, 'transports': [throwing] });
        capturedTransports.push(throwing);
      }
      protected override onTransportError(_transport: TransportInterface, _record: LogRecordEntity.Type, error: unknown): void {
        errors.push(error);
      }
    }
    const logger = new ObservedLogger();
    logger.info(TestFactory.body('boom'));
    assert.strictEqual(errors.length, 1);
    const [firstError] = errors;
    assert.ok(firstError instanceof Error);
    assert.strictEqual((firstError as Error).message, 'transport boom');
    assert.strictEqual(capturedTransports.length, 1);
    assert.strictEqual(scenarioCase.expected.asserted, true);
    return;
  },

  'onTransportError-succeeds': (scenarioCase) => {
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
    assert.strictEqual(scenarioCase.expected.asserted, true);
    return;
  },

  'onTransportError-each-failure': (scenarioCase) => {
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
    assert.strictEqual(scenarioCase.expected.asserted, true);
    return;
  },

  'onTransportError-isolation': (scenarioCase) => {
    class ThrowingTransportErrorLogger extends Logger {
      readonly hookFailure = new Error('onTransportError boom');
      constructor() {
        const throwing = FunctionTransport.create(() => { throw new Error('transport boom'); });
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
    assert.strictEqual(scenarioCase.expected.asserted, true);
    return;
  },

  'onTransportError-detached-cause': (scenarioCase) => {
    const hookFailure = new Error('onTransportError boom', { 'cause': { 'transports': ['primary'] } });
    class ThrowingTransportErrorLogger extends Logger {
      protected override onTransportError(): void {
        throw hookFailure;
      }
    }
    const throwingTransport = FunctionTransport.create(() => { throw new Error('transport boom'); });
    const logger = ThrowingTransportErrorLogger.create({ 'level': LOG_LEVEL.TRACE, 'transports': [throwingTransport] });
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
    assert.strictEqual(scenarioCase.expected.asserted, true);
    return;
  },

  'onTransportError-fanout-continues': (scenarioCase) => {
    const deliveries: string[] = [];
    class ThrowingTransportErrorLogger extends Logger {
      protected override onTransportError(): void {
        throw new Error('onTransportError boom');
      }
    }
    const transport1 = FunctionTransport.create(() => { deliveries.push('t1'); });
    const transport2 = FunctionTransport.create(() => { throw new Error('t2 write failure'); });
    const transport3 = FunctionTransport.create(() => { deliveries.push('t3'); });
    const logger = ThrowingTransportErrorLogger.create({ 'level': LOG_LEVEL.TRACE, 'transports': [transport1, transport2, transport3] });
    assert.doesNotThrow(() => {
      logger.info(TestFactory.body('fan-out'));
    });
    assert.deepStrictEqual(deliveries, ['t1', 't3']);
    assert.strictEqual(logger.hookErrorCount, 1);
    assert.strictEqual(logger.getHookErrors()[0]?.hookName, 'onTransportError');
    assert.strictEqual(scenarioCase.expected.asserted, true);
    return;
  },

  'async-onTransportError': async (scenarioCase) => {
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
    const throwingTransport = FunctionTransport.create(() => { throw new Error('transport write failure'); });
    const laterTransport = FunctionTransport.create(() => { deliveries.push('later'); });
    process.on('unhandledRejection', onUnhandledRejection);
    try {
      const logger = AsyncRejectingTransportErrorLogger.create({ 'level': LOG_LEVEL.TRACE, 'transports': [throwingTransport, laterTransport] });
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
    assert.strictEqual(scenarioCase.expected.asserted, true);
    return;
  },

  'hook-invocation-error-cause': (scenarioCase) => {
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
    assert.strictEqual(scenarioCase.expected.asserted, true);
    return;
  },

  'async-onLog-unhandled': async (scenarioCase) => {
    const rejectionEvents: unknown[] = [];
    const onUnhandledRejection = (reason: unknown): void => { rejectionEvents.push(reason); };
    class AsyncOnLogLogger extends Logger {
      protected override onLog(): Promise<void> {
        return Promise.reject(new Error('async onLog boom'));
      }
    }
    process.on('unhandledRejection', onUnhandledRejection);
    try {
      const logger = AsyncOnLogLogger.create({ 'level': LOG_LEVEL.TRACE });
      logger.info(TestFactory.body('msg'));
      await new Promise((resolve) => { setImmediate(resolve); });
      await new Promise((resolve) => { setImmediate(resolve); });
      assert.strictEqual(rejectionEvents.length, 0);
    } finally {
      process.off('unhandledRejection', onUnhandledRejection);
    }
    assert.strictEqual(scenarioCase.expected.asserted, true);
    return;
  }
};

async function runCase<Shape extends ScenarioShape>(scenarioCase: ScenarioCaseByShape[Shape]): Promise<void> {
  await runnerMap[scenarioCase.shape](scenarioCase);
}

void describe('Logger', () => {
  for (const scenario of scenarioGroups.cases as ScenarioCase[]) {
    void it(scenario.name, async () => {
      await runCase(scenario);
    });
  }
});
