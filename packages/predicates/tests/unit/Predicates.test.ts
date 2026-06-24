import assert from 'node:assert/strict';
import { it } from 'node:test';
import { Predicates } from '../../src/Predicates.js';

// matchesType
const matchesTypeScenarios: Array<{ description: string; schemaType: string; value: unknown; expected: boolean }> = [
  { description: 'returns true for string type match', schemaType: 'string', value: 'hello', expected: true },
  { description: 'returns true for number type match', schemaType: 'number', value: 42, expected: true },
  { description: 'returns false for integer with float value', schemaType: 'integer', value: 3.14, expected: false },
  { description: 'returns true for integer with whole number', schemaType: 'integer', value: 7, expected: true },
  { description: 'returns true for boolean type match', schemaType: 'boolean', value: true, expected: true },
  { description: 'returns true for null type match', schemaType: 'null', value: null, expected: true },
  { description: 'returns false for null type with non-null', schemaType: 'null', value: 0, expected: false },
  { description: 'returns true for array type match', schemaType: 'array', value: [1, 2, 3], expected: true },
  { description: 'returns true for object type match', schemaType: 'object', value: { a: 1 }, expected: true },
  { description: 'returns false for object type with array', schemaType: 'object', value: [1, 2], expected: false },
];
for (const { description, schemaType, value, expected } of matchesTypeScenarios) {
  void it(description, () => { assert.strictEqual(Predicates.matchesType(schemaType as 'string', value), expected); });
}

// checkMinLength
const checkMinLengthScenarios: Array<{ description: string; input: string; min: number; expected: boolean }> = [
  { description: 'returns true when string meets minimum code-point count', input: 'hello', min: 3, expected: true },
  { description: 'returns false when string is shorter than minimum', input: 'hi', min: 3, expected: false },
  { description: 'handles surrogate pair as single code point (meets min 1)', input: '𝄞', min: 1, expected: true },
  { description: 'handles surrogate pair as single code point (below min 2)', input: '𝄞', min: 2, expected: false },
];
for (const { description, input, min, expected } of checkMinLengthScenarios) {
  void it(description, () => { assert.strictEqual(Predicates.checkMinLength(input, min), expected); });
}

// checkMaxLength
const checkMaxLengthScenarios: Array<{ description: string; input: string; max: number; expected: boolean }> = [
  { description: 'returns true when string is within maximum code-point count', input: 'hello', max: 10, expected: true },
  { description: 'returns false when string exceeds maximum', input: 'hello', max: 3, expected: false },
  { description: 'returns true at exact maximum', input: 'hello', max: 5, expected: true },
  // '𝄞𝄞' — two surrogate-pair code points, four UTF-16 units
  { description: 'handles surrogate pairs as single code points (within max)', input: '𝄞𝄞', max: 2, expected: true },
  { description: 'handles surrogate pairs as single code points (exceeds max)', input: '𝄞𝄞𝄞', max: 2, expected: false },
];
for (const { description, input, max, expected } of checkMaxLengthScenarios) {
  void it(description, () => { assert.strictEqual(Predicates.checkMaxLength(input, max), expected); });
}

// checkPattern — kept as individual it() calls (mixed second-arg types)
void it('returns true when string matches pattern string', () => {
  assert.strictEqual(Predicates.checkPattern('hello', '^he'), true);
});
void it('returns false when string does not match pattern string', () => {
  assert.strictEqual(Predicates.checkPattern('world', '^he'), false);
});
void it('accepts a compiled RegExp', () => {
  assert.strictEqual(Predicates.checkPattern('hello', /^he/u), true);
});

// checkMinimum
const checkMinimumScenarios: Array<{ description: string; value: number; minimum: number; exclusive: boolean; expected: boolean }> = [
  { description: 'returns true for inclusive minimum satisfied', value: 5, minimum: 5, exclusive: false, expected: true },
  { description: 'returns false for exclusive minimum at boundary', value: 5, minimum: 5, exclusive: true, expected: false },
  { description: 'returns true for exclusive minimum above boundary', value: 6, minimum: 5, exclusive: true, expected: true },
  { description: 'returns false when value is below inclusive minimum', value: 4, minimum: 5, exclusive: false, expected: false },
];
for (const { description, value, minimum, exclusive, expected } of checkMinimumScenarios) {
  void it(description, () => { assert.strictEqual(Predicates.checkMinimum(value, minimum, exclusive), expected); });
}

// checkMaximum
const checkMaximumScenarios: Array<{ description: string; value: number; maximum: number; exclusive: boolean; expected: boolean }> = [
  { description: 'returns true for inclusive maximum satisfied', value: 5, maximum: 5, exclusive: false, expected: true },
  { description: 'returns false for exclusive maximum at boundary', value: 5, maximum: 5, exclusive: true, expected: false },
  { description: 'returns true for exclusive maximum below boundary', value: 4, maximum: 5, exclusive: true, expected: true },
];
for (const { description, value, maximum, exclusive, expected } of checkMaximumScenarios) {
  void it(description, () => { assert.strictEqual(Predicates.checkMaximum(value, maximum, exclusive), expected); });
}

// checkMultipleOf
const checkMultipleOfScenarios: Array<{ description: string; value: number; divisor: number; expected: boolean }> = [
  { description: 'returns true for exact integer multiple', value: 6, divisor: 3, expected: true },
  { description: 'returns true for floating-point multiple within epsilon', value: 0.3, divisor: 0.1, expected: true },
  { description: 'returns false for non-multiple', value: 7, divisor: 3, expected: false },
  { description: 'returns false for divisor zero', value: 5, divisor: 0, expected: false },
];
for (const { description, value, divisor, expected } of checkMultipleOfScenarios) {
  void it(description, () => { assert.strictEqual(Predicates.checkMultipleOf(value, divisor), expected); });
}

// checkMinItems
const checkMinItemsScenarios: Array<{ description: string; array: unknown[]; min: number; expected: boolean }> = [
  { description: 'returns true when array meets minimum length', array: [1, 2], min: 1, expected: true },
  { description: 'returns true at exact minimum', array: [1], min: 1, expected: true },
  { description: 'returns false when array is shorter than minimum', array: [], min: 1, expected: false },
];
for (const { description, array, min, expected } of checkMinItemsScenarios) {
  void it(description, () => { assert.strictEqual(Predicates.checkMinItems(array, min), expected); });
}

// checkMaxItems
const checkMaxItemsScenarios: Array<{ description: string; array: unknown[]; max: number; expected: boolean }> = [
  { description: 'returns true when array is within maximum', array: [1, 2], max: 3, expected: true },
  { description: 'returns false when array exceeds maximum', array: [1, 2, 3], max: 2, expected: false },
];
for (const { description, array, max, expected } of checkMaxItemsScenarios) {
  void it(description, () => { assert.strictEqual(Predicates.checkMaxItems(array, max), expected); });
}

// checkUniqueItems
const checkUniqueItemsScenarios: Array<{ description: string; array: unknown[]; expected: boolean }> = [
  { description: 'returns true for array with all unique primitives', array: [1, 2, 3], expected: true },
  { description: 'returns false for array with duplicate primitives', array: [1, 2, 1], expected: false },
  { description: 'returns true for array with unique objects', array: [{ a: 1 }, { a: 2 }], expected: true },
  { description: 'returns false for array with deeply-equal objects', array: [{ a: 1 }, { a: 1 }], expected: false },
];
for (const { description, array, expected } of checkUniqueItemsScenarios) {
  void it(description, () => { assert.strictEqual(Predicates.checkUniqueItems(array), expected); });
}

// checkRequired
const checkRequiredScenarios: Array<{ description: string; obj: Record<string, unknown>; required: string[]; expected: boolean }> = [
  { description: 'returns true when all required properties are present', obj: { a: 1, b: 2 }, required: ['a', 'b'], expected: true },
  { description: 'returns false when a required property is missing', obj: { a: 1 }, required: ['a', 'b'], expected: false },
  { description: 'returns true for empty required list', obj: {}, required: [], expected: true },
];
for (const { description, obj, required, expected } of checkRequiredScenarios) {
  void it(description, () => { assert.strictEqual(Predicates.checkRequired(obj, required), expected); });
}

// matchesAnyType
const matchesAnyTypeScenarios: Array<{ description: string; types: string[]; value: unknown; expected: boolean }> = [
  { description: 'returns true when value matches one of the listed types', types: ['string', 'null'], value: 'hello', expected: true },
  { description: 'returns false when value matches none of the listed types', types: ['string', 'null'], value: 42, expected: false },
];
for (const { description, types, value, expected } of matchesAnyTypeScenarios) {
  void it(description, () => { assert.strictEqual(Predicates.matchesAnyType(types as Array<'string'>, value), expected); });
}

// satisfiesConst
const satisfiesConstScenarios: Array<{ description: string; value: unknown; constValue: unknown; expected: boolean }> = [
  { description: 'returns true for deeply equal primitive', value: 42, constValue: 42, expected: true },
  { description: 'returns false for non-equal primitive', value: 42, constValue: 43, expected: false },
  { description: 'returns true for deeply equal object', value: { a: 1 }, constValue: { a: 1 }, expected: true },
];
for (const { description, value, constValue, expected } of satisfiesConstScenarios) {
  void it(description, () => { assert.strictEqual(Predicates.satisfiesConst(value, constValue), expected); });
}

// satisfiesEnum
const satisfiesEnumScenarios: Array<{ description: string; value: unknown; enumValues: unknown[]; expected: boolean }> = [
  { description: 'returns true when value is in enum', value: 'b', enumValues: ['a', 'b', 'c'], expected: true },
  { description: 'returns false when value is not in enum', value: 'd', enumValues: ['a', 'b', 'c'], expected: false },
];
for (const { description, value, enumValues, expected } of satisfiesEnumScenarios) {
  void it(description, () => { assert.strictEqual(Predicates.satisfiesEnum(value, enumValues), expected); });
}

// satisfiesContains
const satisfiesContainsScenarios: Array<{ description: string; matchCount: number; minContains: number | undefined; maxContains: number | undefined; expected: boolean }> = [
  { description: 'returns true when match count satisfies default minimum of 1', matchCount: 1, minContains: undefined, maxContains: undefined, expected: true },
  { description: 'returns false when match count is below minimum', matchCount: 0, minContains: 1, maxContains: undefined, expected: false },
  { description: 'returns false when match count exceeds maximum', matchCount: 3, minContains: 1, maxContains: 2, expected: false },
];
for (const { description, matchCount, minContains, maxContains, expected } of satisfiesContainsScenarios) {
  void it(description, () => { assert.strictEqual(Predicates.satisfiesContains(matchCount, minContains, maxContains), expected); });
}

// satisfiesContentEncoding
const satisfiesContentEncodingScenarios: Array<{ description: string; value: string; encoding: string; expected: boolean }> = [
  { description: 'returns true for valid base64 string', value: 'aGVsbG8=', encoding: 'base64', expected: true },
  { description: 'returns false for invalid base64 string', value: 'not base64!!!', encoding: 'base64', expected: false },
  { description: 'returns true for unknown encoding (unconstrained)', value: 'anything', encoding: 'quoted-printable', expected: true },
];
for (const { description, value, encoding, expected } of satisfiesContentEncodingScenarios) {
  void it(description, () => { assert.strictEqual(Predicates.satisfiesContentEncoding(value, encoding), expected); });
}

// satisfiesContentMediaType
const satisfiesContentMediaTypeScenarios: Array<{ description: string; value: string; mediaType: string; expected: boolean }> = [
  { description: 'returns true for valid JSON string', value: '{"x":1}', mediaType: 'application/json', expected: true },
  { description: 'returns false for invalid JSON string', value: '{bad json}', mediaType: 'application/json', expected: false },
  { description: 'returns true for unknown media type (unconstrained)', value: 'anything', mediaType: 'text/html', expected: true },
];
for (const { description, value, mediaType, expected } of satisfiesContentMediaTypeScenarios) {
  void it(description, () => { assert.strictEqual(Predicates.satisfiesContentMediaType(value, mediaType), expected); });
}

// hasNoAdditionalProperties
const hasNoAdditionalPropertiesScenarios: Array<{ description: string; obj: Record<string, unknown>; allowed: Set<string>; expected: boolean }> = [
  { description: 'returns true when all object keys are in allowed set', obj: { a: 1, b: 2 }, allowed: new Set(['a', 'b', 'c']), expected: true },
  { description: 'returns false when object has a key outside allowed set', obj: { a: 1, z: 2 }, allowed: new Set(['a', 'b']), expected: false },
];
for (const { description, obj, allowed, expected } of hasNoAdditionalPropertiesScenarios) {
  void it(description, () => { assert.strictEqual(Predicates.hasNoAdditionalProperties(obj, allowed), expected); });
}

// satisfiesMinProperties / satisfiesMaxProperties — unified scenario table
const minMaxPropertiesScenarios: Array<{ description: string; method: 'min' | 'max'; obj: Record<string, unknown>; limit: number; expected: boolean }> = [
  { description: 'returns true when object has at least minimum properties', method: 'min', obj: { a: 1, b: 2 }, limit: 2, expected: true },
  { description: 'returns false when object has fewer than minimum properties', method: 'min', obj: { a: 1 }, limit: 2, expected: false },
  { description: 'returns true when object has at most maximum properties', method: 'max', obj: { a: 1 }, limit: 2, expected: true },
  { description: 'returns false when object exceeds maximum properties', method: 'max', obj: { a: 1, b: 2, c: 3 }, limit: 2, expected: false },
];
for (const { description, method, obj, limit, expected } of minMaxPropertiesScenarios) {
  void it(description, () => {
    const result = method === 'min'
      ? Predicates.satisfiesMinProperties(obj, limit)
      : Predicates.satisfiesMaxProperties(obj, limit);
    assert.strictEqual(result, expected);
  });
}

// coerceToBoolean
const coerceToBooleanScenarios: Array<{ description: string; input: unknown; expected: boolean | undefined }> = [
  { description: 'coerces "true" to true', input: 'true', expected: true },
  { description: 'coerces "false" to false', input: 'false', expected: false },
  { description: 'returns undefined for unrecognised string', input: 'yes', expected: undefined },
];
for (const { description, input, expected } of coerceToBooleanScenarios) {
  void it(description, () => { assert.strictEqual(Predicates.coerceToBoolean(input as string), expected); });
}

// coerceToNumber
const coerceToNumberScenarios: Array<{ description: string; input: unknown; expected: number | undefined }> = [
  { description: 'coerces numeric string to number', input: '3.14', expected: 3.14 },
  { description: 'returns undefined for non-numeric string', input: 'abc', expected: undefined },
  { description: 'returns undefined for "Infinity"', input: 'Infinity', expected: undefined },
];
for (const { description, input, expected } of coerceToNumberScenarios) {
  void it(description, () => { assert.strictEqual(Predicates.coerceToNumber(input as string), expected); });
}

// coerceValue
const coerceValueScenarios: Array<{ description: string; types: string[]; value: unknown; expected: unknown }> = [
  { description: 'coerces string "true" to boolean true', types: ['boolean'], value: 'true', expected: true },
  { description: 'returns original value when no coercion applies', types: ['integer'], value: 'not-a-number', expected: 'not-a-number' },
  { description: 'returns null unchanged', types: ['string'], value: null, expected: null },
  { description: 'returns value unchanged when schemaTypes is empty', types: [], value: 'hello', expected: 'hello' },
];
for (const { description, types, value, expected } of coerceValueScenarios) {
  void it(description, () => { assert.strictEqual(Predicates.coerceValue(types as Array<'boolean'>, value), expected); });
}

// inferValueType
const inferValueTypeScenarios: Array<{ description: string; value: unknown; expected: string }> = [
  { description: 'returns "null" for null', value: null, expected: 'null' },
  { description: 'returns "array" for arrays', value: [], expected: 'array' },
  { description: 'returns "object" for plain objects', value: {}, expected: 'object' },
  { description: 'returns "string" for strings', value: 'hello', expected: 'string' },
];
for (const { description, value, expected } of inferValueTypeScenarios) {
  void it(description, () => { assert.strictEqual(Predicates.inferValueType(value), expected); });
}

// codePointLength
const codePointLengthScenarios: Array<{ description: string; input: string; expected: number }> = [
  { description: 'counts ASCII characters correctly', input: 'hello', expected: 5 },
  // '😀' is U+1F600 — one code point, two UTF-16 units
  { description: 'counts surrogate-pair emoji as one code point', input: '😀', expected: 1 },
  { description: 'returns 0 for empty string', input: '', expected: 0 },
];
for (const { description, input, expected } of codePointLengthScenarios) {
  void it(description, () => { assert.strictEqual(Predicates.codePointLength(input), expected); });
}
