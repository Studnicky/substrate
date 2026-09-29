/** routeTopics — fan out a Northstar Books order-created event to fulfilment and audit handlers. Run: npx tsx examples/routeTopics.ts */

// #region usage
import { GlobMatcher } from '@studnicky/matching/node';
import { TopicRouter } from '@studnicky/topic-router/node';

class RouteTopicsDemo {
  public static async run(): Promise<void> {
    const delivered: string[] = [];
    const router = TopicRouter.create<{ readonly 'id': string }>({
      'matcher': { 'matches': (pattern: string, topic: string): boolean => {
        const result = GlobMatcher.matches(pattern, topic);
        return result;
      } }
    });

    router.register('bookstore.orders.**', (envelope): void => {
      delivered.push(`${envelope.subscription.id}:${envelope.payload.id}`);
    }, { 'id': 'audit' });
    router.register('bookstore.orders.created', (envelope): void => {
      delivered.push(`${envelope.subscription.id}:${envelope.payload.id}`);
    }, { 'id': 'fulfillment' });

    const selected = await router.publish('bookstore.orders.created', { 'id': 'order-1042' });
    console.log({ 'delivered': delivered, 'selected': selected });

    if (selected.length !== 2 || selected[0] !== 'audit' || selected[1] !== 'fulfillment' || delivered.length !== 2 || delivered[0] !== 'audit:order-1042' || delivered[1] !== 'fulfillment:order-1042') {
      throw new Error('Expected the Northstar Books order to fan out to audit and fulfilment subscriptions.');
    }
    console.log('routeTopics: all assertions passed');
  }
}
// #endregion usage

await RouteTopicsDemo.run();
