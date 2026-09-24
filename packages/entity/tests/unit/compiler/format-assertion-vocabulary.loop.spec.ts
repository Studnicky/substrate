import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type { EntityValidateFunctionInterface } from '../../../src/interfaces/EntityValidateFunctionInterface.js';

import { EntityClosureRegistry } from '../../../src/compiler/EntityClosureRegistry.js';

const assertRegistry = EntityClosureRegistry.create(false);

function compile<T>(schema: object, remotes?: ReadonlyMap<string, object | boolean>): EntityValidateFunctionInterface<T> {
  return assertRegistry.compile<T>(schema, remotes);
}

const FORMAT_ASSERTION_DIALECT = 'https://example.com/dialect/format-assertion-true';
const FORMAT_ANNOTATION_ONLY_DIALECT = 'https://example.com/dialect/format-assertion-false';

const ASSERTING_METASCHEMA = {
  '$id': FORMAT_ASSERTION_DIALECT,
  '$vocabulary': {
    'https://json-schema.org/draft/2020-12/vocab/core': true,
    'https://json-schema.org/draft/2020-12/vocab/format-assertion': true
  }
};

const NON_ASSERTING_DECLARED_METASCHEMA = {
  '$id': FORMAT_ANNOTATION_ONLY_DIALECT,
  '$vocabulary': {
    'https://json-schema.org/draft/2020-12/vocab/core': true,
    'https://json-schema.org/draft/2020-12/vocab/format-assertion': false
  }
};

void describe('format vocabulary — annotation by default, assertion on opt-in', () => {
  void it('format is annotation-only with no $schema at all', () => {
    const validate = compile({ 'format': 'ipv4' });
    assert.equal(validate('not-an-ipv4'), true);
  });

  void it('format is annotation-only under the plain 2020-12 dialect (format-annotation vocabulary)', () => {
    const validate = compile({ '$schema': 'https://json-schema.org/draft/2020-12/schema', 'format': 'ipv4' });
    assert.equal(validate('not-an-ipv4'), true);
  });

  void it('format asserts once the dialect declares the format-assertion vocabulary as true', () => {
    const remotes = new Map<string, object | boolean>([[FORMAT_ASSERTION_DIALECT, ASSERTING_METASCHEMA]]);
    const validate = compile({ '$schema': FORMAT_ASSERTION_DIALECT, 'format': 'ipv4' }, remotes);
    assert.equal(validate('127.0.0.1'), true);
    assert.equal(validate('not-an-ipv4'), false);
  });

  void it('format asserts even when the dialect declares the format-assertion vocabulary as false — recognizing it is what matters, not the boolean', () => {
    const remotes = new Map<string, object | boolean>([[FORMAT_ANNOTATION_ONLY_DIALECT, NON_ASSERTING_DECLARED_METASCHEMA]]);
    const validate = compile({ '$schema': FORMAT_ANNOTATION_ONLY_DIALECT, 'format': 'ipv4' }, remotes);
    assert.equal(validate('127.0.0.1'), true);
    assert.equal(validate('not-an-ipv4'), false);
  });
});
