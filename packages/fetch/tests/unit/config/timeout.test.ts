import { doesNotThrow, throws } from 'node:assert/strict';
import { it } from 'node:test';

import { FetchClient } from '../../../src/index.js';

const invalidTimeoutScenarios: Array<{ description: string; value: unknown; messagePattern: RegExp }> = [
  { description: 'rejects non-number timeout', value: '5000', messagePattern: /timeout must be a number/u },
  { description: 'rejects negative timeout', value: -1, messagePattern: /timeout must be positive/u },
  { description: 'rejects zero timeout', value: 0, messagePattern: /timeout must be positive/u },
  { description: 'rejects infinite timeout', value: Infinity, messagePattern: /timeout must be finite/u },
];

for (const { description, value, messagePattern } of invalidTimeoutScenarios) {
  it(description, () => {
    throws(() => { FetchClient.create({ timeout: value as never }); }, messagePattern);
  });
}

it('accepts valid timeout', () => {
  doesNotThrow(() => { FetchClient.create({ timeout: 5000 }); });
});
