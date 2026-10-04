import { BaseError } from '@studnicky/types/browser';
import assert from 'node:assert/strict';

import type { ScenarioCaseOfType } from '../../../../scripts/test-helpers/scenario-kit/dist/index.js';
import type { ModuleErrorOptionsInterface } from '../../src/interfaces/index.js';

import { ScenarioSuite } from '../../../../scripts/test-helpers/scenario-kit/dist/index.js';
import { ErrorDefaults } from '../../src/constants/index.js';
import { ModuleError } from '../../src/errors/ModuleError.js';
import { RuntimeError } from '../../src/errors/RuntimeError.js';
import { AuditErrorArgumentsEntity } from './entities/AuditErrorArgumentsEntity.js';
import { SubclassExtensionScenarioCaseEntity } from './entities/SubclassExtensionScenarioCaseEntity.js';
import scenarioGroups from './subclass-extension.scenarios.json' with { 'type': 'json' };

class AuditError extends BaseError {
  public override readonly name: string = 'AuditError';

  public readonly auditId: string;
  public readonly policy: string;

  public static of(argumentList: AuditErrorArgumentsEntity.Type): AuditError {
    return new AuditError(argumentList);
  }

  protected constructor(argumentList: AuditErrorArgumentsEntity.Type) {
    super({ 'code': 'audit.failed', 'message': argumentList.message, 'retryable': false });
    this.auditId = argumentList.auditId;
    this.policy = argumentList.policy;
  }

  protected override serializeExtra(): Record<string, unknown> {
    return {
      'auditId': this.auditId,
      'policy': this.policy
    };
  }

  protected override formatUserMessage(): string {
    return `[Audit ${this.auditId}] ${this.message} (policy: ${this.policy})`;
  }
}

class NetworkModuleError extends ModuleError {
  public override readonly name: string = 'NetworkModuleError';

  public static override create(
    message: string,
    options?: Omit<Parameters<typeof ModuleError.create>[1], 'scenario'>
  ): NetworkModuleError {
    const defaults = ErrorDefaults.CONNECTION;
    const mergedOptions: ModuleErrorOptionsInterface = {
      'cause': options?.cause,
      'code': defaults.code,
      'context': options?.context,
      'retryable': options?.retryable ?? defaults.retryable,
      'status': options?.status ?? defaults.status
    };
    return new NetworkModuleError(message, mergedOptions);
  }

  protected constructor(message: string, options: ModuleErrorOptionsInterface) {
    super(message, options);
  }
}

class SubclassExtensionRunners {
  static 'audit-instanceof'(scenarioCase: ScenarioCaseOfType<SubclassExtensionScenarioCaseEntity.Type, 'audit-instanceof'>): void {
    const input = AuditErrorArgumentsEntity.intake(scenarioCase.input);
    const expected = scenarioCase.expected;
    const error = AuditError.of(input);
    assert.strictEqual(error instanceof Error, expected.error);
    assert.strictEqual(error instanceof BaseError, expected.baseError);
    assert.strictEqual(error instanceof AuditError, expected.instanceOf);
  }

  static 'audit-json-base'(scenarioCase: ScenarioCaseOfType<SubclassExtensionScenarioCaseEntity.Type, 'audit-json-base'>): void {
    const input = AuditErrorArgumentsEntity.intake(scenarioCase.input);
    const expected = scenarioCase.expected;
    const json = AuditError.of(input).toJSON();
    assert.strictEqual(json.code, expected.code);
    assert.ok(typeof json.detail === 'string');
    assert.ok(typeof json.timestamp === 'number');
  }

  static 'audit-json-extra'(scenarioCase: ScenarioCaseOfType<SubclassExtensionScenarioCaseEntity.Type, 'audit-json-extra'>): void {
    const input = AuditErrorArgumentsEntity.intake(scenarioCase.input);
    const expected = scenarioCase.expected;
    const json = AuditError.of(input).toJSON();
    assert.strictEqual(json.auditId, expected.auditId);
    assert.strictEqual(json.policy, expected.policy);
  }

  static 'audit-json-independent'(scenarioCase: ScenarioCaseOfType<SubclassExtensionScenarioCaseEntity.Type, 'audit-json-independent'>): void {
    const input = AuditErrorArgumentsEntity.intake(scenarioCase.input);
    const expected = scenarioCase.expected;
    const error = AuditError.of(input);
    const json = error.toJSON();
    const message = error.toUserMessage();
    assert.strictEqual('auditId' in json, expected.jsonHasAuditId);
    assert.ok(message.startsWith(String(expected.messagePrefix)));
  }

  static 'audit-name'(scenarioCase: ScenarioCaseOfType<SubclassExtensionScenarioCaseEntity.Type, 'audit-name'>): void {
    const input = AuditErrorArgumentsEntity.intake(scenarioCase.input);
    const expected = scenarioCase.expected;
    assert.strictEqual(AuditError.of(input).name, expected.name);
  }

  static 'audit-user-message'(scenarioCase: ScenarioCaseOfType<SubclassExtensionScenarioCaseEntity.Type, 'audit-user-message'>): void {
    const input = AuditErrorArgumentsEntity.intake(scenarioCase.input);
    const expected = scenarioCase.expected;
    const message = AuditError.of(input).toUserMessage();
    assert.strictEqual(message, expected.message);
  }

  static 'network-cause-chain'(scenarioCase: ScenarioCaseOfType<SubclassExtensionScenarioCaseEntity.Type, 'network-cause-chain'>): void {
    const input = scenarioCase.input;
    const expected = scenarioCase.expected;
    const root = RuntimeError.create(String(input.causeMessage));
    const error = NetworkModuleError.create(String(input.message), { 'cause': root });
    const chain = BaseError.getCauseChain(error);
    assert.strictEqual(chain.length, expected.chainLength);
    assert.strictEqual(chain[0], error);
    assert.strictEqual(chain[1], root);
  }

  static 'network-find-cause'(scenarioCase: ScenarioCaseOfType<SubclassExtensionScenarioCaseEntity.Type, 'network-find-cause'>): void {
    const input = scenarioCase.input;
    const expected = scenarioCase.expected;
    const root = RuntimeError.create(String(input.causeMessage));
    const error = NetworkModuleError.create(String(input.message), { 'cause': root });
    const found = BaseError.findCauseOfType(error, RuntimeError);
    assert.strictEqual(found instanceof RuntimeError, expected.found);
    assert.strictEqual(found?.name, expected.name);
    assert.strictEqual(found, root);
  }

  static 'network-has-cause'(scenarioCase: ScenarioCaseOfType<SubclassExtensionScenarioCaseEntity.Type, 'network-has-cause'>): void {
    const input = scenarioCase.input;
    const expected = scenarioCase.expected;
    const root = RuntimeError.create(String(input.causeMessage));
    const error = NetworkModuleError.create(String(input.message), { 'cause': root });
    assert.strictEqual(BaseError.hasCauseOfType(error, RuntimeError), expected.runtimeError);
  }

  static 'network-instanceof'(scenarioCase: ScenarioCaseOfType<SubclassExtensionScenarioCaseEntity.Type, 'network-instanceof'>): void {
    const input = scenarioCase.input;
    const expected = scenarioCase.expected;
    const error = NetworkModuleError.create(String(input.message));
    assert.strictEqual(error instanceof Error, expected.error);
    assert.strictEqual(error instanceof BaseError, expected.baseError);
    assert.strictEqual(error instanceof ModuleError, expected.moduleError);
    assert.strictEqual(error instanceof NetworkModuleError, expected.networkModuleError);
  }

  static 'network-json-context'(scenarioCase: ScenarioCaseOfType<SubclassExtensionScenarioCaseEntity.Type, 'network-json-context'>): void {
    const input = scenarioCase.input;
    const expected = scenarioCase.expected;
    const json = NetworkModuleError.create(String(input.message), input.context === undefined ? {} : { 'context': input.context }).toJSON();
    assert.deepStrictEqual(json.context, expected.context);
  }

  static 'network-json-name'(scenarioCase: ScenarioCaseOfType<SubclassExtensionScenarioCaseEntity.Type, 'network-json-name'>): void {
    const input = scenarioCase.input;
    const expected = scenarioCase.expected;
    const json = NetworkModuleError.create(String(input.message)).toJSON();
    // RFC 9457 3.1.2: the class name is the problem type's title.
    assert.strictEqual(json.title, expected.name);
  }

  static 'network-json-status-code'(scenarioCase: ScenarioCaseOfType<SubclassExtensionScenarioCaseEntity.Type, 'network-json-status-code'>): void {
    const input = scenarioCase.input;
    const expected = scenarioCase.expected;
    const json = NetworkModuleError.create(String(input.message)).toJSON();
    assert.strictEqual(json.status, expected.status);
  }

  static 'network-name'(scenarioCase: ScenarioCaseOfType<SubclassExtensionScenarioCaseEntity.Type, 'network-name'>): void {
    const input = scenarioCase.input;
    const expected = scenarioCase.expected;
    assert.strictEqual(NetworkModuleError.create(String(input.message)).name, expected.name);
  }
}

ScenarioSuite.register({
  'entity': SubclassExtensionScenarioCaseEntity,
  'file': scenarioGroups,
  'name': 'Subclass extension',
  'runners': SubclassExtensionRunners
});
