/** arrayAndObject — array constraints, object property rules, enum/const, and content validation. Run: npx tsx examples/arrayAndObject.ts */

import assert from 'node:assert/strict';

// #region usage
import { Predicates } from '../src/index.js';

// #region array
// checkMinItems / checkMaxItems test array length
console.log('checkMinItems [1,2,3] 3:', Predicates.checkMinItems([1, 2, 3], 3));  // true
console.log('checkMinItems [1,2] 3:', Predicates.checkMinItems([1, 2], 3));        // false
console.log('checkMaxItems [1,2] 3:', Predicates.checkMaxItems([1, 2], 3));        // true
console.log('checkMaxItems [1,2,3,4] 3:', Predicates.checkMaxItems([1, 2, 3, 4], 3)); // false

// checkUniqueItems uses deep equality for each pair
console.log('checkUniqueItems [1,2,3]:', Predicates.checkUniqueItems([1, 2, 3]));        // true
console.log('checkUniqueItems [1,2,1]:', Predicates.checkUniqueItems([1, 2, 1]));        // false
console.log('checkUniqueItems [{a:1},{a:1}]:', Predicates.checkUniqueItems([{ 'a': 1 }, { 'a': 1 }])); // false

// satisfiesContains validates minContains/maxContains bounds against a pre-counted match total
console.log('satisfiesContains 2 1 3:', Predicates.satisfiesContains(2, 1, 3));              // true
console.log('satisfiesContains 0 1 3:', Predicates.satisfiesContains(0, 1, 3));              // false
console.log('satisfiesContains 1 undef undef:', Predicates.satisfiesContains(1, undefined, undefined)); // true
// #endregion array

// #region object
// checkRequired verifies all listed keys exist in the object
console.log('checkRequired {a,b} [a,b]:', Predicates.checkRequired({ 'a': 1, 'b': 2 }, ['a', 'b'])); // true
console.log('checkRequired {a} [a,b]:', Predicates.checkRequired({ 'a': 1 }, ['a', 'b']));            // false

// hasNoAdditionalProperties checks that every key belongs to the allowed set
console.log('hasNoAdditionalProperties {a} Set[a,b]:', Predicates.hasNoAdditionalProperties({ 'a': 1 }, new Set(['a', 'b']))); // true
console.log('hasNoAdditionalProperties {a,c} Set[a,b]:', Predicates.hasNoAdditionalProperties({ 'a': 1, 'c': 3 }, new Set(['a', 'b']))); // false

// satisfiesMinProperties / satisfiesMaxProperties count own enumerable keys
console.log('satisfiesMinProperties {a,b} 2:', Predicates.satisfiesMinProperties({ 'a': 1, 'b': 2 }, 2)); // true
console.log('satisfiesMaxProperties {a,b,c} 2:', Predicates.satisfiesMaxProperties({ 'a': 1, 'b': 2, 'c': 3 }, 2)); // false
// #endregion object

// #region enum
// satisfiesEnum uses deep equality against each candidate
console.log('satisfiesEnum red:', Predicates.satisfiesEnum('red', ['red', 'green', 'blue']));         // true
console.log('satisfiesEnum yellow:', Predicates.satisfiesEnum('yellow', ['red', 'green', 'blue']));   // false
console.log('satisfiesEnum {x:1}:', Predicates.satisfiesEnum({ 'x': 1 }, [{ 'x': 1 }, { 'x': 2 }])); // true

// satisfiesConst uses deep equality for a single fixed value
console.log('satisfiesConst {x:1} {x:1}:', Predicates.satisfiesConst({ 'x': 1 }, { 'x': 1 })); // true
console.log('satisfiesConst {x:1} {x:2}:', Predicates.satisfiesConst({ 'x': 1 }, { 'x': 2 })); // false
// #endregion enum

// #region content
// satisfiesContentEncoding validates base64 and base64url; unknown encodings pass
console.log('satisfiesContentEncoding base64:', Predicates.satisfiesContentEncoding('aGVsbG8=', 'base64'));            // true
console.log('satisfiesContentEncoding bad base64:', Predicates.satisfiesContentEncoding('not-base64!!!', 'base64'));   // false
console.log('satisfiesContentEncoding base64url:', Predicates.satisfiesContentEncoding('aGVsbG8', 'base64url'));       // true
console.log('satisfiesContentEncoding unknown:', Predicates.satisfiesContentEncoding('anything', 'custom-encoding'));  // true

// satisfiesContentMediaType validates application/json; unknown media types pass
console.log('satisfiesContentMediaType json:', Predicates.satisfiesContentMediaType('{"x":1}', 'application/json'));    // true
console.log('satisfiesContentMediaType bad json:', Predicates.satisfiesContentMediaType('{bad json}', 'application/json')); // false
console.log('satisfiesContentMediaType text/plain:', Predicates.satisfiesContentMediaType('anything', 'text/plain'));   // true
// #endregion content
// #endregion usage

assert.equal(Predicates.checkMinItems([1, 2, 3], 3), true);
assert.equal(Predicates.checkMinItems([1, 2], 3), false);
assert.equal(Predicates.checkMaxItems([1, 2], 3), true);
assert.equal(Predicates.checkMaxItems([1, 2, 3, 4], 3), false);

assert.equal(Predicates.checkUniqueItems([1, 2, 3]), true);
assert.equal(Predicates.checkUniqueItems([1, 2, 1]), false);
assert.equal(Predicates.checkUniqueItems([{ 'a': 1 }, { 'a': 2 }]), true);
assert.equal(Predicates.checkUniqueItems([{ 'a': 1 }, { 'a': 1 }]), false);

assert.equal(Predicates.satisfiesContains(2, 1, 3), true);
assert.equal(Predicates.satisfiesContains(0, 1, 3), false);
assert.equal(Predicates.satisfiesContains(4, 1, 3), false);
assert.equal(Predicates.satisfiesContains(1, undefined, undefined), true);

assert.equal(Predicates.checkRequired({ 'a': 1, 'b': 2 }, ['a', 'b']), true);
assert.equal(Predicates.checkRequired({ 'a': 1 }, ['a', 'b']), false);
assert.equal(Predicates.checkRequired({}, []), true);

assert.equal(Predicates.hasNoAdditionalProperties({ 'a': 1 }, new Set(['a', 'b'])), true);
assert.equal(Predicates.hasNoAdditionalProperties({ 'a': 1, 'c': 3 }, new Set(['a', 'b'])), false);

assert.equal(Predicates.satisfiesMinProperties({ 'a': 1, 'b': 2 }, 2), true);
assert.equal(Predicates.satisfiesMinProperties({ 'a': 1 }, 2), false);
assert.equal(Predicates.satisfiesMaxProperties({ 'a': 1, 'b': 2 }, 3), true);
assert.equal(Predicates.satisfiesMaxProperties({ 'a': 1, 'b': 2, 'c': 3 }, 2), false);

assert.equal(Predicates.satisfiesEnum('red', ['red', 'green', 'blue']), true);
assert.equal(Predicates.satisfiesEnum('yellow', ['red', 'green', 'blue']), false);
assert.equal(Predicates.satisfiesEnum({ 'x': 1 }, [{ 'x': 1 }, { 'x': 2 }]), true);
assert.equal(Predicates.satisfiesEnum(null, ['red', null]), true);

assert.equal(Predicates.satisfiesConst({ 'x': 1 }, { 'x': 1 }), true);
assert.equal(Predicates.satisfiesConst({ 'x': 1 }, { 'x': 2 }), false);
assert.equal(Predicates.satisfiesConst(null, null), true);

assert.equal(Predicates.satisfiesContentEncoding('aGVsbG8=', 'base64'), true);
assert.equal(Predicates.satisfiesContentEncoding('not-base64!!!', 'base64'), false);
assert.equal(Predicates.satisfiesContentEncoding('aGVsbG8', 'base64url'), true);
assert.equal(Predicates.satisfiesContentEncoding('anything', 'custom-encoding'), true);

assert.equal(Predicates.satisfiesContentMediaType('{"x":1}', 'application/json'), true);
assert.equal(Predicates.satisfiesContentMediaType('{bad json}', 'application/json'), false);
assert.equal(Predicates.satisfiesContentMediaType('anything', 'text/plain'), true);

console.log('arrayAndObject: all assertions passed');
