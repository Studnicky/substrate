import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { ModuleError } from '@studnicky/errors';

import { ConfigurationError } from '../../../src/errors/ConfigurationError.js';
import { ConfigValidation } from '../../../src/validation/configValidation.js';

void describe('configValidation', () => {
  void describe('assertString', () => {
    void it('passes for a string value', () => {
      assert.doesNotThrow(() => ConfigValidation.assertString('hello', 'field'));
    });

    void it('skips validation for undefined', () => {
      assert.doesNotThrow(() => ConfigValidation.assertString(undefined, 'field'));
    });

    void it('skips validation for null', () => {
      assert.doesNotThrow(() => ConfigValidation.assertString(null, 'field'));
    });

    void it('throws for a number', () => {
      assert.throws(
        () => ConfigValidation.assertString(42, 'field'),
        (err: unknown) => {
          assert.ok(err instanceof ConfigurationError);
          assert.strictEqual(err.message, 'field must be a string');
          return true;
        }
      );
    });
  });

  void describe('assertNumber', () => {
    void it('passes for a valid number', () => {
      assert.doesNotThrow(() => ConfigValidation.assertNumber(5, 'count'));
    });

    void it('throws for NaN', () => {
      assert.throws(
        () => ConfigValidation.assertNumber(NaN, 'count'),
        ConfigurationError
      );
    });

    void it('skips for null', () => {
      assert.doesNotThrow(() => ConfigValidation.assertNumber(null, 'count'));
    });
  });

  void describe('assertBoolean', () => {
    void it('passes for true', () => {
      assert.doesNotThrow(() => ConfigValidation.assertBoolean(true, 'flag'));
    });

    void it('passes for false', () => {
      assert.doesNotThrow(() => ConfigValidation.assertBoolean(false, 'flag'));
    });

    void it('throws for a string', () => {
      assert.throws(
        () => ConfigValidation.assertBoolean('true', 'flag'),
        ConfigurationError
      );
    });
  });

  void describe('assertFunction', () => {
    void it('passes for a function', () => {
      assert.doesNotThrow(() => ConfigValidation.assertFunction(() => {}, 'fn'));
    });

    void it('throws for a non-function', () => {
      assert.throws(
        () => ConfigValidation.assertFunction(42, 'fn'),
        ConfigurationError
      );
    });
  });

  void describe('assertInteger', () => {
    void it('passes for an integer', () => {
      assert.doesNotThrow(() => ConfigValidation.assertInteger(10, 'count'));
    });

    void it('throws for a float', () => {
      assert.throws(
        () => ConfigValidation.assertInteger(3.14, 'count'),
        ConfigurationError
      );
    });
  });

  void describe('assertFinite', () => {
    void it('passes for a finite number', () => {
      assert.doesNotThrow(() => ConfigValidation.assertFinite(100, 'val'));
    });

    void it('throws for Infinity', () => {
      assert.throws(
        () => ConfigValidation.assertFinite(Infinity, 'val'),
        ConfigurationError
      );
    });

    void it('throws for -Infinity', () => {
      assert.throws(
        () => ConfigValidation.assertFinite(-Infinity, 'val'),
        ConfigurationError
      );
    });
  });

  void describe('assertNonNegative', () => {
    void it('passes for 0', () => {
      assert.doesNotThrow(() => ConfigValidation.assertNonNegative(0, 'count'));
    });

    void it('passes for positive number', () => {
      assert.doesNotThrow(() => ConfigValidation.assertNonNegative(5, 'count'));
    });

    void it('throws for negative number', () => {
      assert.throws(
        () => ConfigValidation.assertNonNegative(-1, 'count'),
        ConfigurationError
      );
    });
  });

  void describe('assertPositive', () => {
    void it('passes for a positive number', () => {
      assert.doesNotThrow(() => ConfigValidation.assertPositive(1, 'val'));
    });

    void it('throws for 0', () => {
      assert.throws(
        () => ConfigValidation.assertPositive(0, 'val'),
        ConfigurationError
      );
    });

    void it('throws for negative', () => {
      assert.throws(
        () => ConfigValidation.assertPositive(-5, 'val'),
        ConfigurationError
      );
    });
  });

  void describe('assertMin', () => {
    void it('passes when value meets minimum', () => {
      assert.doesNotThrow(() => ConfigValidation.assertMin(10, 10, 'val'));
    });

    void it('throws when value is below minimum', () => {
      assert.throws(
        () => ConfigValidation.assertMin(4, 5, 'val'),
        ConfigurationError
      );
    });
  });

  void describe('assertPositiveOrInfinity', () => {
    void it('passes for Infinity', () => {
      assert.doesNotThrow(() => ConfigValidation.assertPositiveOrInfinity(Infinity, 'val'));
    });

    void it('passes for positive number', () => {
      assert.doesNotThrow(() => ConfigValidation.assertPositiveOrInfinity(1, 'val'));
    });

    void it('throws for 0', () => {
      assert.throws(
        () => ConfigValidation.assertPositiveOrInfinity(0, 'val'),
        ConfigurationError
      );
    });
  });

  void describe('assertHasMethod', () => {
    void it('passes when object has the method', () => {
      assert.doesNotThrow(() =>
        ConfigValidation.assertHasMethod({ log: () => {} }, 'log', 'logger')
      );
    });

    void it('throws when object lacks the method', () => {
      assert.throws(
        () => ConfigValidation.assertHasMethod({}, 'log', 'logger'),
        ConfigurationError
      );
    });

    void it('throws when value is not an object', () => {
      assert.throws(
        () => ConfigValidation.assertHasMethod(42, 'log', 'logger'),
        ConfigurationError
      );
    });
  });

  void describe('assertFunctionOrObjectWithMethod', () => {
    void it('passes for a function', () => {
      assert.doesNotThrow(() =>
        ConfigValidation.assertFunctionOrObjectWithMethod(() => {}, 'emit', 'handler')
      );
    });

    void it('passes for an object with the method', () => {
      assert.doesNotThrow(() =>
        ConfigValidation.assertFunctionOrObjectWithMethod({ emit: () => {} }, 'emit', 'handler')
      );
    });

    void it('throws for an object missing the method', () => {
      assert.throws(
        () => ConfigValidation.assertFunctionOrObjectWithMethod({}, 'emit', 'handler'),
        ConfigurationError
      );
    });
  });

  void describe('assertNoUnknownKeys', () => {
    void it('passes when all keys are known', () => {
      const known = new Set(['a', 'b', 'c']);
      assert.doesNotThrow(() =>
        ConfigValidation.assertNoUnknownKeys({ a: 1, b: 2 }, known)
      );
    });

    void it('throws when an unknown key is present', () => {
      const known = new Set(['a', 'b']);
      assert.throws(
        () => ConfigValidation.assertNoUnknownKeys({ a: 1, x: 99 }, known),
        ConfigurationError
      );
    });
  });
});

void describe('ConfigValidation subclass extension', () => {
  class StrictConfigValidation extends ConfigValidation {
    protected static override onValidationError(message: string): never {
      throw ModuleError.create(message, { 'scenario': 'CONFIGURATION' });
    }
  }

  void it('throws ModuleError (not ConfigurationError) when overridden', () => {
    assert.throws(
      () => StrictConfigValidation.assertString(42, 'field'),
      (err: unknown) => {
        assert.ok(err instanceof ModuleError, 'expected ModuleError');
        assert.ok(!(err instanceof ConfigurationError), 'should not be ConfigurationError');
        return true;
      }
    );
  });

  void it('override error carries the validation message', () => {
    assert.throws(
      () => StrictConfigValidation.assertNumber('oops', 'count'),
      (err: unknown) => {
        assert.ok(err instanceof ModuleError);
        assert.strictEqual((err as ModuleError).message, 'count must be a number');
        return true;
      }
    );
  });

  void it('base ConfigValidation still throws ConfigurationError', () => {
    assert.throws(
      () => ConfigValidation.assertString(42, 'field'),
      ConfigurationError
    );
  });
});
