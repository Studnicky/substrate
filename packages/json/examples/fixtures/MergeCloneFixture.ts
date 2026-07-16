/** Static input data for examples/merge-clone.ts. */
export namespace MergeCloneFixture {
  export const Base = { 'a': 1, 'b': { 'x': 10, 'y': 20 }, 'tags': ['alpha'] };

  export const Overlay = { 'b': { 'y': 99, 'z': 3 }, 'c': 'new', 'tags': ['beta'] };

  export const Original = { 'created': new Date(0), 'items': [1, 2, 3], 'nested': { 'value': 42 } };
}
