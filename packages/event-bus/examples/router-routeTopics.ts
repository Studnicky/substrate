import { TopicRouter } from '@studnicky/event-bus/router';

class RouteTopicsDemo {
  public static async run(): Promise<void> {
    const delivered: string[] = [];
    const router = TopicRouter.create<{ readonly 'id': string }>({
      'matcher': { 'matches': (pattern: string, topic: string): boolean => { const result = pattern === 'bookstore.orders.**' || pattern === topic; return result; } }
    });
    router.register('bookstore.orders.**', (envelope): void => { delivered.push(`${envelope.subscription.id}:${envelope.payload.id}`); }, { 'id': 'audit' });
    router.register('bookstore.orders.created', (envelope): void => { delivered.push(`${envelope.subscription.id}:${envelope.payload.id}`); }, { 'id': 'fulfillment' });
    const selected = await router.publish('bookstore.orders.created', { 'id': 'order-1042' });
    if (selected.length !== 2 || delivered.length !== 2) {
      throw new Error('Expected the Northstar Books order to fan out to audit and fulfilment subscriptions.');
    }
  }
}

await RouteTopicsDemo.run();
