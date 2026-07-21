/**
 * Race Unit Tests
 *
 * Two concurrent first-time calls with the same key but DIFFERENT payloads,
 * issued before either has cached a result, must not silently coalesce onto
 * one another — the second call throws IdempotencyConflictError instead of
 * replaying the leader's result under a mismatched fingerprint.
 */

import { rejects, strictEqual } from 'node:assert/strict';
import { it } from 'node:test';

import { IdempotencyConflictError, IdempotencyGuard } from '../../../src/index.js';

it('throws IdempotencyConflictError for a concurrent same-key different-payload racer with no cached entry yet', async () => {
  const guard = IdempotencyGuard.create<string>({ 'capacity': 10, 'ttlMs': 60_000 });
  let leaderCalls = 0;
  let followerCalls = 0;
  let resolveLeader: (value: string) => void = () => {};
  const gate = new Promise<string>((resolve) => { resolveLeader = resolve; });

  const leaderFactory = async (): Promise<string> => {
    leaderCalls += 1;
    const result = await gate;
    return result;
  };

  const followerFactory = async (): Promise<string> => {
    followerCalls += 1;
    return 'follower-result';
  };

  const leaderCall = guard.run('order-race', { 'amount': 500 }, leaderFactory);
  const followerCall = guard.run('order-race', { 'amount': 999 }, followerFactory);

  await rejects(async () => { await followerCall; }, IdempotencyConflictError);

  resolveLeader('leader-result');
  const leaderResult = await leaderCall;

  strictEqual(leaderResult, 'leader-result');
  strictEqual(leaderCalls, 1);
  strictEqual(followerCalls, 0);

  let replayFactoryCalls = 0;
  const replayed = await guard.run('order-race', { 'amount': 500 }, async () => {
    replayFactoryCalls += 1;
    return 'unexpected-result';
  });

  strictEqual(replayed, 'leader-result');
  strictEqual(replayFactoryCalls, 0);
});
