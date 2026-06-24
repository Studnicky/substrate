import assert from 'node:assert/strict';
import { it } from 'node:test';

import { LogLevel } from '../../src/constants/LogLevel.js';
import { LogLevelMap } from '../../src/constants/LogLevelMap.js';
import { parseLogLevel } from '../../src/index.js';

const levelValueScenarios: Array<{ level: LogLevel; expected: number }> = [
  { expected: 0, level: LogLevel.TRACE },
  { expected: 1, level: LogLevel.DEBUG },
  { expected: 2, level: LogLevel.INFO },
  { expected: 3, level: LogLevel.WARN },
  { expected: 4, level: LogLevel.ERROR },
  { expected: 5, level: LogLevel.SILENT }
];

for (const { level, expected } of levelValueScenarios) {
  void it(`LogLevel.${LogLevel[level]} equals ${expected}`, () => {
    assert.strictEqual(level, expected);
  });
}

void it('levels are ordered by severity', () => {
  const levels = [
    LogLevel.TRACE,
    LogLevel.DEBUG,
    LogLevel.INFO,
    LogLevel.WARN,
    LogLevel.ERROR,
    LogLevel.SILENT
  ];

  for (let index = 0; index < levels.length - 1; index++) {
    const current = levels[index];
    const next = levels[index + 1];

    assert.ok(current !== undefined && next !== undefined);
    assert.ok(current < next);
  }
});

const logLevelMapScenarios: Array<{ key: keyof typeof LogLevelMap; expectedLevel: LogLevel }> = [
  { expectedLevel: LogLevel.TRACE, key: 'trace' },
  { expectedLevel: LogLevel.DEBUG, key: 'debug' },
  { expectedLevel: LogLevel.INFO, key: 'info' },
  { expectedLevel: LogLevel.WARN, key: 'warn' },
  { expectedLevel: LogLevel.ERROR, key: 'error' },
  { expectedLevel: LogLevel.SILENT, key: 'silent' }
];

for (const { key, expectedLevel } of logLevelMapScenarios) {
  void it(`LogLevelMap.${key} maps to LogLevel.${LogLevel[expectedLevel]}`, () => {
    assert.strictEqual(LogLevelMap[key], expectedLevel);
  });
}

const numericPassthroughScenarios: Array<{ input: LogLevel; expected: LogLevel }> = [
  { expected: LogLevel.TRACE, input: LogLevel.TRACE },
  { expected: LogLevel.DEBUG, input: LogLevel.DEBUG },
  { expected: LogLevel.INFO, input: LogLevel.INFO },
  { expected: LogLevel.WARN, input: LogLevel.WARN },
  { expected: LogLevel.ERROR, input: LogLevel.ERROR },
  { expected: LogLevel.SILENT, input: LogLevel.SILENT }
];

for (const { input, expected } of numericPassthroughScenarios) {
  void it(`parseLogLevel passes through numeric LogLevel.${LogLevel[input]}`, () => {
    assert.strictEqual(parseLogLevel(input), expected);
  });
}

const stringParseScenarios: Array<{ input: string; expected: LogLevel }> = [
  { expected: LogLevel.TRACE, input: 'trace' },
  { expected: LogLevel.DEBUG, input: 'debug' },
  { expected: LogLevel.INFO, input: 'info' },
  { expected: LogLevel.WARN, input: 'warn' },
  { expected: LogLevel.ERROR, input: 'error' },
  { expected: LogLevel.SILENT, input: 'silent' }
];

for (const { input, expected } of stringParseScenarios) {
  void it(`parseLogLevel parses string '${input}'`, () => {
    assert.strictEqual(parseLogLevel(input as 'info'), expected);
  });
}

const invalidStringScenarios: Array<{ input: string }> = [
  { input: 'invalid' },
  { input: 'DEBUG' },
  { input: '' }
];

for (const { input } of invalidStringScenarios) {
  void it(`parseLogLevel falls back to INFO for invalid string '${input}'`, () => {
    assert.strictEqual(parseLogLevel(input as 'info'), LogLevel.INFO);
  });
}
