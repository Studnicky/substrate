import { BaseError } from '@studnicky/types/node';
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import * as BrowserEntry from '../../../src/browser/index.js';
import * as NodeEntry from '../../../src/node/index.js';
import { SchemaIntakeError } from '../../../src/SchemaIntakeError.js';

const SCHEMA = {
  '$id': 'https://studnicky.dev/schemas/entity-compiler-browser-csp',
  'additionalProperties': false,
  'properties': {
    'host': { 'default': 'localhost', 'type': 'string' },
    'port': { 'type': 'integer' },
    'region': { 'type': 'string' }
  },
  'required': ['port'],
  'type': 'object'
} as const;

/** Proxy handler that counts `Function(...)` and `new Function(...)` invocations. */
class FunctionConstructionTrap implements ProxyHandler<FunctionConstructor> {
  public constructions = 0;

  public apply(target: FunctionConstructor, thisArgument: unknown, argumentList: string[]): unknown {
    this.constructions += 1;
    const result: unknown = Reflect.apply(target, thisArgument, argumentList);
    return result;
  }

  public construct(target: FunctionConstructor, argumentList: string[], newTarget: Function): object {
    this.constructions += 1;
    const instance: unknown = Reflect.construct(target, argumentList, newTarget);
    if (typeof instance === 'object' && instance !== null) {
      return instance;
    }
    throw new CspProbeError('Function construction did not produce an object');
  }
}

class CspProbeError extends BaseError {
  public override readonly name: string = 'CspProbeError';

  public constructor(message: string) {
    super({
      'code': 'entity.cspProbe',
      'message': message,
      'retryable': false
    });
  }
}

class CspProbe {
  /** Counts `Function`/`new Function` constructions during `run`, restoring the real constructor afterward. */
  public static countDynamicCodeConstructions(run: () => void): number {
    const RealFunction = globalThis.Function;
    const trap = new FunctionConstructionTrap();
    globalThis.Function = new Proxy(RealFunction, trap);
    try {
      run();
    } finally {
      globalThis.Function = RealFunction;
    }
    return trap.constructions;
  }

  /** Runs `intake` with an input missing its required property and returns the reported missing property name. */
  public static captureMissingProperty(intake: (input: { 'port'?: number }) => unknown): unknown {
    let missingProperty: unknown;
    assert.throws(() => {
      intake({});
    }, (error: unknown) => {
      assert.ok(error instanceof SchemaIntakeError);
      missingProperty = error.errors[0]?.parameters.missingProperty;
      return true;
    });
    return missingProperty;
  }
}

void describe('EntityCompiler browser CSP safety', () => {
  void it('compiles and validates through the browser path without constructing dynamic code', () => {
    const constructions = CspProbe.countDynamicCodeConstructions(() => {
      const validate = BrowserEntry.EntityCompiler.compile<{ 'host': string; 'port': number }>(SCHEMA);
      validate({ 'host': 'localhost', 'port': 8080 });
      validate({ 'port': 'not-a-number' });
    });

    assert.equal(constructions, 0);
  });

  void it('compiles and validates through the node path without constructing dynamic code', () => {
    const constructions = CspProbe.countDynamicCodeConstructions(() => {
      const validate = NodeEntry.EntityCompiler.compile<{ 'host': string; 'port': number }>(SCHEMA);
      validate({ 'host': 'localhost', 'port': 8080 });
      validate({ 'port': 'not-a-number' });
    });

    assert.equal(constructions, 0);
  });

  void it('rejects the same payload the node path rejects, with the same error shape', () => {
    const browserValidate = BrowserEntry.EntityCompiler.compile<{ 'port': number }>(SCHEMA);
    const nodeValidate = NodeEntry.EntityCompiler.compile<{ 'port': number }>(SCHEMA);
    const valid = { 'host': 'db.internal', 'port': 5432 };
    const invalid = { 'host': 'db.internal', 'port': 'five-four-three-two' };

    assert.equal(browserValidate(valid), true);
    assert.equal(nodeValidate(valid), true);

    assert.equal(browserValidate(invalid), false);
    assert.equal(nodeValidate(invalid), false);
    const browserError = browserValidate.errors?.[0];
    const nodeError = nodeValidate.errors?.[0];
    assert.ok(browserError !== undefined);
    assert.ok(nodeError !== undefined);
    assert.equal(browserError.keyword, nodeError.keyword);
    assert.equal(browserError.instancePath, nodeError.instancePath);
  });

  void it('fills defaults and reports a missing required property the same way as the node path', () => {
    const browserIntake = BrowserEntry.EntityCompiler.compileIntake<{ 'host': string; 'port': number }>(SCHEMA);
    const nodeIntake = NodeEntry.EntityCompiler.compileIntake<{ 'host': string; 'port': number }>(SCHEMA);
    const input = { 'port': 8080 };

    assert.deepEqual(browserIntake(input), { 'host': 'localhost', 'port': 8080 });
    assert.deepEqual(input, { 'port': 8080 });
    assert.deepEqual(nodeIntake({ 'port': 8080 }), { 'host': 'localhost', 'port': 8080 });

    const browserMissingProperty = CspProbe.captureMissingProperty(browserIntake);
    const nodeMissingProperty = CspProbe.captureMissingProperty(nodeIntake);

    assert.equal(browserMissingProperty, 'port');
    assert.equal(browserMissingProperty, nodeMissingProperty);
  });
});
