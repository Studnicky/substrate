/** immutable-snapshot — detached immutable views. Run: npx tsx packages/json/examples/immutable-snapshot.ts */

// #region usage
import { FrozenMutationError, ImmutableSnapshot } from '@studnicky/json/browser';

const source = {
  'profile': { 'name': 'Ada' },
  'roles': new Set([ 'reader' ]),
  'sessions': new Map([[ 'active', { 'count': 1 } ]])
};

const snapshot = ImmutableSnapshot.from(source);
source.profile.name = 'Grace';
source.roles.add('writer');

let mapMutationBlocked = false;
try {
  snapshot.sessions.set('pending', { 'count': 0 });
} catch (error) {
  mapMutationBlocked = error instanceof FrozenMutationError;
}

if (snapshot.profile.name !== 'Ada' || snapshot.roles.has('writer') || !mapMutationBlocked) {
  throw new Error('Immutable snapshot contract failed.');
}

console.log('snapshot profile:', snapshot.profile);
console.log('snapshot roles:', [...snapshot.roles]);
console.log('snapshot map mutation blocked:', mapMutationBlocked);
// #endregion usage
