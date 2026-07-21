import assert from 'node:assert/strict';
import { it } from 'node:test';

import { LOG_LEVEL } from '../../src/constants/LOG_LEVEL.js';
import { LOG_LEVEL_MAP } from '../../src/constants/LOG_LEVEL_MAP.js';
import type { LogLevelEntity } from '../../src/entities/LogLevelEntity.js';
import type { LogLevelNameEntity } from '../../src/entities/LogLevelNameEntity.js';
import { ParseLogLevel } from '../../src/index.js';

const levelValueScenarios: Array<{ expected: LogLevelEntity.Type; level: LogLevelEntity.Type; name: string }> = [
  { expected: 0, level: LOG_LEVEL.TRACE, name: 'TRACE' },
  { expected: 1, level: LOG_LEVEL.DEBUG, name: 'DEBUG' },
  { expected: 2, level: LOG_LEVEL.INFO, name: 'INFO' },
  { expected: 3, level: LOG_LEVEL.WARN, name: 'WARN' },
  { expected: 4, level: LOG_LEVEL.ERROR, name: 'ERROR' },
  { expected: 5, level: LOG_LEVEL.SILENT, name: 'SILENT' }
];

for (const { level, expected, name } of levelValueScenarios) {
  void it(`LOG_LEVEL.${name} equals ${expected}`, () => {
    assert.strictEqual(level, expected);
  });
}

void it('levels are ordered by severity', () => {
  const levels = [
    LOG_LEVEL.TRACE,
    LOG_LEVEL.DEBUG,
    LOG_LEVEL.INFO,
    LOG_LEVEL.WARN,
    LOG_LEVEL.ERROR,
    LOG_LEVEL.SILENT
  ];

  for (let index = 0; index < levels.length - 1; index++) {
    const current = levels[index];
    const next = levels[index + 1];

    assert.ok(current !== undefined && next !== undefined);
    assert.ok(current < next);
  }
});

const logLevelMapScenarios: Array<{ expectedLevel: LogLevelEntity.Type; key: LogLevelNameEntity.Type }> = [
  { expectedLevel: LOG_LEVEL.TRACE, key: 'trace' },
  { expectedLevel: LOG_LEVEL.DEBUG, key: 'debug' },
  { expectedLevel: LOG_LEVEL.INFO, key: 'info' },
  { expectedLevel: LOG_LEVEL.WARN, key: 'warn' },
  { expectedLevel: LOG_LEVEL.ERROR, key: 'error' },
  { expectedLevel: LOG_LEVEL.SILENT, key: 'silent' }
];

for (const { key, expectedLevel } of logLevelMapScenarios) {
  void it(`LOG_LEVEL_MAP.${key} maps to ${expectedLevel}`, () => {
    assert.strictEqual(LOG_LEVEL_MAP[key], expectedLevel);
  });
}

const numericPassthroughScenarios: Array<{ expected: LogLevelEntity.Type; input: LogLevelEntity.Type; name: string }> = [
  { expected: LOG_LEVEL.TRACE, input: LOG_LEVEL.TRACE, name: 'TRACE' },
  { expected: LOG_LEVEL.DEBUG, input: LOG_LEVEL.DEBUG, name: 'DEBUG' },
  { expected: LOG_LEVEL.INFO, input: LOG_LEVEL.INFO, name: 'INFO' },
  { expected: LOG_LEVEL.WARN, input: LOG_LEVEL.WARN, name: 'WARN' },
  { expected: LOG_LEVEL.ERROR, input: LOG_LEVEL.ERROR, name: 'ERROR' },
  { expected: LOG_LEVEL.SILENT, input: LOG_LEVEL.SILENT, name: 'SILENT' }
];

for (const { input, expected, name } of numericPassthroughScenarios) {
  void it(`parseLogLevel passes through numeric LOG_LEVEL.${name}`, () => {
    assert.strictEqual(ParseLogLevel.parse(input), expected);
  });
}

const stringParseScenarios: Array<{ expected: LogLevelEntity.Type; input: LogLevelNameEntity.Type }> = [
  { expected: LOG_LEVEL.TRACE, input: 'trace' },
  { expected: LOG_LEVEL.DEBUG, input: 'debug' },
  { expected: LOG_LEVEL.INFO, input: 'info' },
  { expected: LOG_LEVEL.WARN, input: 'warn' },
  { expected: LOG_LEVEL.ERROR, input: 'error' },
  { expected: LOG_LEVEL.SILENT, input: 'silent' }
];

for (const { input, expected } of stringParseScenarios) {
  void it(`parseLogLevel parses string '${input}'`, () => {
    assert.strictEqual(ParseLogLevel.parse(input), expected);
  });
}

const invalidStringScenarios: Array<{ input: string }> = [
  { input: 'invalid' },
  { input: 'DEBUG' },
  { input: '' }
];

for (const { input } of invalidStringScenarios) {
  void it(`parseLogLevel falls back to INFO for invalid string '${input}'`, () => {
    assert.strictEqual(ParseLogLevel.parse(input), LOG_LEVEL.INFO);
  });
}
