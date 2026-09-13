/** routeTopics — register handlers and publish a matching topic. Run: npx tsx examples/routeTopics.ts */

// #region usage
import { GlobMatcher } from '@studnicky/matching/node';
import { TopicRouter } from '@studnicky/topic-router/node';
import assert from 'node:assert/strict';

class RouteTopicsDemo {
  public static async run(): Promise<void> {
    const delivered: string[] = [];
    const router = TopicRouter.create<{ readonly 'id': string }>({
      'matcher': { 'matches': (pattern: string, topic: string): boolean => {
        const result = GlobMatcher.matches(pattern, topic);
        return result;
      } }
    });

    router.register('orders.**', (envelope): void => {
      delivered.push(`${envelope.subscription.id}:${envelope.payload.id}`);
    }, { 'id': 'audit' });
    router.register('orders.created', (envelope): void => {
      delivered.push(`${envelope.subscription.id}:${envelope.payload.id}`);
    }, { 'id': 'fulfillment' });

    const selected = await router.publish('orders.created', { 'id': 'ord_123' });
    console.log({ 'delivered': delivered, 'selected': selected });

    assert.deepEqual(selected, ['audit', 'fulfillment']);
    assert.deepEqual(delivered, ['audit:ord_123', 'fulfillment:ord_123']);
    console.log('routeTopics: all assertions passed');
  }
}
// #endregion usage

await RouteTopicsDemo.run();
