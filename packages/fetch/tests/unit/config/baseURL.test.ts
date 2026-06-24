import { doesNotThrow, throws } from 'node:assert/strict';
import { it } from 'node:test';

import { FetchClient } from '../../../src/index.js';

const invalidBaseUrlScenarios: Array<{ description: string; config: object; messagePattern: RegExp }> = [
  { description: 'rejects non-string baseURL', config: { baseURL: 123 }, messagePattern: /baseURL must be a string/u },
  { description: 'rejects empty baseURL', config: { baseURL: '' }, messagePattern: /baseURL must not be empty/u },
  { description: 'rejects invalid URL format', config: { baseURL: 'not-a-valid-url' }, messagePattern: /baseURL must be a valid URL/u },
];

for (const { description, config, messagePattern } of invalidBaseUrlScenarios) {
  it(description, () => {
    throws(() => { FetchClient.create(config as never); }, messagePattern);
  });
}

it('accepts valid baseURL', () => {
  doesNotThrow(() => { FetchClient.create({ baseURL: 'https://api.example.com' }); });
});
