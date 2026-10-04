/** validateClassification — validate a provider classification at the intake boundary. Run: npx tsx examples/validateClassification.ts */

import { ClassificationEntity } from '@studnicky/matching/semantic/entities';
import assert from 'node:assert/strict';

// #region usage
const classification = ClassificationEntity.intake({
  'confidence': 0.94,
  'label': 'billing'
});

assert.deepEqual(classification, { 'confidence': 0.94, 'label': 'billing' });
console.log({ 'classification': classification });
// #endregion usage

console.log('validateClassification: all assertions passed');
