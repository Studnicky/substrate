import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { Ajv2020 } from 'ajv/dist/2020.js';

import { JsonObjectEntity, JsonValueEntity, PatchOperationEntity } from '../../../src/entities/index.js';

void describe('standard JSON schemas', () => {
  void it('compiles JSON value, object, and patch operation schemas without project keywords', () => {
    const schemas = [JsonValueEntity.Schema, JsonObjectEntity.Schema, PatchOperationEntity.Schema];
    const schemaCount = schemas.length;
    const ajv = new Ajv2020({ 'strict': true });

    for (let index = 0; index < schemaCount; index += 1) {
      assert.doesNotThrow(() => {
        ajv.compile(schemas[index]!);
      });
    }
  });
});
