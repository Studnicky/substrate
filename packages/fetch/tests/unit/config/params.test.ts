import { doesNotThrow, throws } from 'node:assert/strict';
import { it } from 'node:test';

import { FetchClient } from '../../../src/index.js';

const invalidParamScenarios: Array<{ description: string; config: object; messagePattern: RegExp }> = [
  { description: 'rejects non-object params', config: { params: 'invalid' }, messagePattern: /params must be an object/u },
  { description: 'rejects array params', config: { params: [] }, messagePattern: /params must be an object/u },
];

for (const { description, config, messagePattern } of invalidParamScenarios) {
  it(description, () => {
    throws(() => { Reflect.apply(FetchClient.create, FetchClient, [config]); }, messagePattern);
  });
}

it('rejects invalid param value types', () => {
  throws(() => {
    const invalidConfig = { params: { invalid: { nested: 'object' } } };

    Reflect.apply(FetchClient.create, FetchClient, [invalidConfig]);
  }, /param value for "invalid" must be string, number, boolean, or array of these types/u);
});

const validParamScenarios: Array<{ description: string; params: Record<string, unknown> }> = [
  { description: 'accepts valid string params', params: { key: 'value' } },
  { description: 'accepts valid number params', params: { page: 1 } },
  { description: 'accepts valid boolean params', params: { active: true } },
  { description: 'accepts valid array params', params: { tags: ['javascript', 'typescript'] } },
  { description: 'accepts null and undefined param values', params: { key: null, other: undefined } },
];

for (const { description, params } of validParamScenarios) {
  it(description, () => {
    doesNotThrow(() => { FetchClient.create({ params }); });
  });
}
