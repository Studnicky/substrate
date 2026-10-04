import { SchemaIntakeError } from '@studnicky/entity/node';
import { RuntimeError } from '@studnicky/errors/node';
import { FrozenMutationError, ImmutableSnapshot } from '@studnicky/json/node';
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type { ScenarioCaseOfType } from '../../../../scripts/test-helpers/scenario-kit/dist/index.js';
import type { LogLevelEntity, LogStatusEntity } from '../../src/entities/index.js';

import { ScenarioSuite } from '../../../../scripts/test-helpers/scenario-kit/dist/index.js';
import { LOG_LEVEL_MAP } from '../../src/constants/LOG_LEVEL_MAP.js';
import { LOG_LEVEL } from '../../src/constants/LOG_LEVEL.js';
import {
  CloudWatchLogSchemaFieldsEntity,
  LogDataEntity,
  LogFaultConfigEntity,
  LoggerHookEventShapeEntity,
  LogRecordEntity
} from '../../src/entities/index.js';
import { LogSerializationError } from '../../src/errors/LogSerializationError.js';
import {
  CircularReferenceError,
  ConsoleTransport,
  FileDestinationError,
  InvalidLogLevelError,
  LogBody,
  LogBuildError,
  LogFault,
  LoggerError
} from '../../src/index.js';
import { LogBuildErrorMessage } from '../../src/modules/LogBuildErrorMessage.js';
import { ParseLogLevel } from '../../src/modules/parseLogLevel.js';
import { ResolveMinimumLevel } from '../../src/modules/ResolveMinimumLevel.js';
import { SafeStringify } from '../../src/modules/safeStringify.js';
import { LoggerPrimitiveContractsScenarioCaseEntity } from './entities/LoggerPrimitiveContractsScenarioCaseEntity.js';
import scenarioGroups from './logger-primitive-contracts.scenarios.json' with { 'type': 'json' };

interface ConsoleCallInterface {
  readonly 'message': string;
  readonly 'record': LogRecordEntity.Type;
}

interface ConsoleCaptureInterface {
  readonly 'debug': ConsoleCallInterface[];
  readonly 'error': ConsoleCallInterface[];
  readonly 'info': ConsoleCallInterface[];
  readonly 'trace': ConsoleCallInterface[];
  readonly 'warn': ConsoleCallInterface[];
}

interface ConsoleDescriptorInterface {
  readonly 'debug': PropertyDescriptor;
  readonly 'error': PropertyDescriptor;
  readonly 'info': PropertyDescriptor;
  readonly 'trace': PropertyDescriptor;
  readonly 'warn': PropertyDescriptor;
}

interface LogBodyFixtureInputInterface {
  readonly 'component': string;
  readonly 'context': Record<string, unknown>;
  readonly 'operation': string;
  readonly 'status': LogStatusEntity.Type;
  readonly 'time': number;
}

const consoleMethods = ['debug', 'error', 'info', 'trace', 'warn'] as const;

class LoggerPrimitiveFixtures {
  static createConsoleCapture(): ConsoleCaptureInterface {
    const capture: ConsoleCaptureInterface = {
      'debug': [],
      'error': [],
      'info': [],
      'trace': [],
      'warn': []
    };
    return capture;
  }

  static withConsoleCapture(
    action: (captures: ConsoleCaptureInterface) => void
  ): ConsoleCaptureInterface {
    const captures = LoggerPrimitiveFixtures.createConsoleCapture();
    const descriptors: ConsoleDescriptorInterface = {
      'debug': LoggerPrimitiveFixtures.getConsoleDescriptor('debug'),
      'error': LoggerPrimitiveFixtures.getConsoleDescriptor('error'),
      'info': LoggerPrimitiveFixtures.getConsoleDescriptor('info'),
      'trace': LoggerPrimitiveFixtures.getConsoleDescriptor('trace'),
      'warn': LoggerPrimitiveFixtures.getConsoleDescriptor('warn')
    };

    for (let index = 0; index < consoleMethods.length; index += 1) {
      const method = consoleMethods[index];
      if (method !== undefined) {
        Object.defineProperty(console, method, {
          'configurable': true,
          'value': (message: string, record: LogRecordEntity.Type): void => {
            captures[method].push({ 'message': message, 'record': record });
          }
        });
      }
    }

    try {
      action(captures);
    } finally {
      for (let index = 0; index < consoleMethods.length; index += 1) {
        const method = consoleMethods[index];
        if (method !== undefined) {
          Object.defineProperty(console, method, descriptors[method]);
        }
      }
    }

    return captures;
  }

  static createConsoleRecord(
    level: LogLevelEntity.Type,
    message: string,
    metadata: Record<string, unknown>,
    body: LogBodyFixtureInputInterface
  ): LogRecordEntity.Type {
    const record = LogRecordEntity.create({
      'data': LogBody.create({
        'component': body.component,
        'context': body.context,
        'message': message,
        'operation': body.operation,
        'status': body.status
      }),
      'level': level,
      'metadata': metadata,
      'time': body.time
    });
    return record;
  }

  private static getConsoleDescriptor(method: (typeof consoleMethods)[number]): PropertyDescriptor {
    const descriptor = Object.getOwnPropertyDescriptor(console, method);
    assert.ok(descriptor !== undefined);
    return descriptor;
  }
}

class LoggerPrimitiveContractRunners {
  static 'console-transport-dispatch'(
    scenarioCase: ScenarioCaseOfType<
      LoggerPrimitiveContractsScenarioCaseEntity.Type,
      'console-transport-dispatch'
    >
  ): void {
    const captures = LoggerPrimitiveFixtures.withConsoleCapture(() => {
      const transport = ConsoleTransport.create({ 'level': scenarioCase.input.transport.level });
      for (let index = 0; index < scenarioCase.input.records.length; index += 1) {
        const record = scenarioCase.input.records[index];
        if (record !== undefined) {
          transport.write(
            LoggerPrimitiveFixtures.createConsoleRecord(
              record.level,
              record.message,
              record.metadata,
              scenarioCase.input.body
            )
          );
        }
      }

      const filteredTransport = ConsoleTransport.create({
        'level': scenarioCase.input.transport.filtered.minLevel
      });
      filteredTransport.write(
        LoggerPrimitiveFixtures.createConsoleRecord(
          scenarioCase.input.transport.filtered.level,
          scenarioCase.input.transport.filtered.message,
          {},
          scenarioCase.input.body
        )
      );
      filteredTransport.write(
        LoggerPrimitiveFixtures.createConsoleRecord(
          LOG_LEVEL.WARN,
          'warn-after-filter',
          {},
          scenarioCase.input.body
        )
      );
    });

    for (let index = 0; index < consoleMethods.length; index += 1) {
      const method = consoleMethods[index];
      if (method !== undefined) {
        assert.deepStrictEqual(
          captures[method].map((call) => {
            return call.message;
          }),
          scenarioCase.expected.calls[method]
        );
      }
    }
  }

  static 'console-transport-invalid-level'(
    scenarioCase: ScenarioCaseOfType<
      LoggerPrimitiveContractsScenarioCaseEntity.Type,
      'console-transport-invalid-level'
    >
  ): void {
    assert.throws(
      () => {
        ResolveMinimumLevel.from({ 'level': scenarioCase.input.transport.level });
      },
      {
        'message': scenarioCase.expected.message,
        'name': scenarioCase.expected.name
      }
    );
  }

  static 'entity-composition'(
    scenarioCase: ScenarioCaseOfType<
      LoggerPrimitiveContractsScenarioCaseEntity.Type,
      'entity-composition'
    >
  ): void {
    const body = LogBody.create({
      'component': 'worker',
      'context': {},
      'message': 'complete',
      'operation': 'run',
      'status': 'success'
    });

    assert.equal(LogDataEntity.validate(body), scenarioCase.expected.logDataValid);
    assert.equal(
      CloudWatchLogSchemaFieldsEntity.validate({
        'level': 2,
        'message': 'complete',
        'service': 'api',
        'time': '2026-07-19T00:00:00.000Z'
      }),
      scenarioCase.expected.cloudwatchValid
    );
    assert.equal(
      LoggerHookEventShapeEntity.validate('transportError'),
      scenarioCase.expected.hookShapeValid
    );
    assert.equal(
      LogDataEntity.validate({ 'message': 'missing fields' }),
      scenarioCase.expected.logDataInvalid
    );
    assert.equal(
      LoggerHookEventShapeEntity.validate('unknown'),
      scenarioCase.expected.hookShapeInvalid
    );
  }

  static 'error-constructors'(
    scenarioCase: ScenarioCaseOfType<
      LoggerPrimitiveContractsScenarioCaseEntity.Type,
      'error-constructors'
    >
  ): void {
    const cause = RuntimeError.create('root cause');
    const constructed = [
      new LoggerError('base logger failure', cause),
      new CircularReferenceError('circular metadata', cause),
      new FileDestinationError('file write failed', cause),
      new InvalidLogLevelError('invalid level', cause),
      new LogBuildError('LogBody: component is required')
    ];

    for (let index = 0; index < scenarioCase.expected.constructors.length; index += 1) {
      const expected = scenarioCase.expected.constructors[index];
      assert.ok(expected !== undefined);
      const error = constructed[index];
      assert.ok(error !== undefined);
      assert.ok(error instanceof LoggerError);
      assert.strictEqual(error.name, expected.name);
      assert.strictEqual(error.message, expected.message);
      assert.strictEqual(error.code, scenarioCase.expected.code);
      assert.strictEqual(error.cause, expected.withCause === true ? cause : undefined);
    }
  }

  static 'level-map'(
    scenarioCase: ScenarioCaseOfType<LoggerPrimitiveContractsScenarioCaseEntity.Type, 'level-map'>
  ): void {
    assert.deepStrictEqual(
      {
        'debug': LOG_LEVEL_MAP.debug,
        'error': LOG_LEVEL_MAP.error,
        'info': LOG_LEVEL_MAP.info,
        'silent': LOG_LEVEL_MAP.silent,
        'trace': LOG_LEVEL_MAP.trace,
        'warn': LOG_LEVEL_MAP.warn
      },
      scenarioCase.expected.resolved
    );
  }

  static 'level-order'(
    scenarioCase: ScenarioCaseOfType<
      LoggerPrimitiveContractsScenarioCaseEntity.Type,
      'level-order'
    >
  ): void {
    assert.ok(LOG_LEVEL.TRACE < LOG_LEVEL.DEBUG);
    assert.ok(LOG_LEVEL.DEBUG < LOG_LEVEL.INFO);
    assert.ok(LOG_LEVEL.INFO < LOG_LEVEL.WARN);
    assert.ok(LOG_LEVEL.WARN < LOG_LEVEL.ERROR);
    assert.ok(LOG_LEVEL.ERROR < LOG_LEVEL.SILENT);
    assert.equal(scenarioCase.expected.ordered, true);
  }

  static 'level-values'(
    scenarioCase: ScenarioCaseOfType<
      LoggerPrimitiveContractsScenarioCaseEntity.Type,
      'level-values'
    >
  ): void {
    assert.strictEqual(LOG_LEVEL.TRACE, scenarioCase.expected.values.TRACE);
    assert.strictEqual(LOG_LEVEL.DEBUG, scenarioCase.expected.values.DEBUG);
    assert.strictEqual(LOG_LEVEL.INFO, scenarioCase.expected.values.INFO);
    assert.strictEqual(LOG_LEVEL.WARN, scenarioCase.expected.values.WARN);
    assert.strictEqual(LOG_LEVEL.ERROR, scenarioCase.expected.values.ERROR);
    assert.strictEqual(LOG_LEVEL.SILENT, scenarioCase.expected.values.SILENT);
  }

  static 'log-fault-basic'(
    scenarioCase: ScenarioCaseOfType<
      LoggerPrimitiveContractsScenarioCaseEntity.Type,
      'log-fault-basic'
    >
  ): void {
    const sourceContext = scenarioCase.input.fault.context ?? {};
    const sourceDetails = sourceContext.details;
    const copiedDetails =
      sourceDetails !== null && typeof sourceDetails === 'object'
        ? { ...sourceDetails }
        : sourceDetails;
    const context = { ...sourceContext, 'details': copiedDetails };
    const fault = LogFault.create({
      ...scenarioCase.input.fault,
      'context': context
    });
    const details = context.details;
    if (details !== null && typeof details === 'object') {
      Reflect.set(details, 'attempt', 2);
    }
    assert.strictEqual(fault.event, scenarioCase.expected.event);
    assert.strictEqual(fault.status, scenarioCase.expected.status);
    assert.strictEqual(fault.name, scenarioCase.expected.name);
    assert.strictEqual(fault.message, scenarioCase.expected.message);
    assert.strictEqual(Object.isFrozen(fault), scenarioCase.expected.frozen);
    assert.strictEqual(Object.isFrozen(fault.context), scenarioCase.expected.frozen);
    const faultDetails = Reflect.get(fault.context, 'details');
    assert.ok(faultDetails !== null && typeof faultDetails === 'object');
    assert.strictEqual(Reflect.get(faultDetails, 'attempt'), scenarioCase.expected.nestedAttempt);
  }

  static 'log-fault-from-error-fields'(
    scenarioCase: ScenarioCaseOfType<
      LoggerPrimitiveContractsScenarioCaseEntity.Type,
      'log-fault-from-error-fields'
    >
  ): void {
    const sourceCause = RuntimeError.create(scenarioCase.input.error.cause);
    const sourceError = RuntimeError.create(scenarioCase.input.error.message, {
      'cause': sourceCause
    });
    Object.defineProperty(sourceError, 'name', { 'value': scenarioCase.input.error.name });
    const cause = sourceCause.message;
    const fault = LogFault.create({
      'cause': cause,
      ...scenarioCase.input.fault,
      'message': sourceError.message,
      'name': sourceError.name
    });
    assert.strictEqual(fault.event, scenarioCase.expected.event);
    assert.strictEqual(fault.name, scenarioCase.expected.name);
    assert.strictEqual(fault.message, scenarioCase.expected.message);
    assert.strictEqual(fault.cause, scenarioCase.expected.cause);
  }

  static 'log-fault-missing-field'(
    scenarioCase: ScenarioCaseOfType<
      LoggerPrimitiveContractsScenarioCaseEntity.Type,
      'log-fault-missing-field'
    >
  ): void {
    try {
      LogFaultConfigEntity.intake(scenarioCase.input.fault);
      assert.fail('expected LogFaultConfigEntity.intake to throw');
    } catch (error) {
      assert.ok(error instanceof SchemaIntakeError);
      const built = new LogBuildError(LogBuildErrorMessage.resolve('LogFault', error));
      assert.strictEqual(built.message, scenarioCase.expected.message);
      assert.strictEqual(built.name, scenarioCase.expected.name);
    }
  }

  static 'log-fault-optional-fields'(
    scenarioCase: ScenarioCaseOfType<
      LoggerPrimitiveContractsScenarioCaseEntity.Type,
      'log-fault-optional-fields'
    >
  ): void {
    const fault = LogFault.create({
      ...scenarioCase.input.fault,
      'context': scenarioCase.input.fault.context ?? {}
    });
    assert.strictEqual(fault.cause, scenarioCase.expected.cause);
    assert.strictEqual(fault.durationMs, scenarioCase.expected.durationMs);
    assert.strictEqual(fault.stack, scenarioCase.expected.stack);
  }

  static 'parse-invalid-string'(
    scenarioCase: ScenarioCaseOfType<
      LoggerPrimitiveContractsScenarioCaseEntity.Type,
      'parse-invalid-string'
    >
  ): void {
    assert.deepStrictEqual(
      {
        'empty': ParseLogLevel.parse(''),
        'invalid': ParseLogLevel.parse('invalid'),
        'large': ParseLogLevel.parse(999),
        'negative': ParseLogLevel.parse(-1),
        'spaced': ParseLogLevel.parse(' info '),
        'title': ParseLogLevel.parse('Info'),
        'uppercase': ParseLogLevel.parse('DEBUG')
      },
      scenarioCase.expected.values
    );
  }

  static 'parse-numeric'(
    scenarioCase: ScenarioCaseOfType<
      LoggerPrimitiveContractsScenarioCaseEntity.Type,
      'parse-numeric'
    >
  ): void {
    const values = [
      ParseLogLevel.parse(LOG_LEVEL.TRACE),
      ParseLogLevel.parse(LOG_LEVEL.DEBUG),
      ParseLogLevel.parse(LOG_LEVEL.INFO),
      ParseLogLevel.parse(LOG_LEVEL.WARN),
      ParseLogLevel.parse(LOG_LEVEL.ERROR),
      ParseLogLevel.parse(LOG_LEVEL.SILENT)
    ];
    assert.deepStrictEqual(values, scenarioCase.expected.values);
  }

  static 'parse-string'(
    scenarioCase: ScenarioCaseOfType<
      LoggerPrimitiveContractsScenarioCaseEntity.Type,
      'parse-string'
    >
  ): void {
    assert.deepStrictEqual(
      {
        'debug': ParseLogLevel.parse('debug'),
        'error': ParseLogLevel.parse('error'),
        'info': ParseLogLevel.parse('info'),
        'silent': ParseLogLevel.parse('silent'),
        'trace': ParseLogLevel.parse('trace'),
        'warn': ParseLogLevel.parse('warn')
      },
      scenarioCase.expected.values
    );
  }

  static 'safe-stringify-basic'(
    scenarioCase: ScenarioCaseOfType<
      LoggerPrimitiveContractsScenarioCaseEntity.Type,
      'safe-stringify-basic'
    >
  ): void {
    assert.deepStrictEqual(
      [
        SafeStringify.stringify({ 'name': 'test', 'value': 42 }),
        SafeStringify.stringify([1, 2, 3]),
        SafeStringify.stringify({ 'level1': { 'level2': { 'level3': 'deep value' } } }),
        SafeStringify.stringify({ 'value': null }),
        SafeStringify.stringify({ 'value': undefined })
      ],
      scenarioCase.expected.outputs
    );
  }

  static 'safe-stringify-circular'(
    scenarioCase: ScenarioCaseOfType<
      LoggerPrimitiveContractsScenarioCaseEntity.Type,
      'safe-stringify-circular'
    >
  ): void {
    const selfReferentialObject: Record<string, unknown> = { 'name': 'test' };
    selfReferentialObject.self = selfReferentialObject;
    const firstResult = SafeStringify.stringify(selfReferentialObject);
    for (let index = 0; index < scenarioCase.expected.result1Contains.length; index += 1) {
      const fragment = scenarioCase.expected.result1Contains[index];
      assert.ok(fragment !== undefined && firstResult.includes(fragment));
    }

    const firstObject: Record<string, unknown> = { 'name': 'obj1' };
    const secondObject: Record<string, unknown> = { 'name': 'obj2' };
    firstObject.ref = secondObject;
    secondObject.ref = firstObject;
    const secondResult = SafeStringify.stringify({ 'obj1': firstObject, 'obj2': secondObject });
    for (let index = 0; index < scenarioCase.expected.result2Contains.length; index += 1) {
      const fragment = scenarioCase.expected.result2Contains[index];
      assert.ok(fragment !== undefined && secondResult.includes(fragment));
    }

    const selfReferentialArray: unknown[] = ['value'];
    selfReferentialArray.push(selfReferentialArray);
    assert.strictEqual(SafeStringify.stringify(selfReferentialArray), '["value","[Circular]"]');
  }

  static 'safe-stringify-json-edges'(
    scenarioCase: ScenarioCaseOfType<
      LoggerPrimitiveContractsScenarioCaseEntity.Type,
      'safe-stringify-json-edges'
    >
  ): void {
    const symbolKey = Symbol('test');
    const objectWithSymbol = { 'regular': 'regular value' };
    Object.defineProperty(objectWithSymbol, symbolKey, { 'value': 'symbol value' });
    assert.strictEqual(
      SafeStringify.stringify(new Date('2024-01-01T00:00:00.000Z')).includes(
        scenarioCase.expected.dateContains
      ),
      true
    );
    assert.strictEqual(SafeStringify.stringify({}), scenarioCase.expected.emptyObject);
    assert.strictEqual(SafeStringify.stringify([]), scenarioCase.expected.emptyArray);
    assert.deepStrictEqual(
      {
        'boolean': SafeStringify.stringify(true),
        'null': SafeStringify.stringify(null),
        'number': SafeStringify.stringify(42),
        'string': SafeStringify.stringify('string')
      },
      scenarioCase.expected.primitives
    );
    assert.strictEqual(
      SafeStringify.stringify(objectWithSymbol),
      scenarioCase.expected.symbolObject
    );
  }

  static 'safe-stringify-types'(
    scenarioCase: ScenarioCaseOfType<
      LoggerPrimitiveContractsScenarioCaseEntity.Type,
      'safe-stringify-types'
    >
  ): void {
    const firstLevel: Record<string, unknown> = { 'level2': { 'level3': { 'value': 'deep' } } };
    const circularObject: Record<string, unknown> = { 'level1': firstLevel };
    firstLevel.circularRef = circularObject;

    const result = SafeStringify.stringify(circularObject);
    for (let index = 0; index < scenarioCase.expected.contains.length; index += 1) {
      const fragment = scenarioCase.expected.contains[index];
      assert.ok(fragment !== undefined && result.includes(fragment));
    }

    const typed = {
      'array': [1, 2, 3],
      'boolean': true,
      'nested': { 'key': 'value' },
      'nullValue': null,
      'number': 42,
      'string': 'text'
    };
    let parsed: unknown;
    try {
      parsed = JSON.parse(SafeStringify.stringify(typed));
    } catch {
      assert.fail('expected SafeStringify.stringify to produce parseable JSON');
    }
    assert.deepStrictEqual(parsed, scenarioCase.expected.parsed);
  }
}

ScenarioSuite.register({
  'entity': LoggerPrimitiveContractsScenarioCaseEntity,
  'file': scenarioGroups,
  'name': 'logger primitive contracts',
  'runners': LoggerPrimitiveContractRunners
});
void describe('ImmutableSnapshot', () => {
  void it('clones nested Map and Set values into mutation-guarded references', () => {
    const source = { 'collection': new Map<string, Set<string>>([['members', new Set(['ada'])]]) };
    const snapshot = ImmutableSnapshot.from(source);
    const members = snapshot.collection.get('members');

    assert.notStrictEqual(snapshot, source);
    assert.ok(members instanceof Set);
    assert.throws(() => {
      snapshot.collection.set('other', new Set());
    }, FrozenMutationError);
    assert.throws(() => {
      members.add('lin');
    }, FrozenMutationError);
  });

  void it('surfaces a value the JSON serializer rejects as a LogSerializationError carrying the platform error', () => {
    let caughtError: LogSerializationError | undefined;
    try {
      SafeStringify.stringify({ 'count': 1n });
      assert.fail('expected SafeStringify.stringify to throw');
    } catch (error) {
      assert.ok(error instanceof LogSerializationError);
      caughtError = error;
    }
    assert.ok(caughtError.cause instanceof TypeError);
  });
});
