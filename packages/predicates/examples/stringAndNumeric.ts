/** stringAndNumeric — string bounds, numeric constraints, and coercion helpers. Run: npx tsx examples/stringAndNumeric.ts */

import assert from 'node:assert/strict';

// #region usage
import { Predicates } from '../src/index.js';
import { WORD_PATTERN } from './fixtures/StringAndNumericFixtures.js';

// #region string
// codePointLength counts Unicode scalar values, not UTF-16 code units
console.log('codePointLength hello:', Predicates.codePointLength('hello'));   // 5
console.log('codePointLength 👋:', Predicates.codePointLength('👋'));          // 1
console.log('codePointLength 👋👋:', Predicates.codePointLength('👋👋'));      // 2

// satisfiesMinLength / satisfiesMaxLength operate on code-point counts
console.log('satisfiesMinLength hello 5:', Predicates.satisfiesMinLength('hello', 5));  // true
console.log('satisfiesMinLength hi 5:', Predicates.satisfiesMinLength('hi', 5));        // false
console.log('satisfiesMaxLength hello 5:', Predicates.satisfiesMaxLength('hello', 5));  // true
console.log('satisfiesMaxLength hello 4:', Predicates.satisfiesMaxLength('hello', 4));  // false

// satisfiesPattern accepts a pre-compiled RegExp
console.log('satisfiesPattern abc123:', Predicates.satisfiesPattern('abc123', WORD_PATTERN));  // true
console.log('satisfiesPattern abc 123:', Predicates.satisfiesPattern('abc 123', WORD_PATTERN)); // false
// #endregion string

// #region numeric
// checkMinimum / checkMaximum with inclusive and exclusive modes
console.log('checkMinimum 5 5 false:', Predicates.checkMinimum(5, 5, false));   // true  (inclusive)
console.log('checkMinimum 5 5 true:', Predicates.checkMinimum(5, 5, true));     // false (exclusive)
console.log('checkMaximum 10 10 false:', Predicates.checkMaximum(10, 10, false)); // true
console.log('checkMaximum 10 10 true:', Predicates.checkMaximum(10, 10, true));   // false

// checkMultipleOf is epsilon-tolerant for floating-point rounding
console.log('checkMultipleOf 0.3 0.1:', Predicates.checkMultipleOf(0.3, 0.1)); // true
console.log('checkMultipleOf 9 3:', Predicates.checkMultipleOf(9, 3));         // true
console.log('checkMultipleOf 10 3:', Predicates.checkMultipleOf(10, 3));       // false
// #endregion numeric

// #region coercion
// coerceToBoolean: recognised literals only; undefined for anything else
console.log('coerceToBoolean true:', Predicates.coerceToBoolean('true'));    // true
console.log('coerceToBoolean 1:', Predicates.coerceToBoolean('1'));          // true
console.log('coerceToBoolean maybe:', Predicates.coerceToBoolean('maybe'));  // undefined

// coerceToNumber: finite numbers only; undefined for NaN / Infinity / non-numeric
console.log('coerceToNumber 3.14:', Predicates.coerceToNumber('3.14'));      // 3.14
console.log('coerceToNumber NaN:', Predicates.coerceToNumber('NaN'));        // undefined
console.log('coerceToNumber Infinity:', Predicates.coerceToNumber('Infinity')); // undefined

// coerceValue tries each schema type in order, returns first successful coercion
const coercedInt = Predicates.coerceValue(['integer', 'string'], '42');
console.log('coerceValue integer|string 42:', coercedInt);  // 42
// #endregion coercion
// #endregion usage

assert.equal(Predicates.codePointLength('hello'), 5);
assert.equal(Predicates.codePointLength('👋'), 1);
assert.equal(Predicates.codePointLength('👋👋'), 2);
assert.equal(Predicates.codePointLength(''), 0);

assert.equal(Predicates.satisfiesMinLength('hello', 5), true);
assert.equal(Predicates.satisfiesMinLength('hi', 5), false);
assert.equal(Predicates.satisfiesMinLength('👋👋', 2), true);
assert.equal(Predicates.satisfiesMaxLength('hello', 5), true);
assert.equal(Predicates.satisfiesMaxLength('hello', 4), false);
assert.equal(Predicates.satisfiesMaxLength('👋', 1), true);

assert.equal(Predicates.satisfiesPattern('abc123', WORD_PATTERN), true);
assert.equal(Predicates.satisfiesPattern('abc 123', WORD_PATTERN), false);

assert.equal(Predicates.checkMinimum(5, 5, false), true);
assert.equal(Predicates.checkMinimum(5, 5, true), false);
assert.equal(Predicates.checkMinimum(6, 5, true), true);
assert.equal(Predicates.checkMaximum(10, 10, false), true);
assert.equal(Predicates.checkMaximum(10, 10, true), false);
assert.equal(Predicates.checkMaximum(9, 10, true), true);

assert.equal(Predicates.checkMultipleOf(0.3, 0.1), true);
assert.equal(Predicates.checkMultipleOf(9, 3), true);
assert.equal(Predicates.checkMultipleOf(10, 3), false);

assert.equal(Predicates.coerceToBoolean('true'), true);
assert.equal(Predicates.coerceToBoolean('1'), true);
assert.equal(Predicates.coerceToBoolean('false'), false);
assert.equal(Predicates.coerceToBoolean('0'), false);
assert.equal(Predicates.coerceToBoolean('maybe'), undefined);
assert.equal(Predicates.coerceToBoolean('yes'), undefined);

assert.equal(Predicates.coerceToNumber('3.14'), 3.14);
assert.equal(Predicates.coerceToNumber('-7'), -7);
assert.equal(Predicates.coerceToNumber('NaN'), undefined);
assert.equal(Predicates.coerceToNumber('Infinity'), undefined);
assert.equal(Predicates.coerceToNumber('abc'), undefined);

assert.equal(coercedInt, 42);
assert.equal(Predicates.coerceValue(['boolean', 'number'], '1'), true);
assert.equal(Predicates.coerceValue(['number'], 'not-a-number'), 'not-a-number');

console.log('stringAndNumeric: all assertions passed');
