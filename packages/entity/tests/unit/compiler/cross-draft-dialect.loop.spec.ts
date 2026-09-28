import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type { EntityValidateFunctionInterface } from '../../../src/interfaces/EntityValidateFunctionInterface.js';

import { EntityClosureRegistry } from '../../../src/compiler/EntityClosureRegistry.js';

const assertRegistry = EntityClosureRegistry.create(false);

function compile<T>(schema: object, remotes?: ReadonlyMap<string, object | boolean>): EntityValidateFunctionInterface<T> {
  return assertRegistry.compile<T>(schema, remotes);
}

const HISTORIC_DRAFT_RESOURCE = {
  '$id': 'https://example.com/dialect/historic-resource',
  '$schema': 'https://json-schema.org/draft/2019-09/schema',
  'prefixItems': [{ 'type': 'string' }]
};

const CURRENT_DRAFT_RESOURCE = {
  '$id': 'https://example.com/dialect/current-resource',
  '$schema': 'https://json-schema.org/draft/2020-12/schema',
  'prefixItems': [{ 'type': 'string' }]
};

void describe('cross-draft $ref — historic-draft resources lose 2020-12-only keywords', () => {
  void it('a $ref into a 2019-09 resource ignores prefixItems as an unknown keyword', () => {
    const validate = compile({ '$ref': 'https://example.com/dialect/historic-resource' }, new Map([
      ['https://example.com/dialect/historic-resource', HISTORIC_DRAFT_RESOURCE]
    ]));
    assert.equal(validate([1, 2, 3]), true);
  });

  void it('a $ref into a 2020-12 resource honours prefixItems', () => {
    const validate = compile({ '$ref': 'https://example.com/dialect/current-resource' }, new Map([
      ['https://example.com/dialect/current-resource', CURRENT_DRAFT_RESOURCE]
    ]));
    assert.equal(validate([1, 2, 3]), false);
    assert.equal(validate(['ok', 2, 3]), true);
  });
});
