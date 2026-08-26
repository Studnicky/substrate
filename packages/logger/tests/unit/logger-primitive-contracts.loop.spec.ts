import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { LOG_LEVEL } from '../../src/constants/LOG_LEVEL.js';
import { LOG_LEVEL_MAP } from '../../src/constants/LOG_LEVEL_MAP.js';
import {
  CloudWatchLogSchemaFieldsEntity,
  LogDataEntity,
  LoggerHookEventShapeEntity,
  LogLevelEntity,
  LogRecordEntity,
  LogStatusEntity
} from '../../src/entities/index.js';
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
import { ParseLogLevel } from '../../src/modules/parseLogLevel.js';
import { SafeStringify } from '../../src/modules/safeStringify.js';
import scenarioGroups from './logger-primitive-contracts.scenarios.json' with { type: 'json' };

type ConsoleMethod = 'debug' | 'error' | 'info' | 'trace' | 'warn';
type ConsoleCapture = Record<ConsoleMethod, Array<{ message: string; record: LogRecordEntity.Type }>>;
type FaultConfigInput = {
  cause?: string;
  component: string;
  context: Record<string, unknown>;
  durationMs?: number;
  message: string;
  name: string;
  operation: string;
  stack?: string;
  status: LogStatusEntity.Type;
};
type PartialFaultConfigInput = Partial<FaultConfigInput>;
type FaultConfigInputWithoutIdentity = Omit<FaultConfigInput, 'message' | 'name'>;
type LogBodyFixtureInput = {
  component: string;
  context: Record<string, unknown>;
  operation: string;
  status: LogStatusEntity.Type;
  time: number;
};

type ScenarioCase =
  | {
      description: string;
      expected: { values: Record<string, number> };
      input: Record<string, never>;
      shape: 'level-values';
      name: string;
    }
  | {
      description: string;
      expected: { ordered: true };
      input: Record<string, never>;
      shape: 'level-order';
      name: string;
    }
  | {
      description: string;
      expected: { resolved: Record<string, number> };
      input: Record<string, never>;
      shape: 'level-map';
      name: string;
    }
  | {
      description: string;
      expected: { values: number[] };
      input: Record<string, never>;
      shape: 'parse-numeric';
      name: string;
    }
  | {
      description: string;
      expected: { values: Record<string, number> };
      input: Record<string, never>;
      shape: 'parse-string';
      name: string;
    }
  | {
      description: string;
      expected: { values: Record<string, number> };
      input: Record<string, never>;
      shape: 'parse-invalid-string';
      name: string;
    }
  | {
      description: string;
      expected: { outputs: string[] };
      input: Record<string, never>;
      shape: 'safe-stringify-basic';
      name: string;
    }
  | {
      description: string;
      expected: { result1Contains: string[]; result2Contains: string[] };
      input: Record<string, never>;
      shape: 'safe-stringify-circular';
      name: string;
    }
  | {
      description: string;
      expected: { contains: string[]; parsed: { array: number[]; boolean: boolean; nested: { key: string }; nullValue: null; number: number; string: string } };
      input: Record<string, never>;
      shape: 'safe-stringify-types';
      name: string;
    }
  | {
      description: string;
      expected: { logDataValid: true; logDataInvalid: false; cloudwatchValid: true; hookShapeValid: true; hookShapeInvalid: false };
      input: Record<string, never>;
      shape: 'entity-composition';
      name: string;
    }
  | {
      description: string;
      expected: {
        event: string;
        frozen: true;
        message: string;
        nestedAttempt: number;
        name: string;
        status: string;
      };
      input: { fault: FaultConfigInput };
      shape: 'log-fault-basic';
      name: string;
    }
  | {
      description: string;
      expected: {
        cause: string;
        durationMs: number;
        stack: string;
      };
      input: { fault: FaultConfigInput };
      shape: 'log-fault-optional-fields';
      name: string;
    }
  | {
      description: string;
      expected: {
        message: string;
        name: 'LogBuildError';
      };
      input: { fault: PartialFaultConfigInput };
      shape: 'log-fault-missing-field';
      name: string;
    }
  | {
      description: string;
      expected: {
        cause: string;
        event: string;
        message: string;
        name: string;
      };
      input: {
        error: { cause: string; message: string; name: string };
        fault: FaultConfigInputWithoutIdentity;
      };
      shape: 'log-fault-from-error-fields';
      name: string;
    }
  | {
      description: string;
      expected: {
        calls: Record<ConsoleMethod, string[]>;
      };
      input: {
        body: LogBodyFixtureInput;
        records: Array<{
          level: LogLevelEntity.Type;
          message: string;
          metadata: Record<string, unknown>;
          method: ConsoleMethod;
        }>;
        transport: {
          filtered: {
            level: LogLevelEntity.Type;
            message: string;
            minLevel: LogLevelEntity.Type;
          };
          level: LogLevelEntity.Type;
        };
      };
      shape: 'console-transport-dispatch';
      name: string;
    }
  | {
      description: string;
      expected: {
        message: string;
        name: 'ConfigurationError';
      };
      input: { transport: { level: Record<string, never> } };
      shape: 'console-transport-invalid-level';
      name: string;
    }
  | {
      description: string;
      expected: {
        dateContains: string;
        emptyArray: string;
        emptyObject: string;
        primitives: Record<string, string>;
        symbolObject: string;
      };
      input: Record<string, never>;
      shape: 'safe-stringify-json-edges';
      name: string;
    }
  | {
      description: string;
      expected: {
        code: string;
        constructors: Array<{
          message: string;
          name: string;
          withCause: boolean;
        }>;
      };
      input: Record<string, never>;
      shape: 'error-constructors';
      name: string;
    };

const consoleMethods: readonly ConsoleMethod[] = ['debug', 'error', 'info', 'trace', 'warn'];

function createConsoleCapture(): ConsoleCapture {
  return {
    'debug': [],
    'error': [],
    'info': [],
    'trace': [],
    'warn': []
  };
}

function withConsoleCapture(action: (captures: ConsoleCapture) => void): ConsoleCapture {
  const captures = createConsoleCapture();
  const descriptors = new Map<ConsoleMethod, PropertyDescriptor | undefined>();

  for (const method of consoleMethods) {
    descriptors.set(method, Object.getOwnPropertyDescriptor(console, method));
    Object.defineProperty(console, method, {
      'configurable': true,
      'value': (message: string, record: LogRecordEntity.Type): void => {
        captures[method].push({ message, record });
      }
    });
  }

  try {
    action(captures);
  } finally {
    for (const method of consoleMethods) {
      const descriptor = descriptors.get(method);
      if (descriptor === undefined) {
        Reflect.deleteProperty(console, method);
      } else {
        Object.defineProperty(console, method, descriptor);
      }
    }
  }

  return captures;
}

function createConsoleRecord(
  level: LogLevelEntity.Type,
  message: string,
  metadata: Record<string, unknown>,
  body: LogBodyFixtureInput
) {
  return {
    'data': LogBody.create({
      'component': body.component,
      'context': body.context,
      message,
      'operation': body.operation,
      'status': body.status
    }),
    level,
    metadata,
    'time': body.time
  };
}

type ScenarioRunner<K extends ScenarioCase['shape']> =
  (scenarioCase: Extract<ScenarioCase, { shape: K }>) => void;
type RunnerMap = { [K in ScenarioCase['shape']]: ScenarioRunner<K> };

const runnerMap: RunnerMap = {
  'level-values': (scenarioCase) => {
    assert.strictEqual(LOG_LEVEL.TRACE, scenarioCase.expected.values.TRACE);
    assert.strictEqual(LOG_LEVEL.DEBUG, scenarioCase.expected.values.DEBUG);
    assert.strictEqual(LOG_LEVEL.INFO, scenarioCase.expected.values.INFO);
    assert.strictEqual(LOG_LEVEL.WARN, scenarioCase.expected.values.WARN);
    assert.strictEqual(LOG_LEVEL.ERROR, scenarioCase.expected.values.ERROR);
    assert.strictEqual(LOG_LEVEL.SILENT, scenarioCase.expected.values.SILENT);
  },
  'level-order': (scenarioCase) => {
    assert.ok(LOG_LEVEL.TRACE < LOG_LEVEL.DEBUG);
    assert.ok(LOG_LEVEL.DEBUG < LOG_LEVEL.INFO);
    assert.ok(LOG_LEVEL.INFO < LOG_LEVEL.WARN);
    assert.ok(LOG_LEVEL.WARN < LOG_LEVEL.ERROR);
    assert.ok(LOG_LEVEL.ERROR < LOG_LEVEL.SILENT);
    assert.equal(scenarioCase.expected.ordered, true);
  },
  'level-map': (scenarioCase) => {
    assert.deepStrictEqual({
      trace: LOG_LEVEL_MAP.trace,
      debug: LOG_LEVEL_MAP.debug,
      info: LOG_LEVEL_MAP.info,
      warn: LOG_LEVEL_MAP.warn,
      error: LOG_LEVEL_MAP.error,
      silent: LOG_LEVEL_MAP.silent
    }, scenarioCase.expected.resolved);
  },
  'parse-numeric': (scenarioCase) => {
    const values = [
      ParseLogLevel.parse(LOG_LEVEL.TRACE),
      ParseLogLevel.parse(LOG_LEVEL.DEBUG),
      ParseLogLevel.parse(LOG_LEVEL.INFO),
      ParseLogLevel.parse(LOG_LEVEL.WARN),
      ParseLogLevel.parse(LOG_LEVEL.ERROR),
      ParseLogLevel.parse(LOG_LEVEL.SILENT)
    ];
    assert.deepStrictEqual(values, scenarioCase.expected.values);
  },
  'parse-string': (scenarioCase) => {
    assert.deepStrictEqual({
      trace: ParseLogLevel.parse('trace'),
      debug: ParseLogLevel.parse('debug'),
      info: ParseLogLevel.parse('info'),
      warn: ParseLogLevel.parse('warn'),
      error: ParseLogLevel.parse('error'),
      silent: ParseLogLevel.parse('silent')
    }, scenarioCase.expected.values);
  },
  'parse-invalid-string': (scenarioCase) => {
    assert.deepStrictEqual({
      empty: ParseLogLevel.parse(''),
      invalid: ParseLogLevel.parse('invalid'),
      uppercase: ParseLogLevel.parse('DEBUG'),
      title: ParseLogLevel.parse('Info'),
      spaced: ParseLogLevel.parse(' info '),
      negative: ParseLogLevel.parse(-1),
      large: ParseLogLevel.parse(999)
    }, scenarioCase.expected.values);
  },
  'safe-stringify-basic': (scenarioCase) => {
    assert.deepStrictEqual([
      SafeStringify.stringify({ name: 'test', value: 42 }),
      SafeStringify.stringify([1, 2, 3]),
      SafeStringify.stringify({ level1: { level2: { level3: 'deep value' } } }),
      SafeStringify.stringify({ value: null }),
      SafeStringify.stringify({ value: undefined })
    ], scenarioCase.expected.outputs);
  },
  'safe-stringify-circular': (scenarioCase) => {
    const obj: Record<string, unknown> = { name: 'test' };
    obj.self = obj;
    const result = SafeStringify.stringify(obj);
    for (const fragment of scenarioCase.expected.result1Contains) {
      assert.ok(result.includes(fragment));
    }

    const obj1: Record<string, unknown> = { name: 'obj1' };
    const obj2: Record<string, unknown> = { name: 'obj2' };
    obj1.ref = obj2;
    obj2.ref = obj1;
    const result2 = SafeStringify.stringify({ obj1, obj2 });
    for (const fragment of scenarioCase.expected.result2Contains) {
      assert.ok(result2.includes(fragment));
    }

    const arr: unknown[] = ['value'];
    arr.push(arr);
    assert.strictEqual(SafeStringify.stringify(arr), '["value","[Circular]"]');
  },
  'safe-stringify-types': (scenarioCase) => {
    const level1: Record<string, unknown> = { level2: { level3: { value: 'deep' } } };
    const obj: Record<string, unknown> = { level1 };
    level1.circularRef = obj;

    const result = SafeStringify.stringify(obj);
    for (const fragment of scenarioCase.expected.contains) {
      assert.ok(result.includes(fragment));
    }

    const typed = {
      array: [1, 2, 3],
      boolean: true,
      nested: { key: 'value' },
      nullValue: null,
      number: 42,
      string: 'text'
    };
    const parsed: unknown = JSON.parse(SafeStringify.stringify(typed));
    assert.deepStrictEqual(parsed, scenarioCase.expected.parsed);
  },
  'entity-composition': (scenarioCase) => {
    const body = LogBody.create({
      component: 'worker',
      context: {},
      message: 'complete',
      operation: 'run',
      status: 'success'
    });

    assert.equal(LogDataEntity.validate(body), scenarioCase.expected.logDataValid);
    assert.equal(CloudWatchLogSchemaFieldsEntity.validate({
      level: 2,
      message: 'complete',
      service: 'api',
      time: '2026-07-19T00:00:00.000Z'
    }), scenarioCase.expected.cloudwatchValid);
    assert.equal(LoggerHookEventShapeEntity.validate('transportError'), scenarioCase.expected.hookShapeValid);
    assert.equal(LogDataEntity.validate({ message: 'missing fields' }), scenarioCase.expected.logDataInvalid);
    assert.equal(LoggerHookEventShapeEntity.validate('unknown'), scenarioCase.expected.hookShapeInvalid);
  },
  'log-fault-basic': (scenarioCase) => {
    const context = structuredClone(scenarioCase.input.fault.context ?? {});
    const fault = LogFault.create({
      ...scenarioCase.input.fault,
      context
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
  },
  'log-fault-optional-fields': (scenarioCase) => {
    const fault = LogFault.create({
      ...scenarioCase.input.fault,
      'context': scenarioCase.input.fault.context ?? {}
    });
    assert.strictEqual(fault.cause, scenarioCase.expected.cause);
    assert.strictEqual(fault.durationMs, scenarioCase.expected.durationMs);
    assert.strictEqual(fault.stack, scenarioCase.expected.stack);
  },
  'log-fault-missing-field': (scenarioCase) => {
    assert.throws(
      () => {
        Reflect.apply(LogFault.create, LogFault, [scenarioCase.input.fault]);
      },
      {
        'message': scenarioCase.expected.message,
        'name': scenarioCase.expected.name
      }
    );
  },
  'log-fault-from-error-fields': (scenarioCase) => {
    const sourceError = new Error(scenarioCase.input.error.message, {
      'cause': new Error(scenarioCase.input.error.cause)
    });
    sourceError.name = scenarioCase.input.error.name;
    const sourceCause = sourceError.cause;
    const cause = sourceCause instanceof Error
      ? sourceCause.message
      : sourceCause === undefined ? undefined : String(sourceCause);
    const fault = LogFault.create({
      ...(cause !== undefined && { cause }),
      ...scenarioCase.input.fault,
      'message': sourceError.message,
      'name': sourceError.name
    });
    assert.strictEqual(fault.event, scenarioCase.expected.event);
    assert.strictEqual(fault.name, scenarioCase.expected.name);
    assert.strictEqual(fault.message, scenarioCase.expected.message);
    assert.strictEqual(fault.cause, scenarioCase.expected.cause);
  },
  'console-transport-dispatch': (scenarioCase) => {
    const captures = withConsoleCapture(() => {
      const transport = ConsoleTransport.create({ 'level': scenarioCase.input.transport.level });
      for (const record of scenarioCase.input.records) {
        transport.write(createConsoleRecord(record.level, record.message, record.metadata, scenarioCase.input.body));
      }

      const filteredTransport = ConsoleTransport.create({ 'level': scenarioCase.input.transport.filtered.minLevel });
      filteredTransport.write(createConsoleRecord(
        scenarioCase.input.transport.filtered.level,
        scenarioCase.input.transport.filtered.message,
        {},
        scenarioCase.input.body
      ));
      filteredTransport.write(createConsoleRecord(LOG_LEVEL.WARN, 'warn-after-filter', {}, scenarioCase.input.body));
    });

    for (const method of consoleMethods) {
      assert.deepStrictEqual(
        captures[method].map((call) => call.message),
        scenarioCase.expected.calls[method]
      );
    }
  },
  'console-transport-invalid-level': (scenarioCase) => {
    assert.throws(
      () => {
        Reflect.apply(ConsoleTransport.create, ConsoleTransport, [{ 'level': scenarioCase.input.transport.level }]);
      },
      {
        'message': scenarioCase.expected.message,
        'name': scenarioCase.expected.name
      }
    );
  },
  'safe-stringify-json-edges': (scenarioCase) => {
    const symbolKey = Symbol('test');
    assert.strictEqual(SafeStringify.stringify(new Date('2024-01-01T00:00:00.000Z')).includes(
      scenarioCase.expected.dateContains
    ), true);
    assert.strictEqual(SafeStringify.stringify({}), scenarioCase.expected.emptyObject);
    assert.strictEqual(SafeStringify.stringify([]), scenarioCase.expected.emptyArray);
    assert.deepStrictEqual({
      'boolean': SafeStringify.stringify(true),
      'null': SafeStringify.stringify(null),
      'number': SafeStringify.stringify(42),
      'string': SafeStringify.stringify('string')
    }, scenarioCase.expected.primitives);
    assert.strictEqual(SafeStringify.stringify({
      'regular': 'regular value',
      [symbolKey]: 'symbol value'
    }), scenarioCase.expected.symbolObject);
  },
  'error-constructors': (scenarioCase) => {
    const cause = new Error('root cause');
    const constructed = [
      new LoggerError('base logger failure', cause),
      new CircularReferenceError('circular metadata', cause),
      new FileDestinationError('file write failed', cause),
      new InvalidLogLevelError('invalid level', cause),
      new LogBuildError('LogBody: component is required')
    ];

    for (let i = 0; i < scenarioCase.expected.constructors.length; i += 1) {
      const expected = scenarioCase.expected.constructors[i];
      const error = constructed[i];
      assert.ok(expected);
      assert.ok(error instanceof LoggerError);
      assert.strictEqual(error.name, expected.name);
      assert.strictEqual(error.message, expected.message);
      assert.strictEqual(error.code, scenarioCase.expected.code);
      assert.strictEqual(error.cause, expected.withCause ? cause : undefined);
    }
  }
};

function runCase<K extends ScenarioCase['shape']>(scenarioCase: Extract<ScenarioCase, { shape: K }>): void {
  runnerMap[scenarioCase.shape](scenarioCase);
}

void describe('logger primitive contracts', () => {
  for (const scenario of scenarioGroups.cases as ScenarioCase[]) {
    void it(scenario.name, () => {
      runCase(scenario);
    });
  }
});
