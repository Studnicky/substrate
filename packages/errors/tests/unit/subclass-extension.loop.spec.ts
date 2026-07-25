import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type { ModuleErrorOptionsInterface } from '../../src/interfaces/index.js';

import { ErrorDefaults } from '../../src/constants/index.js';
import { BaseError } from '../../src/errors/BaseError.js';
import { ModuleError } from '../../src/errors/ModuleError.js';
import scenarioGroups from './subclass-extension.scenarios.json';

interface AuditErrorArgumentsInterface {
  auditId: string;
  message: string;
  policy: string;
}

class AuditError extends BaseError {
  public readonly auditId: string;
  public readonly policy: string;

  public static of(args: AuditErrorArgumentsInterface): AuditError {
    return new AuditError(args);
  }

  protected constructor(args: AuditErrorArgumentsInterface) {
    super({ code: 'audit.failed', message: args.message, retryable: false });
    this.auditId = args.auditId;
    this.policy = args.policy;
  }

  protected override serializeExtra(): Record<string, unknown> {
    return {
      auditId: this.auditId,
      policy: this.policy
    };
  }

  protected override formatUserMessage(): string {
    return `[Audit ${this.auditId}] ${this.message} (policy: ${this.policy})`;
  }
}

class NetworkModuleError extends ModuleError {
  public static override create(
    message: string,
    options?: Omit<Parameters<typeof ModuleError.create>[1], 'scenario'>
  ): NetworkModuleError {
    const defaults = ErrorDefaults.CONNECTION;
    const mergedOptions: ModuleErrorOptionsInterface = {
      cause: options?.cause,
      code: defaults.code,
      context: options?.context,
      retryable: options?.retryable ?? defaults.retryable,
      statusCode: options?.statusCode ?? defaults.statusCode
    };
    return new NetworkModuleError(message, mergedOptions);
  }

  protected constructor(message: string, options: ModuleErrorOptionsInterface) {
    super(message, options);
  }
}

type ScenarioCase =
  | { description: string; expected: Record<string, unknown>; input: Record<string, unknown>; kind: 'audit-instanceof' | 'audit-json-base' | 'audit-json-extra' | 'audit-json-independent' | 'audit-name' | 'audit-user-message' | 'network-cause-chain' | 'network-find-cause' | 'network-has-cause' | 'network-instanceof' | 'network-json-context' | 'network-json-name' | 'network-json-status-code' | 'network-name'; name: string };

type ScenarioRunner<K extends ScenarioCase['kind']> = (scenarioCase: Extract<ScenarioCase, { kind: K }>) => void;

type RunnerMap = {
  [K in ScenarioCase['kind']]: ScenarioRunner<K>;
};

const runnerMap: RunnerMap = {
  'audit-instanceof': (scenarioCase) => {
    const input = scenarioCase.input as AuditErrorArgumentsInterface;
    const expected = scenarioCase.expected as { baseError: boolean; error: boolean; instanceOf: boolean };
    const err = AuditError.of(input);
    assert.strictEqual(err instanceof Error, expected.error);
    assert.strictEqual(err instanceof BaseError, expected.baseError);
    assert.strictEqual(err instanceof AuditError, expected.instanceOf);
  },

  'audit-json-base': (scenarioCase) => {
    const input = scenarioCase.input as AuditErrorArgumentsInterface;
    const expected = scenarioCase.expected as { code: string };
    const json = AuditError.of(input).toJSON() as Record<string, unknown>;
    assert.strictEqual(json.code, expected.code);
    assert.ok(typeof json.message === 'string');
    assert.ok(typeof json.timestamp === 'number');
  },

  'audit-json-extra': (scenarioCase) => {
    const input = scenarioCase.input as AuditErrorArgumentsInterface;
    const expected = scenarioCase.expected as { auditId: string; policy: string };
    const json = AuditError.of(input).toJSON() as Record<string, unknown>;
    assert.strictEqual(json.auditId, expected.auditId);
    assert.strictEqual(json.policy, expected.policy);
  },

  'audit-json-independent': (scenarioCase) => {
    const input = scenarioCase.input as AuditErrorArgumentsInterface;
    const expected = scenarioCase.expected as { jsonHasAuditId: boolean; messagePrefix: string };
    const err = AuditError.of(input);
    const json = err.toJSON() as Record<string, unknown>;
    const msg = err.toUserMessage();
    assert.strictEqual('auditId' in json, expected.jsonHasAuditId);
    assert.ok(msg.startsWith(expected.messagePrefix));
  },

  'audit-name': (scenarioCase) => {
    const input = scenarioCase.input as AuditErrorArgumentsInterface;
    const expected = scenarioCase.expected as { name: string };
    assert.strictEqual(AuditError.of(input).name, expected.name);
  },

  'audit-user-message': (scenarioCase) => {
    const input = scenarioCase.input as AuditErrorArgumentsInterface;
    const expected = scenarioCase.expected as { message: string };
    const msg = AuditError.of(input).toUserMessage();
    assert.strictEqual(msg, expected.message);
  },

  'network-cause-chain': (scenarioCase) => {
    const input = scenarioCase.input as { causeMessage: string; message: string };
    const expected = scenarioCase.expected as { chainLength: number };
    const root = new Error(input.causeMessage);
    const err = NetworkModuleError.create(input.message, { cause: root });
    const chain = BaseError.getCauseChain(err);
    assert.strictEqual(chain.length, expected.chainLength);
    assert.strictEqual(chain[0], err);
    assert.strictEqual(chain[1], root);
  },

  'network-find-cause': (scenarioCase) => {
    const input = scenarioCase.input as { causeMessage: string; message: string };
    const expected = scenarioCase.expected as { found: boolean; name: string };
    const root = new TypeError(input.causeMessage);
    const err = NetworkModuleError.create(input.message, { cause: root });
    const found = BaseError.findCauseOfType(err, TypeError);
    assert.strictEqual(found instanceof TypeError, expected.found);
    assert.strictEqual(found?.name, expected.name);
    assert.strictEqual(found, root);
  },

  'network-has-cause': (scenarioCase) => {
    const input = scenarioCase.input as { causeMessage: string; message: string };
    const expected = scenarioCase.expected as { rangeError: boolean; typeError: boolean };
    const root = new RangeError(input.causeMessage);
    const err = NetworkModuleError.create(input.message, { cause: root });
    assert.strictEqual(BaseError.hasCauseOfType(err, RangeError), expected.rangeError);
    assert.strictEqual(BaseError.hasCauseOfType(err, TypeError), expected.typeError);
  },

  'network-instanceof': (scenarioCase) => {
    const input = scenarioCase.input as { message: string };
    const expected = scenarioCase.expected as { baseError: boolean; error: boolean; moduleError: boolean; networkModuleError: boolean };
    const err = NetworkModuleError.create(input.message);
    assert.strictEqual(err instanceof Error, expected.error);
    assert.strictEqual(err instanceof BaseError, expected.baseError);
    assert.strictEqual(err instanceof ModuleError, expected.moduleError);
    assert.strictEqual(err instanceof NetworkModuleError, expected.networkModuleError);
  },

  'network-json-context': (scenarioCase) => {
    const input = scenarioCase.input as { context: Record<string, unknown>; message: string };
    const expected = scenarioCase.expected as { context: Record<string, unknown> };
    const json = NetworkModuleError.create(input.message, { context: input.context }).toJSON() as Record<string, unknown>;
    assert.deepStrictEqual(json.context, expected.context);
  },

  'network-json-name': (scenarioCase) => {
    const input = scenarioCase.input as { message: string };
    const expected = scenarioCase.expected as { name: string };
    const json = NetworkModuleError.create(input.message).toJSON() as Record<string, unknown>;
    assert.strictEqual(json.name, expected.name);
  },

  'network-json-status-code': (scenarioCase) => {
    const input = scenarioCase.input as { message: string };
    const expected = scenarioCase.expected as { statusCode: number };
    const json = NetworkModuleError.create(input.message).toJSON() as Record<string, unknown>;
    assert.strictEqual(json.statusCode, expected.statusCode);
  },

  'network-name': (scenarioCase) => {
    const input = scenarioCase.input as { message: string };
    const expected = scenarioCase.expected as { name: string };
    assert.strictEqual(NetworkModuleError.create(input.message).name, expected.name);
  }
};

function runCase<K extends ScenarioCase['kind']>(scenarioCase: Extract<ScenarioCase, { kind: K }>): void {
  runnerMap[scenarioCase.kind](scenarioCase);
}

void describe('Subclass extension', () => {
  for (const scenario of scenarioGroups.cases as ScenarioCase[]) {
    void it(scenario.name, () => {
      runCase(scenario);
    });
  }
});
