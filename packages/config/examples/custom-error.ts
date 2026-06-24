/** custom-error — subclass ConfigValidation and override onValidationError to use a domain error type. Run: npx tsx packages/config/examples/custom-error.ts */

import assert from 'node:assert/strict';

// #region usage
import { ConfigValidation } from '../src/index.js';

class AppConfigValidation extends ConfigValidation {
  protected static override onValidationError(message: string): never {
    throw new Error(`[app] ${message}`);
  }
}

// Invalid string — custom prefix applied
let caughtString: Error | undefined;
try {
  AppConfigValidation.assertString(123, 'apiKey');
} catch (err) {
  if (err instanceof Error) {
    caughtString = err;
  }
}

// Invalid number — same override path
let caughtNumber: Error | undefined;
try {
  AppConfigValidation.assertNumber('oops', 'timeout');
} catch (err) {
  if (err instanceof Error) {
    caughtNumber = err;
  }
}

// Invalid boolean — same override path
let caughtBoolean: Error | undefined;
try {
  AppConfigValidation.assertBoolean(1, 'enabled');
} catch (err) {
  if (err instanceof Error) {
    caughtBoolean = err;
  }
}

// Valid inputs pass silently
AppConfigValidation.assertString('valid', 'name');
AppConfigValidation.assertNumber(42, 'count');

console.log('assertString(123) threw:', caughtString?.message);
console.log('assertNumber("oops") threw:', caughtNumber?.message);
console.log('assertBoolean(1) threw:', caughtBoolean?.message);
// #endregion usage

assert.ok(caughtString instanceof Error, 'Expected an Error');
assert.ok(caughtString.message.startsWith('[app]'));
assert.equal(caughtString.message, '[app] apiKey must be a string');

assert.ok(caughtNumber instanceof Error, 'Expected an Error');
assert.equal(caughtNumber.message, '[app] timeout must be a number');

assert.ok(caughtBoolean instanceof Error, 'Expected an Error');
assert.equal(caughtBoolean.message, '[app] enabled must be a boolean');

console.log('custom-error: all assertions passed');
