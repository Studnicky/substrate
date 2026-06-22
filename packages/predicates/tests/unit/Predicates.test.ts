import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { Predicates } from '../../src/Predicates.js';

describe('Predicates', () => {
  describe('matchesType', () => {
    it('returns true for string type match', () => {
      assert.strictEqual(Predicates.matchesType('string', 'hello'), true);
    });

    it('returns true for number type match', () => {
      assert.strictEqual(Predicates.matchesType('number', 42), true);
    });

    it('returns false for integer with float value', () => {
      assert.strictEqual(Predicates.matchesType('integer', 3.14), false);
    });

    it('returns true for integer with whole number', () => {
      assert.strictEqual(Predicates.matchesType('integer', 7), true);
    });

    it('returns true for boolean type match', () => {
      assert.strictEqual(Predicates.matchesType('boolean', true), true);
    });

    it('returns true for null type match', () => {
      assert.strictEqual(Predicates.matchesType('null', null), true);
    });

    it('returns false for null type with non-null', () => {
      assert.strictEqual(Predicates.matchesType('null', 0), false);
    });

    it('returns true for array type match', () => {
      assert.strictEqual(Predicates.matchesType('array', [1, 2, 3]), true);
    });

    it('returns true for object type match', () => {
      assert.strictEqual(Predicates.matchesType('object', { a: 1 }), true);
    });

    it('returns false for object type with array', () => {
      assert.strictEqual(Predicates.matchesType('object', [1, 2]), false);
    });
  });

  describe('checkMinLength', () => {
    it('returns true when string meets minimum code-point count', () => {
      assert.strictEqual(Predicates.checkMinLength('hello', 3), true);
    });

    it('returns false when string is shorter than minimum', () => {
      assert.strictEqual(Predicates.checkMinLength('hi', 3), false);
    });

    it('handles surrogate pairs as single code points', () => {
      // '𝄞' is U+1D11E — one code point, two UTF-16 code units
      assert.strictEqual(Predicates.checkMinLength('𝄞', 1), true);
      assert.strictEqual(Predicates.checkMinLength('𝄞', 2), false);
    });
  });

  describe('checkMaxLength', () => {
    it('returns true when string is within maximum code-point count', () => {
      assert.strictEqual(Predicates.checkMaxLength('hello', 10), true);
    });

    it('returns false when string exceeds maximum', () => {
      assert.strictEqual(Predicates.checkMaxLength('hello', 3), false);
    });

    it('returns true at exact maximum', () => {
      assert.strictEqual(Predicates.checkMaxLength('hello', 5), true);
    });

    it('handles surrogate pairs as single code points', () => {
      // '𝄞𝄞' — two surrogate-pair code points, four UTF-16 units
      assert.strictEqual(Predicates.checkMaxLength('𝄞𝄞', 2), true);
      assert.strictEqual(Predicates.checkMaxLength('𝄞𝄞𝄞', 2), false);
    });
  });

  describe('checkPattern', () => {
    it('returns true when string matches pattern string', () => {
      assert.strictEqual(Predicates.checkPattern('hello', '^he'), true);
    });

    it('returns false when string does not match pattern string', () => {
      assert.strictEqual(Predicates.checkPattern('world', '^he'), false);
    });

    it('accepts a compiled RegExp', () => {
      assert.strictEqual(Predicates.checkPattern('hello', /^he/u), true);
    });
  });

  describe('checkMinimum', () => {
    it('returns true for inclusive minimum satisfied', () => {
      assert.strictEqual(Predicates.checkMinimum(5, 5, false), true);
    });

    it('returns false for exclusive minimum at boundary', () => {
      assert.strictEqual(Predicates.checkMinimum(5, 5, true), false);
    });

    it('returns true for exclusive minimum above boundary', () => {
      assert.strictEqual(Predicates.checkMinimum(6, 5, true), true);
    });

    it('returns false when value is below inclusive minimum', () => {
      assert.strictEqual(Predicates.checkMinimum(4, 5, false), false);
    });
  });

  describe('checkMaximum', () => {
    it('returns true for inclusive maximum satisfied', () => {
      assert.strictEqual(Predicates.checkMaximum(5, 5, false), true);
    });

    it('returns false for exclusive maximum at boundary', () => {
      assert.strictEqual(Predicates.checkMaximum(5, 5, true), false);
    });

    it('returns true for exclusive maximum below boundary', () => {
      assert.strictEqual(Predicates.checkMaximum(4, 5, true), true);
    });
  });

  describe('checkMultipleOf', () => {
    it('returns true for exact integer multiple', () => {
      assert.strictEqual(Predicates.checkMultipleOf(6, 3), true);
    });

    it('returns true for floating-point multiple within epsilon', () => {
      assert.strictEqual(Predicates.checkMultipleOf(0.3, 0.1), true);
    });

    it('returns false for non-multiple', () => {
      assert.strictEqual(Predicates.checkMultipleOf(7, 3), false);
    });

    it('returns false for divisor zero', () => {
      assert.strictEqual(Predicates.checkMultipleOf(5, 0), false);
    });
  });

  describe('checkMinItems', () => {
    it('returns true when array meets minimum length', () => {
      assert.strictEqual(Predicates.checkMinItems([1, 2], 1), true);
    });

    it('returns true at exact minimum', () => {
      assert.strictEqual(Predicates.checkMinItems([1], 1), true);
    });

    it('returns false when array is shorter than minimum', () => {
      assert.strictEqual(Predicates.checkMinItems([], 1), false);
    });
  });

  describe('checkMaxItems', () => {
    it('returns true when array is within maximum', () => {
      assert.strictEqual(Predicates.checkMaxItems([1, 2], 3), true);
    });

    it('returns false when array exceeds maximum', () => {
      assert.strictEqual(Predicates.checkMaxItems([1, 2, 3], 2), false);
    });
  });

  describe('checkUniqueItems', () => {
    it('returns true for array with all unique primitives', () => {
      assert.strictEqual(Predicates.checkUniqueItems([1, 2, 3]), true);
    });

    it('returns false for array with duplicate primitives', () => {
      assert.strictEqual(Predicates.checkUniqueItems([1, 2, 1]), false);
    });

    it('returns true for array with unique objects', () => {
      assert.strictEqual(Predicates.checkUniqueItems([{ a: 1 }, { a: 2 }]), true);
    });

    it('returns false for array with deeply-equal objects', () => {
      assert.strictEqual(Predicates.checkUniqueItems([{ a: 1 }, { a: 1 }]), false);
    });
  });

  describe('checkRequired', () => {
    it('returns true when all required properties are present', () => {
      assert.strictEqual(Predicates.checkRequired({ a: 1, b: 2 }, ['a', 'b']), true);
    });

    it('returns false when a required property is missing', () => {
      assert.strictEqual(Predicates.checkRequired({ a: 1 }, ['a', 'b']), false);
    });

    it('returns true for empty required list', () => {
      assert.strictEqual(Predicates.checkRequired({}, []), true);
    });
  });

  describe('matchesAnyType', () => {
    it('returns true when value matches one of the listed types', () => {
      assert.strictEqual(Predicates.matchesAnyType(['string', 'null'], 'hello'), true);
    });

    it('returns false when value matches none of the listed types', () => {
      assert.strictEqual(Predicates.matchesAnyType(['string', 'null'], 42), false);
    });
  });

  describe('satisfiesConst', () => {
    it('returns true for deeply equal primitive', () => {
      assert.strictEqual(Predicates.satisfiesConst(42, 42), true);
    });

    it('returns false for non-equal primitive', () => {
      assert.strictEqual(Predicates.satisfiesConst(42, 43), false);
    });

    it('returns true for deeply equal object', () => {
      assert.strictEqual(Predicates.satisfiesConst({ a: 1 }, { a: 1 }), true);
    });
  });

  describe('satisfiesEnum', () => {
    it('returns true when value is in enum', () => {
      assert.strictEqual(Predicates.satisfiesEnum('b', ['a', 'b', 'c']), true);
    });

    it('returns false when value is not in enum', () => {
      assert.strictEqual(Predicates.satisfiesEnum('d', ['a', 'b', 'c']), false);
    });
  });

  describe('satisfiesContains', () => {
    it('returns true when match count satisfies default minimum of 1', () => {
      assert.strictEqual(Predicates.satisfiesContains(1, undefined, undefined), true);
    });

    it('returns false when match count is below minimum', () => {
      assert.strictEqual(Predicates.satisfiesContains(0, 1, undefined), false);
    });

    it('returns false when match count exceeds maximum', () => {
      assert.strictEqual(Predicates.satisfiesContains(3, 1, 2), false);
    });
  });

  describe('satisfiesContentEncoding', () => {
    it('returns true for valid base64 string', () => {
      assert.strictEqual(Predicates.satisfiesContentEncoding('aGVsbG8=', 'base64'), true);
    });

    it('returns false for invalid base64 string', () => {
      assert.strictEqual(Predicates.satisfiesContentEncoding('not base64!!!', 'base64'), false);
    });

    it('returns true for unknown encoding (unconstrained)', () => {
      assert.strictEqual(Predicates.satisfiesContentEncoding('anything', 'quoted-printable'), true);
    });
  });

  describe('satisfiesContentMediaType', () => {
    it('returns true for valid JSON string', () => {
      assert.strictEqual(Predicates.satisfiesContentMediaType('{"x":1}', 'application/json'), true);
    });

    it('returns false for invalid JSON string', () => {
      assert.strictEqual(Predicates.satisfiesContentMediaType('{bad json}', 'application/json'), false);
    });

    it('returns true for unknown media type (unconstrained)', () => {
      assert.strictEqual(Predicates.satisfiesContentMediaType('anything', 'text/html'), true);
    });
  });

  describe('hasNoAdditionalProperties', () => {
    it('returns true when all object keys are in allowed set', () => {
      assert.strictEqual(
        Predicates.hasNoAdditionalProperties({ a: 1, b: 2 }, new Set(['a', 'b', 'c'])),
        true
      );
    });

    it('returns false when object has a key outside allowed set', () => {
      assert.strictEqual(
        Predicates.hasNoAdditionalProperties({ a: 1, z: 2 }, new Set(['a', 'b'])),
        false
      );
    });
  });

  describe('satisfiesMinProperties / satisfiesMaxProperties', () => {
    it('returns true when object has at least minimum properties', () => {
      assert.strictEqual(Predicates.satisfiesMinProperties({ a: 1, b: 2 }, 2), true);
    });

    it('returns false when object has fewer than minimum properties', () => {
      assert.strictEqual(Predicates.satisfiesMinProperties({ a: 1 }, 2), false);
    });

    it('returns true when object has at most maximum properties', () => {
      assert.strictEqual(Predicates.satisfiesMaxProperties({ a: 1 }, 2), true);
    });

    it('returns false when object exceeds maximum properties', () => {
      assert.strictEqual(Predicates.satisfiesMaxProperties({ a: 1, b: 2, c: 3 }, 2), false);
    });
  });

  describe('coerceToBoolean', () => {
    it('coerces "true" to true', () => {
      assert.strictEqual(Predicates.coerceToBoolean('true'), true);
    });

    it('coerces "false" to false', () => {
      assert.strictEqual(Predicates.coerceToBoolean('false'), false);
    });

    it('returns undefined for unrecognised string', () => {
      assert.strictEqual(Predicates.coerceToBoolean('yes'), undefined);
    });
  });

  describe('coerceToNumber', () => {
    it('coerces numeric string to number', () => {
      assert.strictEqual(Predicates.coerceToNumber('3.14'), 3.14);
    });

    it('returns undefined for non-numeric string', () => {
      assert.strictEqual(Predicates.coerceToNumber('abc'), undefined);
    });

    it('returns undefined for "Infinity"', () => {
      assert.strictEqual(Predicates.coerceToNumber('Infinity'), undefined);
    });
  });

  describe('coerceValue', () => {
    it('coerces string "true" to boolean true', () => {
      assert.strictEqual(Predicates.coerceValue(['boolean'], 'true'), true);
    });

    it('returns original value when no coercion applies', () => {
      assert.strictEqual(Predicates.coerceValue(['integer'], 'not-a-number'), 'not-a-number');
    });

    it('returns null unchanged', () => {
      assert.strictEqual(Predicates.coerceValue(['string'], null), null);
    });

    it('returns value unchanged when schemaTypes is empty', () => {
      assert.strictEqual(Predicates.coerceValue([], 'hello'), 'hello');
    });
  });

  describe('inferValueType', () => {
    it('returns "null" for null', () => {
      assert.strictEqual(Predicates.inferValueType(null), 'null');
    });

    it('returns "array" for arrays', () => {
      assert.strictEqual(Predicates.inferValueType([]), 'array');
    });

    it('returns "object" for plain objects', () => {
      assert.strictEqual(Predicates.inferValueType({}), 'object');
    });

    it('returns "string" for strings', () => {
      assert.strictEqual(Predicates.inferValueType('hello'), 'string');
    });
  });

  describe('codePointLength', () => {
    it('counts ASCII characters correctly', () => {
      assert.strictEqual(Predicates.codePointLength('hello'), 5);
    });

    it('counts surrogate-pair emoji as one code point', () => {
      // '😀' is U+1F600 — one code point, two UTF-16 units
      assert.strictEqual(Predicates.codePointLength('😀'), 1);
    });

    it('returns 0 for empty string', () => {
      assert.strictEqual(Predicates.codePointLength(''), 0);
    });
  });
});
