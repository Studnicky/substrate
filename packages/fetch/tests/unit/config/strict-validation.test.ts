import { doesNotThrow, throws } from 'node:assert/strict';
import { it } from 'node:test';

import { FetchClient } from '../../../src/index.js';

const invalidConfigScenarios: Array<{ description: string; config: object; messagePattern: RegExp }> = [
  {
    description: 'rejects configuration with unknown key',
    config: { baseURL: 'https://api.example.com', unknownKey: 'value' },
    messagePattern: /unknownKey/u,
  },
  {
    description: 'rejects configuration with multiple unknown keys',
    config: { baseURL: 'https://api.example.com', unknownKey1: 'value1', unknownKey2: 'value2' },
    messagePattern: /not declared/u,
  },
  {
    description: 'rejects configuration with typo in key name',
    config: { baseUrl: 'https://api.example.com' },
    messagePattern: /baseUrl/u,
  },
  {
    description: 'rejects configuration with wrong case',
    config: { BaseURL: 'https://api.example.com' },
    messagePattern: /BaseURL/u,
  },
  {
    description: 'rejects configuration with nested unknown keys in options',
    config: { baseURL: 'https://api.example.com', invalidOption: { nested: 'value' } },
    messagePattern: /invalidOption/u,
  },
];

for (const { description, config, messagePattern } of invalidConfigScenarios) {
  it(description, () => {
    throws(() => { FetchClient.create(config as never); }, messagePattern);
  });
}

const validConfigScenarios: Array<{ description: string; config: Parameters<typeof FetchClient.create>[0] }> = [
  { description: 'accepts empty configuration', config: {} },
  {
    description: 'accepts valid configuration with all known keys',
    config: {
      baseURL: 'https://api.example.com',
      headers: { Authorization: 'Bearer token' },
      params: { page: 1 },
      timeout: 5000,
    },
  },
  {
    description: 'accepts configuration with optional keys undefined',
    config: {
      baseURL: 'https://api.example.com',
      headers: undefined,
      timeout: undefined,
    },
  },
];

for (const { description, config } of validConfigScenarios) {
  it(description, () => {
    doesNotThrow(() => { FetchClient.create(config); });
  });
}
