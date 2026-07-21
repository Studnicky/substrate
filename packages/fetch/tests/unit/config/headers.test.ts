import { doesNotThrow, throws } from 'node:assert/strict';
import { it } from 'node:test';

import { FetchClient } from '../../../src/index.js';

const invalidHeaderScenarios: Array<{ description: string; config: object; messagePattern: RegExp }> = [
  { description: 'rejects non-object headers', config: { headers: 'invalid' }, messagePattern: /headers must be an object/u },
  { description: 'rejects array headers', config: { headers: [] }, messagePattern: /headers must be an object/u },
];

for (const { description, config, messagePattern } of invalidHeaderScenarios) {
  it(description, () => {
    throws(() => { Reflect.apply(FetchClient.create, FetchClient, [config]); }, messagePattern);
  });
}

it('rejects non-string header values', () => {
  throws(() => {
    const invalidConfig = { headers: { 'X-Custom': 123 } };

    Reflect.apply(FetchClient.create, FetchClient, [invalidConfig]);
  }, /header value for "X-Custom" must be a string/u);
});

it('accepts valid headers', () => {
  doesNotThrow(() => { FetchClient.create({ headers: { Authorization: 'Bearer token' } }); });
});
