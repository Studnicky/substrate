import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { EntityCompiler as NodeEntityCompiler } from '../../../src/node/index.js';
import { EntityCompiler as BrowserEntityCompiler } from '../../../src/browser/index.js';

interface KeywordCaseInterface {
  readonly 'name': string;
  readonly 'schema': Readonly<Record<string, unknown>>;
  readonly 'value': unknown;
}

/**
 * Ajv (`node`) and `@cfworker/json-schema` (`browser`) each emit their own prose for a
 * validation failure, and each walks a live value differently (Ajv by property access,
 * cfworker's projection by own-key enumeration). Both registries route their diagnostics
 * through the shared `EntityDiagnostics` canonical vocabulary and the same JSON-instance
 * projection, so the same schema and the same value produce byte-identical validity and
 * `message` on either runtime — including for values a plain object literal can't exercise.
 */
/** Own-enumerable `a`, inherited-enumerable `extra`, declared non-enumerable `status`. */
const buildMixedKeyClassValue = (): Record<string, unknown> => {
  const prototype = { 'extra': 1 };
  const value = Object.create(prototype) as Record<string, unknown>;
  Object.defineProperty(value, 'status', { 'configurable': true, 'enumerable': false, 'value': 200, 'writable': true });
  value.a = 'x';
  return value;
};

void describe('EntityDiagnostics parity across node and browser registries', () => {
  void it('agrees on an Error subclass with a non-enumerable declared property', () => {
    const schema = {
      '$id': 'https://studnicky.dev/schemas/entity-diagnostics-parity-error-subclass',
      'additionalProperties': true,
      'properties': { 'message': { 'type': 'string' }, 'status': { 'type': 'number' } },
      'required': ['message', 'status'],
      'type': 'object'
    };

    class StatusError extends Error {
      public status: number;
      public constructor(message: string, status: number) {
        super(message);
        this.status = status;
      }
    }
    const value = new StatusError('boom', 503);

    const nodeValidate = NodeEntityCompiler.compile<Record<string, unknown>>(schema);
    const browserValidate = BrowserEntityCompiler.compile<Record<string, unknown>>(schema);

    assert.equal(nodeValidate(value), true);
    assert.equal(browserValidate(value), true);
  });

  void it('agrees on a declared property inherited from a prototype, not own', () => {
    const schema = {
      '$id': 'https://studnicky.dev/schemas/entity-diagnostics-parity-inherited',
      'properties': { 'status': { 'type': 'number' } },
      'required': ['status'],
      'type': 'object'
    };
    const prototype = { 'status': 200 };
    const value = Object.create(prototype) as Record<string, unknown>;

    const nodeValidate = NodeEntityCompiler.compile<Record<string, unknown>>(schema);
    const browserValidate = BrowserEntityCompiler.compile<Record<string, unknown>>(schema);

    assert.equal(nodeValidate(value), true);
    assert.equal(browserValidate(value), true);
  });

  void it('agrees a declared property explicitly set to undefined is absent', () => {
    const schema = {
      '$id': 'https://studnicky.dev/schemas/entity-diagnostics-parity-undefined-declared',
      'properties': { 'message': { 'type': 'string' } },
      'required': ['message'],
      'type': 'object'
    };
    const value = { 'message': undefined };

    const nodeValidate = NodeEntityCompiler.compile<Record<string, unknown>>(schema);
    const browserValidate = BrowserEntityCompiler.compile<Record<string, unknown>>(schema);

    assert.equal(nodeValidate(value), false);
    assert.equal(browserValidate(value), false);
    assert.equal(browserValidate.errors?.[0]?.message, nodeValidate.errors?.[0]?.message);
    assert.equal(nodeValidate.errors?.[0]?.message, "must have required property 'message'");
  });

  void it('agrees a non-finite number fails a declared number type', () => {
    const schema = {
      '$id': 'https://studnicky.dev/schemas/entity-diagnostics-parity-non-finite',
      'properties': { 'value': { 'type': 'number' } },
      'required': ['value'],
      'type': 'object'
    };
    const value = { 'value': Number.NaN };

    const nodeValidate = NodeEntityCompiler.compile<Record<string, unknown>>(schema);
    const browserValidate = BrowserEntityCompiler.compile<Record<string, unknown>>(schema);

    assert.equal(nodeValidate(value), false);
    assert.equal(browserValidate(value), false);
    assert.equal(browserValidate.errors?.[0]?.message, nodeValidate.errors?.[0]?.message);
    assert.equal(nodeValidate.errors?.[0]?.message, 'must be number');
  });

  void it('agrees a cyclic object survives compileCreate on both runtimes', () => {
    const schema = {
      '$id': 'https://studnicky.dev/schemas/entity-diagnostics-parity-cyclic-create',
      'additionalProperties': true,
      'properties': { 'context': { 'type': 'object' } },
      'type': 'object'
    };
    const nodeCreate = NodeEntityCompiler.compileCreate<Record<string, unknown>>(schema);
    const browserCreate = BrowserEntityCompiler.compileCreate<Record<string, unknown>>(schema);

    const nodeCyclic: Record<string, unknown> = {};
    nodeCyclic.context = nodeCyclic;
    const browserCyclic: Record<string, unknown> = {};
    browserCyclic.context = browserCyclic;

    const nodeResult = nodeCreate(nodeCyclic);
    const browserResult = browserCreate(browserCyclic);

    assert.notStrictEqual(nodeResult, nodeCyclic);
    assert.strictEqual(nodeResult.context, nodeResult);
    assert.notStrictEqual(browserResult, browserCyclic);
    assert.strictEqual(browserResult.context, browserResult);
  });

  void it('agrees an undeclared inherited enumerable property trips additionalProperties: false', () => {
    const schema = {
      '$id': 'https://studnicky.dev/schemas/entity-diagnostics-parity-inherited-additional-false',
      'additionalProperties': false,
      'properties': { 'a': { 'type': 'string' } },
      'type': 'object'
    };
    const value = Object.setPrototypeOf({ 'a': 'x' }, { 'extra': 1 }) as Record<string, unknown>;

    const nodeValidate = NodeEntityCompiler.compile<Record<string, unknown>>(schema);
    const browserValidate = BrowserEntityCompiler.compile<Record<string, unknown>>(schema);

    assert.equal(nodeValidate(value), false);
    assert.equal(browserValidate(value), false);
    assert.equal(browserValidate.errors?.[0]?.message, nodeValidate.errors?.[0]?.message);
    assert.equal(nodeValidate.errors?.[0]?.message, 'must NOT have additional properties');
  });

  void it('agrees an undeclared inherited enumerable property survives additionalProperties: true', () => {
    const schema = {
      '$id': 'https://studnicky.dev/schemas/entity-diagnostics-parity-inherited-additional-true',
      'additionalProperties': true,
      'properties': { 'a': { 'type': 'string' } },
      'type': 'object'
    };
    const value = Object.setPrototypeOf({ 'a': 'x' }, { 'extra': 1 }) as Record<string, unknown>;

    const nodeValidate = NodeEntityCompiler.compile<Record<string, unknown>>(schema);
    const browserValidate = BrowserEntityCompiler.compile<Record<string, unknown>>(schema);

    assert.equal(nodeValidate(value), true);
    assert.equal(browserValidate(value), true);
  });

  void it('agrees an undeclared inherited non-enumerable property is invisible to for...in on both engines', () => {
    const prototype: Record<string, unknown> = {};
    Object.defineProperty(prototype, 'extra', { 'configurable': true, 'enumerable': false, 'value': 1, 'writable': true });
    const schema = {
      '$id': 'https://studnicky.dev/schemas/entity-diagnostics-parity-inherited-non-enumerable',
      'additionalProperties': false,
      'properties': { 'a': { 'type': 'string' } },
      'type': 'object'
    };
    const value = Object.setPrototypeOf({ 'a': 'x' }, prototype) as Record<string, unknown>;

    const nodeValidate = NodeEntityCompiler.compile<Record<string, unknown>>(schema);
    const browserValidate = BrowserEntityCompiler.compile<Record<string, unknown>>(schema);

    assert.equal(nodeValidate(value), true);
    assert.equal(browserValidate(value), true);
  });

  void it('agrees minProperties/maxProperties count only own-enumerable keys across all three key classes', () => {
    const minSchema = {
      '$id': 'https://studnicky.dev/schemas/entity-diagnostics-parity-mixed-min-properties',
      'minProperties': 2,
      'properties': { 'status': { 'type': 'number' } },
      'type': 'object'
    };
    const maxSchema = {
      '$id': 'https://studnicky.dev/schemas/entity-diagnostics-parity-mixed-max-properties',
      'maxProperties': 0,
      'properties': { 'status': { 'type': 'number' } },
      'type': 'object'
    };

    const nodeMin = NodeEntityCompiler.compile<Record<string, unknown>>(minSchema);
    const browserMin = BrowserEntityCompiler.compile<Record<string, unknown>>(minSchema);
    assert.equal(nodeMin(buildMixedKeyClassValue()), false);
    assert.equal(browserMin(buildMixedKeyClassValue()), false);
    assert.equal(browserMin.errors?.[0]?.message, nodeMin.errors?.[0]?.message);
    assert.equal(nodeMin.errors?.[0]?.message, 'must NOT have fewer than 2 properties');

    const nodeMax = NodeEntityCompiler.compile<Record<string, unknown>>(maxSchema);
    const browserMax = BrowserEntityCompiler.compile<Record<string, unknown>>(maxSchema);
    assert.equal(nodeMax(buildMixedKeyClassValue()), false);
    assert.equal(browserMax(buildMixedKeyClassValue()), false);
    assert.equal(browserMax.errors?.[0]?.message, nodeMax.errors?.[0]?.message);
    assert.equal(nodeMax.errors?.[0]?.message, 'must NOT have more than 0 properties');
  });

  /**
   * `propertyNames`/`unevaluatedProperties` have no canonical `EntityDiagnostics` renderer yet,
   * so message text diverges regardless of inheritance; only validity parity is asserted here.
   */
  void it('agrees on validity for propertyNames and unevaluatedProperties against an inherited enumerable key', () => {
    const value = Object.setPrototypeOf({ 'a': 'x' }, { 'BAD': 1 }) as Record<string, unknown>;
    const propertyNamesSchema = {
      '$id': 'https://studnicky.dev/schemas/entity-diagnostics-parity-inherited-property-names',
      'properties': { 'a': { 'type': 'string' } },
      'propertyNames': { 'pattern': '^[a-z]+$' },
      'type': 'object'
    };
    const unevaluatedSchema = {
      '$id': 'https://studnicky.dev/schemas/entity-diagnostics-parity-inherited-unevaluated',
      'properties': { 'a': { 'type': 'string' } },
      'type': 'object',
      'unevaluatedProperties': false
    };

    const nodePropertyNames = NodeEntityCompiler.compile<Record<string, unknown>>(propertyNamesSchema);
    const browserPropertyNames = BrowserEntityCompiler.compile<Record<string, unknown>>(propertyNamesSchema);
    assert.equal(nodePropertyNames(value), false);
    assert.equal(browserPropertyNames(value), false);

    const nodeUnevaluated = NodeEntityCompiler.compile<Record<string, unknown>>(unevaluatedSchema);
    const browserUnevaluated = BrowserEntityCompiler.compile<Record<string, unknown>>(unevaluatedSchema);
    assert.equal(nodeUnevaluated(value), false);
    assert.equal(browserUnevaluated(value), false);
  });

  const keywordCases: readonly KeywordCaseInterface[] = [
    {
      'name': 'type',
      'schema': { '$id': 'https://studnicky.dev/schemas/entity-diagnostics-parity-type', 'type': 'string' },
      'value': 3
    },
    {
      'name': 'minimum',
      'schema': { '$id': 'https://studnicky.dev/schemas/entity-diagnostics-parity-minimum', 'minimum': 5, 'type': 'number' },
      'value': 1
    },
    {
      'name': 'maximum',
      'schema': { '$id': 'https://studnicky.dev/schemas/entity-diagnostics-parity-maximum', 'maximum': 5, 'type': 'number' },
      'value': 9
    },
    {
      'name': 'exclusiveMinimum',
      'schema': { '$id': 'https://studnicky.dev/schemas/entity-diagnostics-parity-exclusive-minimum', 'exclusiveMinimum': 5, 'type': 'number' },
      'value': 5
    },
    {
      'name': 'exclusiveMaximum',
      'schema': { '$id': 'https://studnicky.dev/schemas/entity-diagnostics-parity-exclusive-maximum', 'exclusiveMaximum': 5, 'type': 'number' },
      'value': 5
    },
    {
      'name': 'multipleOf',
      'schema': { '$id': 'https://studnicky.dev/schemas/entity-diagnostics-parity-multiple-of', 'multipleOf': 2, 'type': 'number' },
      'value': 3
    },
    {
      'name': 'minLength',
      'schema': { '$id': 'https://studnicky.dev/schemas/entity-diagnostics-parity-min-length', 'minLength': 3, 'type': 'string' },
      'value': 'ab'
    },
    {
      'name': 'maxLength',
      'schema': { '$id': 'https://studnicky.dev/schemas/entity-diagnostics-parity-max-length', 'maxLength': 3, 'type': 'string' },
      'value': 'abcd'
    },
    {
      'name': 'minItems',
      'schema': { '$id': 'https://studnicky.dev/schemas/entity-diagnostics-parity-min-items', 'minItems': 2, 'type': 'array' },
      'value': [1]
    },
    {
      'name': 'maxItems',
      'schema': { '$id': 'https://studnicky.dev/schemas/entity-diagnostics-parity-max-items', 'maxItems': 2, 'type': 'array' },
      'value': [1, 2, 3]
    },
    {
      'name': 'minProperties',
      'schema': { '$id': 'https://studnicky.dev/schemas/entity-diagnostics-parity-min-properties', 'minProperties': 2, 'type': 'object' },
      'value': { 'a': 1 }
    },
    {
      'name': 'maxProperties',
      'schema': { '$id': 'https://studnicky.dev/schemas/entity-diagnostics-parity-max-properties', 'maxProperties': 1, 'type': 'object' },
      'value': { 'a': 1, 'b': 2 }
    },
    {
      'name': 'pattern',
      'schema': { '$id': 'https://studnicky.dev/schemas/entity-diagnostics-parity-pattern', 'pattern': '^a', 'type': 'string' },
      'value': 'b'
    },
    {
      'name': 'format',
      'schema': { '$id': 'https://studnicky.dev/schemas/entity-diagnostics-parity-format', 'format': 'email', 'type': 'string' },
      'value': 'not-an-email'
    },
    {
      'name': 'additionalProperties',
      'schema': {
        '$id': 'https://studnicky.dev/schemas/entity-diagnostics-parity-additional-properties',
        'additionalProperties': false,
        'properties': { 'a': { 'type': 'string' } },
        'type': 'object'
      },
      'value': { 'a': 'x', 'b': 1 }
    },
    {
      'name': 'uniqueItems',
      'schema': { '$id': 'https://studnicky.dev/schemas/entity-diagnostics-parity-unique-items', 'type': 'array', 'uniqueItems': true },
      'value': [1, 1]
    },
    {
      'name': 'enum',
      'schema': { '$id': 'https://studnicky.dev/schemas/entity-diagnostics-parity-enum', 'enum': ['a', 'b'] },
      'value': 'c'
    },
    {
      'name': 'const',
      'schema': { '$id': 'https://studnicky.dev/schemas/entity-diagnostics-parity-const', 'const': 'a' },
      'value': 'b'
    },
    {
      'name': 'required',
      'schema': {
        '$id': 'https://studnicky.dev/schemas/entity-diagnostics-parity-required',
        'properties': { 'x': { 'type': 'string' } },
        'required': ['x'],
        'type': 'object'
      },
      'value': {}
    }
  ];

  const keywordCaseCount = keywordCases.length;
  for (let index = 0; index < keywordCaseCount; index += 1) {
    const keywordCase = keywordCases[index]!;
    void it(`renders a byte-identical message for '${keywordCase.name}' on both runtimes`, () => {
      const nodeValidate = NodeEntityCompiler.compile<unknown>(keywordCase.schema);
      const browserValidate = BrowserEntityCompiler.compile<unknown>(keywordCase.schema);

      assert.equal(nodeValidate(keywordCase.value), false);
      assert.equal(browserValidate(keywordCase.value), false);

      const nodeMessage = nodeValidate.errors?.[0]?.message;
      const browserMessage = browserValidate.errors?.[0]?.message;

      assert.ok(nodeMessage !== undefined);
      assert.equal(browserMessage, nodeMessage);
    });
  }
});
