import { doesNotThrow, throws } from 'node:assert/strict';
import { it } from 'node:test';

import { FetchClient } from '../../../src/index.js';

const invalidHookTimeoutMsScenarios: Array<{ description: string; value: unknown; messagePattern: RegExp }> = [
  { description: 'rejects non-number hookTimeoutMs', value: '5000', messagePattern: /hookTimeoutMs must be a number/u },
  { description: 'rejects negative hookTimeoutMs', value: -1, messagePattern: /hookTimeoutMs must be positive/u },
  { description: 'rejects zero hookTimeoutMs', value: 0, messagePattern: /hookTimeoutMs must be positive/u },
  { description: 'rejects infinite hookTimeoutMs', value: Infinity, messagePattern: /hookTimeoutMs must be finite/u },
];

for (const { description, value, messagePattern } of invalidHookTimeoutMsScenarios) {
  it(description, () => {
    throws(() => { FetchClient.create({ hookTimeoutMs: value as never }); }, messagePattern);
  });
}

it('accepts valid hookTimeoutMs', () => {
  doesNotThrow(() => { FetchClient.create({ hookTimeoutMs: 5000 }); });
});
