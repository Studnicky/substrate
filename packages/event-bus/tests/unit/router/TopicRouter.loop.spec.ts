import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { TopicRouter } from '../../../src/router/index.js';

void describe('TopicRouter', () => {
  void it('publishes every registered structural match using immutable envelopes', async () => {
    const delivered: string[] = [];
    const router = TopicRouter.create<{ readonly 'id': string }>({
      'matcher': { 'matches': (pattern: string, topic: string): boolean => { const result = pattern === 'orders.*' && topic.startsWith('orders.'); return result; } }
    });
    router.register('orders.*', (envelope): void => { delivered.push(`${envelope.subscription.id}:${envelope.payload.id}`); }, { 'id': 'audit' });
    const selected = await router.publish('orders.created', { 'id': 'order-1042' });
    assert.deepEqual(selected, ['audit']);
    assert.deepEqual(delivered, ['audit:order-1042']);
  });

  void it('delivers caller-selected subscriptions without applying matching policy', async () => {
    const router = TopicRouter.create<string>({ 'matcher': { 'matches': (): boolean => { return false; } } });
    let origin = '';
    router.register('not-matched', (envelope): void => { origin = envelope.selection.origin; }, { 'id': 'selected' });
    const delivered = await router.publishSelected('orders.created', 'payload', [{ 'id': 'selected', 'origin': 'application', 'scores': { 'relevance': 1 } }]);
    assert.deepEqual(delivered, ['selected']);
    assert.equal(origin, 'application');
  });
});
