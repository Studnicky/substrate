import { BaseError } from '@studnicky/types/node';
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import * as browserEntry from '../../../src/browser/index.js';
import * as nodeEntry from '../../../src/node/index.js';

interface KeywordCaseInterface {
  readonly 'name': string;
  readonly 'schema': Readonly<Record<string, unknown>>;
  readonly 'value': unknown;
}

/**
 * `node` and `browser` both resolve to the specialised-closure engine, so identical validity and
 * `message` output on either entrypoint is a structural guarantee, not a claim under test here.
 * What this file pins down is the engine's own instance projection — own-enumerable, defined-value
 * keys only, matching `JSON.stringify` — against JS object shapes a schema fixture can't express:
 * inherited properties, non-enumerable properties, and explicit `undefined` values.
 */
class MixedKeyFixtures {
  /** Own-enumerable `a`, inherited-enumerable `extra`, declared non-enumerable `status`. */
  static buildClassValue(): Record<string, unknown> {
    const value: Record<string, unknown> = {};
    Object.setPrototypeOf(value, { 'extra': 1 });
    Object.defineProperty(value, 'status', { 'configurable': true, 'enumerable': false, 'value': 200, 'writable': true });
    value.a = 'x';
    return value;
  }
}

void describe('EntityDiagnostics parity across node and browser registries', () => {
  void it('agrees on an Error subclass with a non-enumerable declared property', () => {
    const schema = {
      '$id': 'https://studnicky.dev/schemas/entity-diagnostics-parity-error-subclass',
      'additionalProperties': true,
      'properties': { 'message': { 'type': 'string' }, 'status': { 'type': 'number' } },
      'required': ['message', 'status'],
      'type': 'object'
    };

    class StatusError extends BaseError {
      public override readonly name: string = 'StatusError';
      public constructor(message: string, status: number) {
        super({ 'code': 'test.status', 'message': message, 'status': status });
      }
    }
    const value = new StatusError('boom', 503);

    const nodeValidate = nodeEntry.EntityCompiler.compile<Record<string, unknown>>(schema);
    const browserValidate = browserEntry.EntityCompiler.compile<Record<string, unknown>>(schema);

    assert.equal(nodeValidate(value), true);
    assert.equal(browserValidate(value), true);
  });

  // `JSON.stringify` drops inherited properties (own-enumerable only), so a JSON Schema `required`
  // check must too: an inherited, non-own `status` does not satisfy `required: ['status']`.
  void it('agrees a declared property inherited from a prototype, not own, does not satisfy required', () => {
    const schema = {
      '$id': 'https://studnicky.dev/schemas/entity-diagnostics-parity-inherited',
      'properties': { 'status': { 'type': 'number' } },
      'required': ['status'],
      'type': 'object'
    };
    const value: Record<string, unknown> = {};
    Object.setPrototypeOf(value, { 'status': 200 });

    const nodeValidate = nodeEntry.EntityCompiler.compile<Record<string, unknown>>(schema);
    const browserValidate = browserEntry.EntityCompiler.compile<Record<string, unknown>>(schema);

    assert.equal(nodeValidate(value), false);
    assert.equal(browserValidate(value), false);
  });

  void it('agrees a declared property explicitly set to undefined is absent', () => {
    const schema = {
      '$id': 'https://studnicky.dev/schemas/entity-diagnostics-parity-undefined-declared',
      'properties': { 'message': { 'type': 'string' } },
      'required': ['message'],
      'type': 'object'
    };
    const value = { 'message': undefined };

    const nodeValidate = nodeEntry.EntityCompiler.compile<Record<string, unknown>>(schema);
    const browserValidate = browserEntry.EntityCompiler.compile<Record<string, unknown>>(schema);

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

    const nodeValidate = nodeEntry.EntityCompiler.compile<Record<string, unknown>>(schema);
    const browserValidate = browserEntry.EntityCompiler.compile<Record<string, unknown>>(schema);

    assert.equal(nodeValidate(value), false);
    assert.equal(browserValidate(value), false);
    assert.equal(browserValidate.errors?.[0]?.message, nodeValidate.errors?.[0]?.message);
    assert.equal(nodeValidate.errors?.[0]?.message, 'must be number');
  });

  void it('renders a byte-identical message for unevaluatedItems on both runtimes', () => {
    const schema = {
      '$id': 'https://studnicky.dev/schemas/entity-diagnostics-parity-unevaluated-items',
      'prefixItems': [{ 'type': 'string' }],
      'type': 'array',
      'unevaluatedItems': false
    };
    const nodeValidate = nodeEntry.EntityCompiler.compile<unknown>(schema);
    const browserValidate = browserEntry.EntityCompiler.compile<unknown>(schema);

    assert.equal(nodeValidate(['x', 5]), false);
    assert.equal(browserValidate(['x', 5]), false);
    assert.equal(browserValidate.errors?.[0]?.message, nodeValidate.errors?.[0]?.message);
    assert.equal(nodeValidate.errors?.[0]?.message, 'must NOT have more than 1 items');
  });

  void it('agrees a cyclic object survives compileCreate on both runtimes', () => {
    const schema = {
      '$id': 'https://studnicky.dev/schemas/entity-diagnostics-parity-cyclic-create',
      'additionalProperties': true,
      'properties': { 'context': { 'type': 'object' } },
      'type': 'object'
    };
    const nodeCreate = nodeEntry.EntityCompiler.compileCreate<Record<string, unknown>>(schema);
    const browserCreate = browserEntry.EntityCompiler.compileCreate<Record<string, unknown>>(schema);

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

});

void describe('EntityDiagnostics parity across node and browser registries: inherited keys', () => {
  // `JSON.stringify` never serializes an inherited property, so it can never trip `additionalProperties`
  // either — an inherited `extra` is invisible to `additionalProperties: false` the same as `: true`.
  void it('agrees an undeclared inherited enumerable property is invisible to additionalProperties: false', () => {
    const schema = {
      '$id': 'https://studnicky.dev/schemas/entity-diagnostics-parity-inherited-additional-false',
      'additionalProperties': false,
      'properties': { 'a': { 'type': 'string' } },
      'type': 'object'
    };
    const value: Record<string, unknown> = { 'a': 'x' };
    Object.setPrototypeOf(value, { 'extra': 1 });

    const nodeValidate = nodeEntry.EntityCompiler.compile<Record<string, unknown>>(schema);
    const browserValidate = browserEntry.EntityCompiler.compile<Record<string, unknown>>(schema);

    assert.equal(nodeValidate(value), true);
    assert.equal(browserValidate(value), true);
  });

  void it('agrees an undeclared inherited enumerable property survives additionalProperties: true', () => {
    const schema = {
      '$id': 'https://studnicky.dev/schemas/entity-diagnostics-parity-inherited-additional-true',
      'additionalProperties': true,
      'properties': { 'a': { 'type': 'string' } },
      'type': 'object'
    };
    const value: Record<string, unknown> = { 'a': 'x' };
    Object.setPrototypeOf(value, { 'extra': 1 });

    const nodeValidate = nodeEntry.EntityCompiler.compile<Record<string, unknown>>(schema);
    const browserValidate = browserEntry.EntityCompiler.compile<Record<string, unknown>>(schema);

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
    const value: Record<string, unknown> = { 'a': 'x' };
    Object.setPrototypeOf(value, prototype);

    const nodeValidate = nodeEntry.EntityCompiler.compile<Record<string, unknown>>(schema);
    const browserValidate = browserEntry.EntityCompiler.compile<Record<string, unknown>>(schema);

    assert.equal(nodeValidate(value), true);
    assert.equal(browserValidate(value), true);
  });

  void it('agrees minProperties counts only own-enumerable keys across all three key classes', () => {
    const minimumPropertiesSchema = {
      '$id': 'https://studnicky.dev/schemas/entity-diagnostics-parity-mixed-min-properties',
      'minProperties': 2,
      'properties': { 'status': { 'type': 'number' } },
      'type': 'object'
    };

    const nodeMinimumPropertiesValidate = nodeEntry.EntityCompiler.compile<Record<string, unknown>>(minimumPropertiesSchema);
    const browserMinimumPropertiesValidate = browserEntry.EntityCompiler.compile<Record<string, unknown>>(minimumPropertiesSchema);
    assert.equal(nodeMinimumPropertiesValidate(MixedKeyFixtures.buildClassValue()), false);
    assert.equal(browserMinimumPropertiesValidate(MixedKeyFixtures.buildClassValue()), false);
    assert.equal(browserMinimumPropertiesValidate.errors?.[0]?.message, nodeMinimumPropertiesValidate.errors?.[0]?.message);
    assert.equal(nodeMinimumPropertiesValidate.errors?.[0]?.message, 'must NOT have fewer than 2 properties');
  });

  void it('agrees maxProperties counts only own-enumerable keys across all three key classes', () => {
    const maximumPropertiesSchema = {
      '$id': 'https://studnicky.dev/schemas/entity-diagnostics-parity-mixed-max-properties',
      'maxProperties': 0,
      'properties': { 'status': { 'type': 'number' } },
      'type': 'object'
    };

    const nodeMaximumPropertiesValidate = nodeEntry.EntityCompiler.compile<Record<string, unknown>>(maximumPropertiesSchema);
    const browserMaximumPropertiesValidate = browserEntry.EntityCompiler.compile<Record<string, unknown>>(maximumPropertiesSchema);
    assert.equal(nodeMaximumPropertiesValidate(MixedKeyFixtures.buildClassValue()), false);
    assert.equal(browserMaximumPropertiesValidate(MixedKeyFixtures.buildClassValue()), false);
    assert.equal(browserMaximumPropertiesValidate.errors?.[0]?.message, nodeMaximumPropertiesValidate.errors?.[0]?.message);
    assert.equal(nodeMaximumPropertiesValidate.errors?.[0]?.message, 'must NOT have more than 0 properties');
  });

  // An inherited `BAD` is invisible to `Object.keys`, the same own-enumerable projection `JSON.stringify`
  // uses, so neither `propertyNames` nor `unevaluatedProperties` ever sees it to reject.
  void it('agrees propertyNames and unevaluatedProperties are invisible to an inherited enumerable key', () => {
    const value: Record<string, unknown> = { 'a': 'x' };
    Object.setPrototypeOf(value, { 'BAD': 1 });
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

    const nodePropertyNames = nodeEntry.EntityCompiler.compile<Record<string, unknown>>(propertyNamesSchema);
    const browserPropertyNames = browserEntry.EntityCompiler.compile<Record<string, unknown>>(propertyNamesSchema);
    assert.equal(nodePropertyNames(value), true);
    assert.equal(browserPropertyNames(value), true);

    const nodeUnevaluated = nodeEntry.EntityCompiler.compile<Record<string, unknown>>(unevaluatedSchema);
    const browserUnevaluated = browserEntry.EntityCompiler.compile<Record<string, unknown>>(unevaluatedSchema);
    assert.equal(nodeUnevaluated(value), true);
    assert.equal(browserUnevaluated(value), true);
  });

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
  },
  {
    'name': 'not',
    'schema': { '$id': 'https://studnicky.dev/schemas/entity-diagnostics-parity-not', 'not': { 'type': 'string' } },
    'value': 'hello'
  },
  {
    'name': 'unevaluatedProperties',
    'schema': { '$id': 'https://studnicky.dev/schemas/entity-diagnostics-parity-unevaluated-properties', 'type': 'object', 'unevaluatedProperties': false },
    'value': { 'a': 1 }
  },
  {
    'name': 'oneOf',
    'schema': {
      '$id': 'https://studnicky.dev/schemas/entity-diagnostics-parity-one-of',
      'oneOf': [{ 'type': 'number' }, { 'minimum': 0, 'type': 'number' }]
    },
    'value': 5
  },
  {
    'name': 'dependentRequired (single dependency)',
    'schema': {
      '$id': 'https://studnicky.dev/schemas/entity-diagnostics-parity-dependent-required-single',
      'dependentRequired': { 'a': ['b'] },
      'properties': { 'a': {}, 'b': {} },
      'type': 'object'
    },
    'value': { 'a': 1 }
  },
  {
    'name': 'dependentRequired (multiple dependencies)',
    'schema': {
      '$id': 'https://studnicky.dev/schemas/entity-diagnostics-parity-dependent-required-multi',
      'dependentRequired': { 'a': ['b', 'c'] },
      'properties': { 'a': {}, 'b': {}, 'c': {} },
      'type': 'object'
    },
    'value': { 'a': 1 }
  },
  {
    'name': 'contains',
    'schema': { '$id': 'https://studnicky.dev/schemas/entity-diagnostics-parity-contains', 'contains': { 'type': 'string' }, 'type': 'array' },
    'value': []
  },
  {
    'name': 'minContains',
    'schema': {
      '$id': 'https://studnicky.dev/schemas/entity-diagnostics-parity-min-contains',
      'contains': { 'type': 'string' },
      'minContains': 2,
      'type': 'array'
    },
    'value': ['a']
  },
  {
    'name': 'maxContains',
    'schema': {
      '$id': 'https://studnicky.dev/schemas/entity-diagnostics-parity-max-contains',
      'contains': { 'type': 'string' },
      'maxContains': 1,
      'type': 'array'
    },
    'value': ['a', 'b']
  },
  {
    'name': 'contains (non-empty unmatched array)',
    'schema': { '$id': 'https://studnicky.dev/schemas/entity-diagnostics-parity-contains-unmatched', 'contains': { 'type': 'string' }, 'type': 'array' },
    'value': [1, 2, 3]
  },
  {
    'name': '$ref property',
    'schema': {
      '$defs': { 'Str': { 'type': 'string' } },
      '$id': 'https://studnicky.dev/schemas/entity-diagnostics-parity-ref-property',
      'properties': { 'a': { '$ref': '#/$defs/Str' } },
      'type': 'object'
    },
    'value': { 'a': 1 }
  },
  {
    'name': '$ref property (chained)',
    'schema': {
      '$defs': { 'A': { '$ref': '#/$defs/B' }, 'B': { 'type': 'string' } },
      '$id': 'https://studnicky.dev/schemas/entity-diagnostics-parity-ref-chained',
      'properties': { 'a': { '$ref': '#/$defs/A' } },
      'type': 'object'
    },
    'value': { 'a': 1 }
  },
  {
    'name': '$ref property (self-referencing, terminates)',
    'schema': {
      '$defs': {
        'Node': {
          'properties': { 'next': { '$ref': '#/$defs/Node' }, 'value': { 'type': 'string' } },
          'type': 'object'
        }
      },
      '$id': 'https://studnicky.dev/schemas/entity-diagnostics-parity-ref-self',
      '$ref': '#/$defs/Node'
    },
    'value': { 'value': 1 }
  },
  {
    'name': 'contains reached only through $ref (property)',
    'schema': {
      '$defs': { 'List': { 'contains': { 'type': 'string' }, 'type': 'array' } },
      '$id': 'https://studnicky.dev/schemas/entity-diagnostics-parity-contains-ref-property',
      'properties': { 'items': { '$ref': '#/$defs/List' } },
      'type': 'object'
    },
    'value': { 'items': [1, 2, 3] }
  },
  {
    'name': 'contains reached only through $ref (array schema itself)',
    'schema': {
      '$defs': { 'List': { 'contains': { 'type': 'string' }, 'type': 'array' } },
      '$id': 'https://studnicky.dev/schemas/entity-diagnostics-parity-contains-ref-array',
      '$ref': '#/$defs/List'
    },
    'value': [1, 2, 3]
  }
];

class KeywordParity {
  static assertMessageParity(keywordCase: KeywordCaseInterface): void {
    const nodeValidate = nodeEntry.EntityCompiler.compile<unknown>(keywordCase.schema);
    const browserValidate = browserEntry.EntityCompiler.compile<unknown>(keywordCase.schema);

    assert.equal(nodeValidate(keywordCase.value), false);
    assert.equal(browserValidate(keywordCase.value), false);

    const nodeMessage = nodeValidate.errors?.[0]?.message;
    const browserMessage = browserValidate.errors?.[0]?.message;

    assert.ok(nodeMessage !== undefined);
    assert.equal(browserMessage, nodeMessage);
  }

  static declare(keywordCase: KeywordCaseInterface): void {
    void it(`renders a byte-identical message for '${keywordCase.name}' on both runtimes`, () => { KeywordParity.assertMessageParity(keywordCase); });
  }
}

void describe('EntityDiagnostics keyword message parity across node and browser registries', () => {
  const keywordCaseCount = keywordCases.length;
  for (let index = 0; index < keywordCaseCount; index += 1) {
    const keywordCase = keywordCases[index];
    if (keywordCase !== undefined) {
      KeywordParity.declare(keywordCase);
    }
  }
});
