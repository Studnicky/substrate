import assert from 'node:assert/strict';
import {
  describe,
  it
} from 'node:test';


import { LOG_LEVEL } from '../../src/constants/LOG_LEVEL.js';
import { ParseLogLevel } from '../../src/modules/parseLogLevel.js';

void describe('parseLogLevel utility', () => {
  void describe('numeric LOG_LEVEL input', () => {
    void it('should return TRACE for LOG_LEVEL.TRACE', () => {
      const result = ParseLogLevel.parse(LOG_LEVEL.TRACE);

      assert.strictEqual(result, LOG_LEVEL.TRACE);
      assert.strictEqual(result, 0);
    });

    void it('should return DEBUG for LOG_LEVEL.DEBUG', () => {
      const result = ParseLogLevel.parse(LOG_LEVEL.DEBUG);

      assert.strictEqual(result, LOG_LEVEL.DEBUG);
      assert.strictEqual(result, 1);
    });

    void it('should return INFO for LOG_LEVEL.INFO', () => {
      const result = ParseLogLevel.parse(LOG_LEVEL.INFO);

      assert.strictEqual(result, LOG_LEVEL.INFO);
      assert.strictEqual(result, 2);
    });

    void it('should return WARN for LOG_LEVEL.WARN', () => {
      const result = ParseLogLevel.parse(LOG_LEVEL.WARN);

      assert.strictEqual(result, LOG_LEVEL.WARN);
      assert.strictEqual(result, 3);
    });

    void it('should return ERROR for LOG_LEVEL.ERROR', () => {
      const result = ParseLogLevel.parse(LOG_LEVEL.ERROR);

      assert.strictEqual(result, LOG_LEVEL.ERROR);
      assert.strictEqual(result, 4);
    });

    void it('should return SILENT for LOG_LEVEL.SILENT', () => {
      const result = ParseLogLevel.parse(LOG_LEVEL.SILENT);

      assert.strictEqual(result, LOG_LEVEL.SILENT);
      assert.strictEqual(result, 5);
    });
  });

  void describe('string LogLevelString input', () => {
    void it('should parse "trace" to LOG_LEVEL.TRACE', () => {
      const result = ParseLogLevel.parse('trace');

      assert.strictEqual(result, LOG_LEVEL.TRACE);
      assert.strictEqual(result, 0);
    });

    void it('should parse "debug" to LOG_LEVEL.DEBUG', () => {
      const result = ParseLogLevel.parse('debug');

      assert.strictEqual(result, LOG_LEVEL.DEBUG);
      assert.strictEqual(result, 1);
    });

    void it('should parse "info" to LOG_LEVEL.INFO', () => {
      const result = ParseLogLevel.parse('info');

      assert.strictEqual(result, LOG_LEVEL.INFO);
      assert.strictEqual(result, 2);
    });

    void it('should parse "warn" to LOG_LEVEL.WARN', () => {
      const result = ParseLogLevel.parse('warn');

      assert.strictEqual(result, LOG_LEVEL.WARN);
      assert.strictEqual(result, 3);
    });

    void it('should parse "error" to LOG_LEVEL.ERROR', () => {
      const result = ParseLogLevel.parse('error');

      assert.strictEqual(result, LOG_LEVEL.ERROR);
      assert.strictEqual(result, 4);
    });

    void it('should parse "silent" to LOG_LEVEL.SILENT', () => {
      const result = ParseLogLevel.parse('silent');

      assert.strictEqual(result, LOG_LEVEL.SILENT);
      assert.strictEqual(result, 5);
    });
  });

  void describe('default behavior for invalid input', () => {
    void it('should return INFO for empty string', () => {
      const result = ParseLogLevel.parse('');

      assert.strictEqual(result, LOG_LEVEL.INFO);
    });

    void it('should return INFO for invalid string', () => {
      const result = ParseLogLevel.parse('invalid');

      assert.strictEqual(result, LOG_LEVEL.INFO);
    });

    void it('should return INFO for uppercase string', () => {
      const result = ParseLogLevel.parse('DEBUG');

      assert.strictEqual(result, LOG_LEVEL.INFO);
    });

    void it('should return INFO for mixed case string', () => {
      const result = ParseLogLevel.parse('Info');

      assert.strictEqual(result, LOG_LEVEL.INFO);
    });

    void it('should return INFO for string with spaces', () => {
      const result = ParseLogLevel.parse(' info ');

      assert.strictEqual(result, LOG_LEVEL.INFO);
    });
  });

  void describe('type checking behavior', () => {
    void it('should handle numeric 0 as TRACE', () => {
      const result = ParseLogLevel.parse(0);

      assert.strictEqual(result, LOG_LEVEL.TRACE);
    });

    void it('should handle numeric 1 as DEBUG', () => {
      const result = ParseLogLevel.parse(1);

      assert.strictEqual(result, LOG_LEVEL.DEBUG);
    });

    void it('should handle numeric 2 as INFO', () => {
      const result = ParseLogLevel.parse(2);

      assert.strictEqual(result, LOG_LEVEL.INFO);
    });

    void it('should handle numeric 3 as WARN', () => {
      const result = ParseLogLevel.parse(3);

      assert.strictEqual(result, LOG_LEVEL.WARN);
    });

    void it('should handle numeric 4 as ERROR', () => {
      const result = ParseLogLevel.parse(4);

      assert.strictEqual(result, LOG_LEVEL.ERROR);
    });

    void it('should handle numeric 5 as SILENT', () => {
      const result = ParseLogLevel.parse(5);

      assert.strictEqual(result, LOG_LEVEL.SILENT);
    });
  });

  void describe('consistency with LOG_LEVEL enum', () => {
    void it('should maintain correct ordering', () => {
      assert.ok(ParseLogLevel.parse('trace') < ParseLogLevel.parse('debug'));
      assert.ok(ParseLogLevel.parse('debug') < ParseLogLevel.parse('info'));
      assert.ok(ParseLogLevel.parse('info') < ParseLogLevel.parse('warn'));
      assert.ok(ParseLogLevel.parse('warn') < ParseLogLevel.parse('error'));
      assert.ok(ParseLogLevel.parse('error') < ParseLogLevel.parse('silent'));
    });

    void it('should match enum values exactly', () => {
      assert.strictEqual(ParseLogLevel.parse('trace'), LOG_LEVEL.TRACE);
      assert.strictEqual(ParseLogLevel.parse('debug'), LOG_LEVEL.DEBUG);
      assert.strictEqual(ParseLogLevel.parse('info'), LOG_LEVEL.INFO);
      assert.strictEqual(ParseLogLevel.parse('warn'), LOG_LEVEL.WARN);
      assert.strictEqual(ParseLogLevel.parse('error'), LOG_LEVEL.ERROR);
      assert.strictEqual(ParseLogLevel.parse('silent'), LOG_LEVEL.SILENT);
    });

    void it('should be idempotent for numeric values', () => {
      const trace = ParseLogLevel.parse(LOG_LEVEL.TRACE);
      const traceTwice = ParseLogLevel.parse(trace);

      assert.strictEqual(trace, traceTwice);

      const info = ParseLogLevel.parse(LOG_LEVEL.INFO);
      const infoTwice = ParseLogLevel.parse(info);

      assert.strictEqual(info, infoTwice);
    });

    void it('should be idempotent for string values', () => {
      const debug = ParseLogLevel.parse('debug');
      const debugTwice = ParseLogLevel.parse(debug);

      assert.strictEqual(debug, debugTwice);

      const error = ParseLogLevel.parse('error');
      const errorTwice = ParseLogLevel.parse(error);

      assert.strictEqual(error, errorTwice);
    });
  });

  void describe('edge case inputs', () => {
    void it('should handle numeric inputs outside valid range', () => {
      const result1 = ParseLogLevel.parse(-1);
      const result2 = ParseLogLevel.parse(999);

      assert.strictEqual(result1, LOG_LEVEL.INFO);
      assert.strictEqual(result2, LOG_LEVEL.INFO);
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
        const result = ParseLogLevel.parse(testCase);

        assert.strictEqual(result, LOG_LEVEL.INFO);
      }
    });
  });

  void describe('return type verification', () => {
    void it('should always return a number', () => {
      const results = [
        ParseLogLevel.parse('trace'),
        ParseLogLevel.parse('debug'),
        ParseLogLevel.parse('info'),
        ParseLogLevel.parse('warn'),
        ParseLogLevel.parse('error'),
        ParseLogLevel.parse('silent'),
        ParseLogLevel.parse(LOG_LEVEL.TRACE),
        ParseLogLevel.parse(LOG_LEVEL.DEBUG),
        ParseLogLevel.parse(LOG_LEVEL.INFO)
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
        ParseLogLevel.parse('trace'),
        ParseLogLevel.parse('debug'),
        ParseLogLevel.parse('info'),
        ParseLogLevel.parse('warn'),
        ParseLogLevel.parse('error'),
        ParseLogLevel.parse('silent')
      ];

      for (const level of parsedLevels) {
        assert.ok(validLevels.has(level));
      }
    });
  });
});
