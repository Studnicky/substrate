/** entityCompiler — compile a schema once, then intake and create typed values. Run: npx tsx packages/entity/examples/entityCompiler.ts */

import { EntityCompiler, SchemaIntakeError } from '@studnicky/entity/node';
import assert from 'node:assert/strict';

interface BookOrderIntakeInterface {
  readonly 'isbn': string;
  readonly 'quantity': number;
  readonly 'title': string;
}

const BookOrderIntakeSchema = {
  '$id': 'https://northstar-books.test/schemas/book-order-intake',
  'additionalProperties': false,
  'properties': {
    'isbn': { 'pattern': '^978-[0-9]{10}', 'type': 'string' },
    'quantity': { 'minimum': 1, 'type': 'integer' },
    'title': { 'minLength': 1, 'type': 'string' }
  },
  'required': ['isbn', 'quantity', 'title'],
  'type': 'object'
};

// #region usage
const validate = EntityCompiler.compile<BookOrderIntakeInterface>(BookOrderIntakeSchema);
const intake = EntityCompiler.compileIntake<BookOrderIntakeInterface>(BookOrderIntakeSchema);
const create = EntityCompiler.compileCreate<BookOrderIntakeInterface>(BookOrderIntakeSchema);

const order = intake({ 'isbn': '978-0132350884', 'quantity': 2, 'title': 'Clean Code' });
console.log('Northstar Books checkout intake:', order);
assert.equal(validate(order), true);

assert.throws(() => {
  intake({ 'isbn': '978-0132350884', 'quantity': 2, 'title': 'Clean Code', 'unexpected': true });
}, SchemaIntakeError);
console.log('Checkout intake: undeclared fields rejected');

assert.throws(() => {
  create({ 'isbn': '978-0132350884', 'title': 'Clean Code' });
}, SchemaIntakeError);
console.log('Owned order validation: incomplete objects rejected');
// #endregion usage

console.log('entityCompiler: all assertions passed');
