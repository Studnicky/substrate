/** Static input data for examples/path-sort-hash.ts. */
export namespace PathSortHashFixture {
  export const Document = {
    'items': [{ 'name': 'alpha' }, { 'name': 'beta' }],
    'user': { 'address': { 'city': 'Melbourne' } }
  };

  export const SchemaWithMeta = { '$id': '#myField', 'description': 'A description', 'title': 'My Field', 'type': 'string' };

  export const SchemaBare = { 'type': 'string' };
}
