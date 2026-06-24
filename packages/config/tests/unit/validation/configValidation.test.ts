import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { ModuleError } from '@studnicky/errors';

import { ConfigurationError } from '../../../src/errors/ConfigurationError.js';
import { ConfigValidation } from '../../../src/validation/configValidation.js';

void describe('configValidation', () => {
  void describe('assertString', () => {
    const scenarios: Array<{ description: string; input: unknown; shouldThrow: boolean }> = [
      { description: 'passes for a string value', input: 'hello', shouldThrow: false },
      { description: 'skips validation for undefined', input: undefined, shouldThrow: false },
      { description: 'skips validation for null', input: null, shouldThrow: false },
      { description: 'throws for a number', input: 42, shouldThrow: true },
    ];

    for (const { description, input, shouldThrow } of scenarios) {
      void it(description, () => {
        if (shouldThrow) {
          assert.throws(
            () => ConfigValidation.assertString(input, 'field'),
            (err: unknown) => {
              assert.ok(err instanceof ConfigurationError);
              assert.strictEqual(err.message, 'field must be a string');
              return true;
            }
          );
        } else {
          assert.doesNotThrow(() => ConfigValidation.assertString(input, 'field'));
        }
      });
    }
  });

  void describe('assertNumber', () => {
    const scenarios: Array<{ description: string; input: unknown; shouldThrow: boolean }> = [
      { description: 'passes for a valid number', input: 5, shouldThrow: false },
      { description: 'skips for null', input: null, shouldThrow: false },
      { description: 'throws for NaN', input: NaN, shouldThrow: true },
    ];

    for (const { description, input, shouldThrow } of scenarios) {
      void it(description, () => {
        if (shouldThrow) {
          assert.throws(() => ConfigValidation.assertNumber(input, 'count'), ConfigurationError);
        } else {
          assert.doesNotThrow(() => ConfigValidation.assertNumber(input, 'count'));
        }
      });
    }
  });

  void describe('assertBoolean', () => {
    const scenarios: Array<{ description: string; input: unknown; shouldThrow: boolean }> = [
      { description: 'passes for true', input: true, shouldThrow: false },
      { description: 'passes for false', input: false, shouldThrow: false },
      { description: 'throws for a string', input: 'true', shouldThrow: true },
    ];

    for (const { description, input, shouldThrow } of scenarios) {
      void it(description, () => {
        if (shouldThrow) {
          assert.throws(() => ConfigValidation.assertBoolean(input, 'flag'), ConfigurationError);
        } else {
          assert.doesNotThrow(() => ConfigValidation.assertBoolean(input, 'flag'));
        }
      });
    }
  });

  void describe('assertFunction', () => {
    const scenarios: Array<{ description: string; input: unknown; shouldThrow: boolean }> = [
      { description: 'passes for a function', input: () => {}, shouldThrow: false },
      { description: 'throws for a non-function', input: 42, shouldThrow: true },
    ];

    for (const { description, input, shouldThrow } of scenarios) {
      void it(description, () => {
        if (shouldThrow) {
          assert.throws(() => ConfigValidation.assertFunction(input, 'fn'), ConfigurationError);
        } else {
          assert.doesNotThrow(() => ConfigValidation.assertFunction(input, 'fn'));
        }
      });
    }
  });

  void describe('assertInteger', () => {
    const scenarios: Array<{ description: string; input: unknown; shouldThrow: boolean }> = [
      { description: 'passes for an integer', input: 10, shouldThrow: false },
      { description: 'throws for a float', input: 3.14, shouldThrow: true },
    ];

    for (const { description, input, shouldThrow } of scenarios) {
      void it(description, () => {
        if (shouldThrow) {
          assert.throws(() => ConfigValidation.assertInteger(input, 'count'), ConfigurationError);
        } else {
          assert.doesNotThrow(() => ConfigValidation.assertInteger(input, 'count'));
        }
      });
    }
  });

  void describe('assertFinite', () => {
    const scenarios: Array<{ description: string; input: unknown; shouldThrow: boolean }> = [
      { description: 'passes for a finite number', input: 100, shouldThrow: false },
      { description: 'throws for Infinity', input: Infinity, shouldThrow: true },
      { description: 'throws for -Infinity', input: -Infinity, shouldThrow: true },
    ];

    for (const { description, input, shouldThrow } of scenarios) {
      void it(description, () => {
        if (shouldThrow) {
          assert.throws(() => ConfigValidation.assertFinite(input, 'val'), ConfigurationError);
        } else {
          assert.doesNotThrow(() => ConfigValidation.assertFinite(input, 'val'));
        }
      });
    }
  });

  void describe('assertNonNegative', () => {
    const scenarios: Array<{ description: string; input: unknown; shouldThrow: boolean }> = [
      { description: 'passes for 0', input: 0, shouldThrow: false },
      { description: 'passes for positive number', input: 5, shouldThrow: false },
      { description: 'throws for negative number', input: -1, shouldThrow: true },
    ];

    for (const { description, input, shouldThrow } of scenarios) {
      void it(description, () => {
        if (shouldThrow) {
          assert.throws(() => ConfigValidation.assertNonNegative(input, 'count'), ConfigurationError);
        } else {
          assert.doesNotThrow(() => ConfigValidation.assertNonNegative(input, 'count'));
        }
      });
    }
  });

  void describe('assertPositive', () => {
    const scenarios: Array<{ description: string; input: unknown; shouldThrow: boolean }> = [
      { description: 'passes for a positive number', input: 1, shouldThrow: false },
      { description: 'throws for 0', input: 0, shouldThrow: true },
      { description: 'throws for negative', input: -5, shouldThrow: true },
    ];

    for (const { description, input, shouldThrow } of scenarios) {
      void it(description, () => {
        if (shouldThrow) {
          assert.throws(() => ConfigValidation.assertPositive(input, 'val'), ConfigurationError);
        } else {
          assert.doesNotThrow(() => ConfigValidation.assertPositive(input, 'val'));
        }
      });
    }
  });

  void describe('assertMin', () => {
    const scenarios: Array<{ description: string; value: unknown; min: number; shouldThrow: boolean }> = [
      { description: 'passes when value meets minimum', value: 10, min: 10, shouldThrow: false },
      { description: 'throws when value is below minimum', value: 4, min: 5, shouldThrow: true },
    ];

    for (const { description, value, min, shouldThrow } of scenarios) {
      void it(description, () => {
        if (shouldThrow) {
          assert.throws(() => ConfigValidation.assertMin(value, min, 'val'), ConfigurationError);
        } else {
          assert.doesNotThrow(() => ConfigValidation.assertMin(value, min, 'val'));
        }
      });
    }
  });

  void describe('assertPositiveOrInfinity', () => {
    const scenarios: Array<{ description: string; input: unknown; shouldThrow: boolean }> = [
      { description: 'passes for Infinity', input: Infinity, shouldThrow: false },
      { description: 'passes for positive number', input: 1, shouldThrow: false },
      { description: 'throws for 0', input: 0, shouldThrow: true },
    ];

    for (const { description, input, shouldThrow } of scenarios) {
      void it(description, () => {
        if (shouldThrow) {
          assert.throws(() => ConfigValidation.assertPositiveOrInfinity(input, 'val'), ConfigurationError);
        } else {
          assert.doesNotThrow(() => ConfigValidation.assertPositiveOrInfinity(input, 'val'));
        }
      });
    }
  });

  void describe('assertHasMethod', () => {
    const scenarios: Array<{ description: string; target: unknown; shouldThrow: boolean }> = [
      { description: 'passes when object has the method', target: { log: () => {} }, shouldThrow: false },
      { description: 'throws when object lacks the method', target: {}, shouldThrow: true },
      { description: 'throws when value is not an object', target: 42, shouldThrow: true },
    ];

    for (const { description, target, shouldThrow } of scenarios) {
      void it(description, () => {
        if (shouldThrow) {
          assert.throws(() => ConfigValidation.assertHasMethod(target, 'log', 'logger'), ConfigurationError);
        } else {
          assert.doesNotThrow(() => ConfigValidation.assertHasMethod(target, 'log', 'logger'));
        }
      });
    }
  });

  void describe('assertFunctionOrObjectWithMethod', () => {
    const scenarios: Array<{ description: string; target: unknown; shouldThrow: boolean }> = [
      { description: 'passes for a function', target: () => {}, shouldThrow: false },
      { description: 'passes for an object with the method', target: { emit: () => {} }, shouldThrow: false },
      { description: 'throws for an object missing the method', target: {}, shouldThrow: true },
    ];

    for (const { description, target, shouldThrow } of scenarios) {
      void it(description, () => {
        if (shouldThrow) {
          assert.throws(
            () => ConfigValidation.assertFunctionOrObjectWithMethod(target, 'emit', 'handler'),
            ConfigurationError
          );
        } else {
          assert.doesNotThrow(() =>
            ConfigValidation.assertFunctionOrObjectWithMethod(target, 'emit', 'handler')
          );
        }
      });
    }
  });

  void describe('assertNoUnknownKeys', () => {
    const scenarios: Array<{ description: string; input: Record<string, unknown>; known: Set<string>; shouldThrow: boolean }> = [
      {
        description: 'passes when all keys are known',
        input: { a: 1, b: 2 },
        known: new Set(['a', 'b', 'c']),
        shouldThrow: false,
      },
      {
        description: 'throws when an unknown key is present',
        input: { a: 1, x: 99 },
        known: new Set(['a', 'b']),
        shouldThrow: true,
      },
    ];

    for (const { description, input, known, shouldThrow } of scenarios) {
      void it(description, () => {
        if (shouldThrow) {
          assert.throws(() => ConfigValidation.assertNoUnknownKeys(input, known), ConfigurationError);
        } else {
          assert.doesNotThrow(() => ConfigValidation.assertNoUnknownKeys(input, known));
        }
      });
    }
  });
});

void describe('ConfigValidation subclass extension', () => {
  class StrictConfigValidation extends ConfigValidation {
    protected static override onValidationError(message: string): never {
      throw ModuleError.create(message, { scenario: 'CONFIGURATION' });
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
