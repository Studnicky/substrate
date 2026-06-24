/**
 * Subclass-extension tests — verify the protected seams on `BaseError` and `ModuleError`.
 *
 * Two extension scenarios:
 *   1. `AuditError extends BaseError` — overrides `serializeExtra()` and
 *      `formatUserMessage()`.
 *   2. `NetworkModuleError extends ModuleError` — verifies that `name` resolves
 *      to the concrete subclass and that cause-chain helpers + toJSON work correctly.
 */

import type { ModuleErrorOptionsType } from '../../src/interfaces/index.js';

import {
  deepStrictEqual,
  ok,
  strictEqual
} from 'node:assert/strict';
import {
  describe,
  it
} from 'node:test';

import { ErrorDefaults } from '../../src/constants/index.js';
import { BaseError } from '../../src/errors/BaseError.js';
import { ErrorCodeRegistry } from '../../src/errors/ErrorCodeRegistry.js';
import { ModuleError } from '../../src/errors/ModuleError.js';

// ---------------------------------------------------------------------------
// AuditError — extends BaseError, overrides serializeExtra + formatUserMessage
// ---------------------------------------------------------------------------

ErrorCodeRegistry.register({
  'code': 'audit.failed',
  'description': 'Audit check failed.',
  'retryable': false
});

type AuditErrorArgumentsType = {
  readonly 'auditId': string;
  readonly 'message': string;
  readonly 'policy': string;
};

class AuditError extends BaseError {
  public readonly auditId: string;
  public readonly policy: string;

  public static of(args: AuditErrorArgumentsType): AuditError {
    return new AuditError(args);
  }

  protected constructor(args: AuditErrorArgumentsType) {
    super({ 'code': 'audit.failed', 'message': args.message, 'retryable': false });
    this.auditId = args.auditId;
    this.policy = args.policy;
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

// ---------------------------------------------------------------------------
// NetworkModuleError — extends ModuleError, proves name fix
// ---------------------------------------------------------------------------

class NetworkModuleError extends ModuleError {
  public static override create(
    message: string,
    options?: Omit<Parameters<typeof ModuleError.create>[1], 'scenario'>
  ): NetworkModuleError {
    const defaults = ErrorDefaults.CONNECTION;
    const mergedOptions: ModuleErrorOptionsType = {
      'cause': options?.cause,
      'code': defaults.code,
      'context': options?.context,
      'retryable': options?.retryable ?? defaults.retryable,
      'statusCode': options?.statusCode ?? defaults.statusCode
    };
    return new NetworkModuleError(message, mergedOptions);
  }

  protected constructor(message: string, options: ModuleErrorOptionsType) {
    super(message, options);
  }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

void describe('AuditError extends BaseError', () => {
  void it('name is AuditError (new.target.name)', () => {
    const err = AuditError.of({ 'auditId': 'a1', 'message': 'check failed', 'policy': 'SOC2' });
    strictEqual(err.name, 'AuditError');
  });

  void it('is instanceof BaseError and Error', () => {
    const err = AuditError.of({ 'auditId': 'a1', 'message': 'check failed', 'policy': 'SOC2' });
    ok(err instanceof Error);
    ok(err instanceof BaseError);
    ok(err instanceof AuditError);
  });

  void it('toJSON includes extra fields from serializeExtra()', () => {
    const err = AuditError.of({ 'auditId': 'a42', 'message': 'rule violation', 'policy': 'PCI' });
    const json = err.toJSON() as Record<string, unknown>;
    strictEqual(json['auditId'], 'a42');
    strictEqual(json['policy'], 'PCI');
  });

  void it('toJSON still includes base fields', () => {
    const err = AuditError.of({ 'auditId': 'a1', 'message': 'check failed', 'policy': 'SOC2' });
    const json = err.toJSON() as Record<string, unknown>;
    strictEqual(json['code'], 'audit.failed');
    ok(typeof json['message'] === 'string');
    ok(typeof json['timestamp'] === 'number');
  });

  void it('toUserMessage uses formatUserMessage() override', () => {
    const err = AuditError.of({ 'auditId': 'a99', 'message': 'access denied', 'policy': 'HIPAA' });
    const msg = err.toUserMessage();
    ok(msg.includes('a99'), 'should include auditId');
    ok(msg.includes('access denied'), 'should include message');
    ok(msg.includes('HIPAA'), 'should include policy');
    strictEqual(msg, '[Audit a99] access denied (policy: HIPAA)');
  });

  void it('toJSON and toUserMessage are independent', () => {
    const err = AuditError.of({ 'auditId': 'a1', 'message': 'check failed', 'policy': 'SOC2' });
    const json = err.toJSON() as Record<string, unknown>;
    const msg = err.toUserMessage();
    // serializeExtra fields appear in JSON but not necessarily in the user message
    ok('auditId' in json);
    ok(msg.startsWith('[Audit'));
  });
});

void describe('NetworkModuleError extends ModuleError', () => {
  void it('name is NetworkModuleError (name-bug fix)', () => {
    const err = NetworkModuleError.create('Connection refused');
    strictEqual(err.name, 'NetworkModuleError');
  });

  void it('is instanceof ModuleError, BaseError, and Error', () => {
    const err = NetworkModuleError.create('Connection refused');
    ok(err instanceof Error);
    ok(err instanceof BaseError);
    ok(err instanceof ModuleError);
    ok(err instanceof NetworkModuleError);
  });

  void it('getCauseChain() works on subclass instance', () => {
    const root = new Error('socket hung up');
    const err = NetworkModuleError.create('Connection refused', { 'cause': root });
    const chain = err.getCauseChain();
    strictEqual(chain.length, 2);
    strictEqual(chain[0], err);
    strictEqual(chain[1], root);
  });

  void it('findCauseOfType() works on subclass instance', () => {
    const root = new TypeError('bad address');
    const err = NetworkModuleError.create('Connection refused', { 'cause': root });
    const found = err.findCauseOfType(TypeError);
    ok(found instanceof TypeError);
    strictEqual(found, root);
  });

  void it('hasCauseOfType() works on subclass instance', () => {
    const root = new RangeError('port out of range');
    const err = NetworkModuleError.create('Connection refused', { 'cause': root });
    ok(err.hasCauseOfType(RangeError));
    strictEqual(err.hasCauseOfType(TypeError), false);
  });

  void it('toJSON includes name as NetworkModuleError', () => {
    const err = NetworkModuleError.create('Connection refused');
    const json = err.toJSON() as Record<string, unknown>;
    strictEqual(json['name'], 'NetworkModuleError');
  });

  void it('toJSON includes statusCode from CONNECTION scenario', () => {
    const err = NetworkModuleError.create('Connection refused');
    const json = err.toJSON() as Record<string, unknown>;
    strictEqual(json['statusCode'], 503);
  });

  void it('toJSON includes context when provided', () => {
    const ctx = { 'host': 'db.example.com', 'port': 5432 };
    const err = NetworkModuleError.create('Connection refused', { 'context': ctx });
    const json = err.toJSON() as Record<string, unknown>;
    deepStrictEqual(json['context'], ctx);
  });
});
