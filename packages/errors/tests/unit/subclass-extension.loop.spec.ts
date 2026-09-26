import { RuntimeError } from '../../src/errors/RuntimeError.js';
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type { NodeStaticType } from '@studnicky/entity/types';

import { ScenarioFileCompiler } from '@studnicky/scenario-kit/node';

import { EntityCompiler } from '@studnicky/entity/browser';
import { SchemaNode } from '@studnicky/entity/types';

import type { ModuleErrorOptionsInterface } from '../../src/interfaces/index.js';

import { ErrorDefaults } from '../../src/constants/index.js';
import { BaseError } from '../../src/errors/BaseError.js';
import { ModuleError } from '../../src/errors/ModuleError.js';
import { SubclassExtensionScenarioCaseEntity } from './entities/SubclassExtensionScenarioCaseEntity.js';
import scenarioGroups from './subclass-extension.scenarios.json' with { type: 'json' };

const fileIntake = ScenarioFileCompiler.compileIntake(SubclassExtensionScenarioCaseEntity.Schema, SubclassExtensionScenarioCaseEntity.Node);

const AuditErrorArgumentsNode = SchemaNode.defineObject(
  { 'type': 'object' } as const,
  {
    'auditId': SchemaNode.defineString({ 'type': 'string' } as const),
    'message': SchemaNode.defineString({ 'type': 'string' } as const),
    'policy': SchemaNode.defineString({ 'type': 'string' } as const)
  },
  ['auditId', 'message', 'policy'] as const
);
const AuditErrorArgumentsSchema = {
  'properties': {
    'auditId': { 'type': 'string' },
    'message': { 'type': 'string' },
    'policy': { 'type': 'string' }
  },
  'required': ['auditId', 'message', 'policy'],
  'type': 'object'
} as const;
type AuditErrorArgumentsInterface = NodeStaticType<typeof AuditErrorArgumentsNode>;
const intakeAuditErrorArguments = EntityCompiler.compileIntake<AuditErrorArgumentsInterface>(AuditErrorArgumentsSchema);

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
      status: options?.status ?? defaults.status
    };
    return new NetworkModuleError(message, mergedOptions);
  }

  protected constructor(message: string, options: ModuleErrorOptionsInterface) {
    super(message, options);
  }
}

type ScenarioCase = SubclassExtensionScenarioCaseEntity.Type;

type ScenarioRunner = (scenarioCase: ScenarioCase) => void;

const runnerMap = {
  'audit-instanceof': (scenarioCase) => {
    const input = intakeAuditErrorArguments(scenarioCase.input);
    const expected = scenarioCase.expected;
    const err = AuditError.of(input);
    assert.strictEqual(err instanceof Error, expected.error);
    assert.strictEqual(err instanceof BaseError, expected.baseError);
    assert.strictEqual(err instanceof AuditError, expected.instanceOf);
  },

  'audit-json-base': (scenarioCase) => {
    const input = intakeAuditErrorArguments(scenarioCase.input);
    const expected = scenarioCase.expected;
    const json = AuditError.of(input).toJSON();
    assert.strictEqual(json.code, expected.code);
    assert.ok(typeof json.detail === 'string');
    assert.ok(typeof json.timestamp === 'number');
  },

  'audit-json-extra': (scenarioCase) => {
    const input = intakeAuditErrorArguments(scenarioCase.input);
    const expected = scenarioCase.expected;
    const json = AuditError.of(input).toJSON();
    assert.strictEqual(json.auditId, expected.auditId);
    assert.strictEqual(json.policy, expected.policy);
  },

  'audit-json-independent': (scenarioCase) => {
    const input = intakeAuditErrorArguments(scenarioCase.input);
    const expected = scenarioCase.expected;
    const err = AuditError.of(input);
    const json = err.toJSON();
    const msg = err.toUserMessage();
    assert.strictEqual('auditId' in json, expected.jsonHasAuditId);
    assert.ok(msg.startsWith(String(expected.messagePrefix)));
  },

  'audit-name': (scenarioCase) => {
    const input = intakeAuditErrorArguments(scenarioCase.input);
    const expected = scenarioCase.expected;
    assert.strictEqual(AuditError.of(input).name, expected.name);
  },

  'audit-user-message': (scenarioCase) => {
    const input = intakeAuditErrorArguments(scenarioCase.input);
    const expected = scenarioCase.expected;
    const msg = AuditError.of(input).toUserMessage();
    assert.strictEqual(msg, expected.message);
  },

  'network-cause-chain': (scenarioCase) => {
    const input = scenarioCase.input;
    const expected = scenarioCase.expected;
    const root = RuntimeError.create(String(input.causeMessage));
    const err = NetworkModuleError.create(String(input.message), { cause: root });
    const chain = BaseError.getCauseChain(err);
    assert.strictEqual(chain.length, expected.chainLength);
    assert.strictEqual(chain[0], err);
    assert.strictEqual(chain[1], root);
  },

  'network-find-cause': (scenarioCase) => {
    const input = scenarioCase.input;
    const expected = scenarioCase.expected;
    const root = RuntimeError.create(String(input.causeMessage));
    const err = NetworkModuleError.create(String(input.message), { cause: root });
    const found = BaseError.findCauseOfType(err, RuntimeError);
    assert.strictEqual(found instanceof RuntimeError, expected.found);
    assert.strictEqual(found?.name, expected.name);
    assert.strictEqual(found, root);
  },

  'network-has-cause': (scenarioCase) => {
    const input = scenarioCase.input;
    const expected = scenarioCase.expected;
    const root = RuntimeError.create(String(input.causeMessage));
    const err = NetworkModuleError.create(String(input.message), { cause: root });
    assert.strictEqual(BaseError.hasCauseOfType(err, RuntimeError), expected.runtimeError);
  },

  'network-instanceof': (scenarioCase) => {
    const input = scenarioCase.input;
    const expected = scenarioCase.expected;
    const err = NetworkModuleError.create(String(input.message));
    assert.strictEqual(err instanceof Error, expected.error);
    assert.strictEqual(err instanceof BaseError, expected.baseError);
    assert.strictEqual(err instanceof ModuleError, expected.moduleError);
    assert.strictEqual(err instanceof NetworkModuleError, expected.networkModuleError);
  },

  'network-json-context': (scenarioCase) => {
    const input = scenarioCase.input;
    const expected = scenarioCase.expected;
    const json = NetworkModuleError.create(String(input.message), input.context === undefined ? {} : { context: input.context }).toJSON();
    assert.deepStrictEqual(json.context, expected.context);
  },

  'network-json-name': (scenarioCase) => {
    const input = scenarioCase.input;
    const expected = scenarioCase.expected;
    const json = NetworkModuleError.create(String(input.message)).toJSON();
    // RFC 9457 3.1.2: the class name is the problem type's title.
    assert.strictEqual(json.title, expected.name);
  },

  'network-json-status-code': (scenarioCase) => {
    const input = scenarioCase.input;
    const expected = scenarioCase.expected;
    const json = NetworkModuleError.create(String(input.message)).toJSON();
    assert.strictEqual(json.status, expected.status);
  },

  'network-name': (scenarioCase) => {
    const input = scenarioCase.input;
    const expected = scenarioCase.expected;
    assert.strictEqual(NetworkModuleError.create(String(input.message)).name, expected.name);
  }
} satisfies Record<ScenarioCase['shape'], ScenarioRunner>;

function runCase(scenarioCase: ScenarioCase): void {
  runnerMap[scenarioCase.shape](scenarioCase);
}

void describe('Subclass extension', () => {
  const fileData = fileIntake(scenarioGroups);
  for (const scenario of fileData.cases) {
    void it(scenario.name, () => {
      runCase(scenario);
    });
  }
});
