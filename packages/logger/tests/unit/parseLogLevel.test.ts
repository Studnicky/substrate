import type { LogLevelType } from '../../src/types/LogLevelType.js';

import assert from 'node:assert/strict';
import {
  describe,
  it
} from 'node:test';


import { LOG_LEVEL } from '../../src/constants/LOG_LEVEL.js';
import { parseLogLevel } from '../../src/modules/parseLogLevel.js';

void describe('parseLogLevel utility', () => {
  void describe('numeric LOG_LEVEL input', () => {
    void it('should return TRACE for LOG_LEVEL.TRACE', () => {
      const result = parseLogLevel(LOG_LEVEL.TRACE);

      assert.strictEqual(result, LOG_LEVEL.TRACE);
      assert.strictEqual(result, 0);
    });

    void it('should return DEBUG for LOG_LEVEL.DEBUG', () => {
      const result = parseLogLevel(LOG_LEVEL.DEBUG);

      assert.strictEqual(result, LOG_LEVEL.DEBUG);
      assert.strictEqual(result, 1);
    });

    void it('should return INFO for LOG_LEVEL.INFO', () => {
      const result = parseLogLevel(LOG_LEVEL.INFO);

      assert.strictEqual(result, LOG_LEVEL.INFO);
      assert.strictEqual(result, 2);
    });

    void it('should return WARN for LOG_LEVEL.WARN', () => {
      const result = parseLogLevel(LOG_LEVEL.WARN);

      assert.strictEqual(result, LOG_LEVEL.WARN);
      assert.strictEqual(result, 3);
    });

    void it('should return ERROR for LOG_LEVEL.ERROR', () => {
      const result = parseLogLevel(LOG_LEVEL.ERROR);

      assert.strictEqual(result, LOG_LEVEL.ERROR);
      assert.strictEqual(result, 4);
    });

    void it('should return SILENT for LOG_LEVEL.SILENT', () => {
      const result = parseLogLevel(LOG_LEVEL.SILENT);

      assert.strictEqual(result, LOG_LEVEL.SILENT);
      assert.strictEqual(result, 5);
    });
  });

  void describe('string LogLevelString input', () => {
    void it('should parse "trace" to LOG_LEVEL.TRACE', () => {
      const result = parseLogLevel('trace');

      assert.strictEqual(result, LOG_LEVEL.TRACE);
      assert.strictEqual(result, 0);
    });

    void it('should parse "debug" to LOG_LEVEL.DEBUG', () => {
      const result = parseLogLevel('debug');

      assert.strictEqual(result, LOG_LEVEL.DEBUG);
      assert.strictEqual(result, 1);
    });

    void it('should parse "info" to LOG_LEVEL.INFO', () => {
      const result = parseLogLevel('info');

      assert.strictEqual(result, LOG_LEVEL.INFO);
      assert.strictEqual(result, 2);
    });

    void it('should parse "warn" to LOG_LEVEL.WARN', () => {
      const result = parseLogLevel('warn');

      assert.strictEqual(result, LOG_LEVEL.WARN);
      assert.strictEqual(result, 3);
    });

    void it('should parse "error" to LOG_LEVEL.ERROR', () => {
      const result = parseLogLevel('error');

      assert.strictEqual(result, LOG_LEVEL.ERROR);
      assert.strictEqual(result, 4);
    });

    void it('should parse "silent" to LOG_LEVEL.SILENT', () => {
      const result = parseLogLevel('silent');

      assert.strictEqual(result, LOG_LEVEL.SILENT);
      assert.strictEqual(result, 5);
    });
  });

  void describe('default behavior for invalid input', () => {
    void it('should return INFO for empty string', () => {
      const result = parseLogLevel('' as 'info');

      assert.strictEqual(result, LOG_LEVEL.INFO);
    });

    void it('should return INFO for invalid string', () => {
      const result = parseLogLevel('invalid' as 'info');

      assert.strictEqual(result, LOG_LEVEL.INFO);
    });

    void it('should return INFO for uppercase string', () => {
      const result = parseLogLevel('DEBUG' as 'debug');

      assert.strictEqual(result, LOG_LEVEL.INFO);
    });

    void it('should return INFO for mixed case string', () => {
      const result = parseLogLevel('Info' as 'info');

      assert.strictEqual(result, LOG_LEVEL.INFO);
    });

    void it('should return INFO for string with spaces', () => {
      const result = parseLogLevel(' info ' as 'info');

      assert.strictEqual(result, LOG_LEVEL.INFO);
    });
  });

  void describe('type checking behavior', () => {
    void it('should handle numeric 0 as TRACE', () => {
      const result = parseLogLevel(0);

      assert.strictEqual(result, LOG_LEVEL.TRACE);
    });

    void it('should handle numeric 1 as DEBUG', () => {
      const result = parseLogLevel(1);

      assert.strictEqual(result, LOG_LEVEL.DEBUG);
    });

    void it('should handle numeric 2 as INFO', () => {
      const result = parseLogLevel(2);

      assert.strictEqual(result, LOG_LEVEL.INFO);
    });

    void it('should handle numeric 3 as WARN', () => {
      const result = parseLogLevel(3);

      assert.strictEqual(result, LOG_LEVEL.WARN);
    });

    void it('should handle numeric 4 as ERROR', () => {
      const result = parseLogLevel(4);

      assert.strictEqual(result, LOG_LEVEL.ERROR);
    });

    void it('should handle numeric 5 as SILENT', () => {
      const result = parseLogLevel(5);

      assert.strictEqual(result, LOG_LEVEL.SILENT);
    });
  });

  void describe('consistency with LOG_LEVEL enum', () => {
    void it('should maintain correct ordering', () => {
      assert.ok(parseLogLevel('trace') < parseLogLevel('debug'));
      assert.ok(parseLogLevel('debug') < parseLogLevel('info'));
      assert.ok(parseLogLevel('info') < parseLogLevel('warn'));
      assert.ok(parseLogLevel('warn') < parseLogLevel('error'));
      assert.ok(parseLogLevel('error') < parseLogLevel('silent'));
    });

    void it('should match enum values exactly', () => {
      assert.strictEqual(parseLogLevel('trace'), LOG_LEVEL.TRACE);
      assert.strictEqual(parseLogLevel('debug'), LOG_LEVEL.DEBUG);
      assert.strictEqual(parseLogLevel('info'), LOG_LEVEL.INFO);
      assert.strictEqual(parseLogLevel('warn'), LOG_LEVEL.WARN);
      assert.strictEqual(parseLogLevel('error'), LOG_LEVEL.ERROR);
      assert.strictEqual(parseLogLevel('silent'), LOG_LEVEL.SILENT);
    });

    void it('should be idempotent for numeric values', () => {
      const trace = parseLogLevel(LOG_LEVEL.TRACE);
      const traceTwice = parseLogLevel(trace);

      assert.strictEqual(trace, traceTwice);

      const info = parseLogLevel(LOG_LEVEL.INFO);
      const infoTwice = parseLogLevel(info);

      assert.strictEqual(info, infoTwice);
    });

    void it('should be idempotent for string values', () => {
      const debug = parseLogLevel('debug');
      const debugTwice = parseLogLevel(debug);

      assert.strictEqual(debug, debugTwice);

      const error = parseLogLevel('error');
      const errorTwice = parseLogLevel(error);

      assert.strictEqual(error, errorTwice);
    });
  });

  void describe('edge case inputs', () => {
    void it('should handle numeric inputs outside valid range', () => {
      const result1 = parseLogLevel(-1 as LogLevelType);
      const result2 = parseLogLevel(999 as LogLevelType);

      assert.strictEqual(result1, -1);
      assert.strictEqual(result2, 999);
    });

    void it('should default to INFO for any unrecognized string', () => {
      const testCases = [
        'fatal',
        'critical',
        'emergency',
        'notice',
        'verbose'
      ];

      for (const testCase of testCases) {
        const result = parseLogLevel(testCase as 'info');

        assert.strictEqual(result, LOG_LEVEL.INFO);
      }
    });
  });

  void describe('return type verification', () => {
    void it('should always return a number', () => {
      const results = [
        parseLogLevel('trace'),
        parseLogLevel('debug'),
        parseLogLevel('info'),
        parseLogLevel('warn'),
        parseLogLevel('error'),
        parseLogLevel('silent'),
        parseLogLevel(LOG_LEVEL.TRACE),
        parseLogLevel(LOG_LEVEL.DEBUG),
        parseLogLevel(LOG_LEVEL.INFO)
      ];

      for (const result of results) {
        assert.strictEqual(typeof result, 'number');
      }
    });

    void it('should return valid LOG_LEVEL enum values for valid inputs', () => {
      const validLevels = new Set([
        LOG_LEVEL.DEBUG,
        LOG_LEVEL.ERROR,
        LOG_LEVEL.INFO,
        LOG_LEVEL.SILENT,
        LOG_LEVEL.TRACE,
        LOG_LEVEL.WARN
      ]);

      const parsedLevels = [
        parseLogLevel('trace'),
        parseLogLevel('debug'),
        parseLogLevel('info'),
        parseLogLevel('warn'),
        parseLogLevel('error'),
        parseLogLevel('silent')
      ];

      for (const level of parsedLevels) {
        assert.ok(validLevels.has(level));
      }
    });
  });
});
