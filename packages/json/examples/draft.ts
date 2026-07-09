/** draft — Proxy-based mutate-a-draft/get-an-immutable-result primitive, with RFC-6902 patch generation. Run: npx tsx packages/json/examples/draft.ts */

import assert from 'node:assert/strict';

// #region usage
import { Draft, Patch } from '../src/index.js';

// ---------------------------------------------------------------------------
// Draft.produce — mutate a draft, get back a new value with structural sharing
// ---------------------------------------------------------------------------

const base = {
  'meta': { 'label': 'draft' },
  'tags': ['alpha'],
  'untouched': { 'value': 1 }
};

const next = Draft.produce(base, (draft) => {
  draft.meta.label = 'published';
  draft.tags.push('beta');
});

console.log('next.meta:', next.meta);
console.log('next.tags:', next.tags);
console.log('base still says:', base.meta.label);
console.log('untouched branch same reference?', next.untouched === base.untouched);

// ---------------------------------------------------------------------------
// Draft.producePatch — same mechanics, plus the RFC-6902 patch that produced it
// ---------------------------------------------------------------------------

const doc = { 'count': 0, 'status': 'draft' };

const { 'next': patchedNext, patch } = Draft.producePatch(doc, (draft) => {
  draft.count = 1;
  draft.status = 'published';
});

console.log('generated patch:', patch);

// Replaying the generated patch against a fresh copy of `doc` reproduces `next`.
const replayed: Record<string, unknown> = { ...doc };

Patch.create(patch).apply(replayed);

console.log('replayed matches next?', JSON.stringify(replayed) === JSON.stringify(patchedNext));

// ---------------------------------------------------------------------------
// A no-op recipe returns the same reference as base
// ---------------------------------------------------------------------------

const noopResult = Draft.produce(base, () => {
  // reads only, no writes
});

console.log('no-op result === base?', noopResult === base);
// #endregion usage

assert.equal(next.meta.label, 'published', 'nested field mutated on the draft');
assert.equal(base.meta.label, 'draft', 'base itself untouched');
assert.deepEqual(next.tags, ['alpha', 'beta'], 'array push recorded on the draft');
assert.deepEqual(base.tags, ['alpha'], 'base array untouched');
assert.notEqual(next, base, 'produce returns a new top-level object');
assert.equal(next.untouched, base.untouched, 'untouched branch shares the same reference');

assert.equal(patchedNext.count, 1, 'producePatch applies the recipe');
assert.equal(patchedNext.status, 'published', 'producePatch applies the recipe');
assert.deepEqual(replayed, patchedNext, 'replaying the generated patch reproduces next exactly');

assert.equal(noopResult, base, 'a no-op recipe returns the same reference as base');

console.log('draft: all assertions passed');
