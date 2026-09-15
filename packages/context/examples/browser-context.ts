/**
 * browser-context — runs one automatic scope and isolates overlapping browser scopes.
 * Run in the docs playground.
 */

// #region usage
import { Context } from '@studnicky/context/browser';

class BrowserContextDemo {
  static delay(milliseconds: number): Promise<void> {
    const result = new Promise<void>((resolve) => {
      globalThis.setTimeout(resolve, milliseconds);
    });
    return result;
  }

  static async run(): Promise<void> {
    const context = Context.create({ 'name': 'request' });
    const automatic = await context.run({ 'requestId': 'automatic' }, async (scope) => {
      await scope.await(BrowserContextDemo.delay(1));
      const result = context.get('requestId');
      return result;
    });

    if (automatic.value !== 'automatic' || automatic.snapshot.requestId !== 'automatic') {
      throw new Error('Context.run did not return the operation value and final snapshot.');
    }

    const firstScope = context.initialize({ 'requestId': 'first' });
    const secondScope = context.initialize({ 'requestId': 'second' });
    const values = await Promise.all([
      firstScope.execute(async () => {
        await firstScope.await(BrowserContextDemo.delay(5));
        const result = context.get('requestId');
        return result;
      }),
      secondScope.execute(async () => {
        await secondScope.await(BrowserContextDemo.delay(1));
        const result = context.get('requestId');
        return result;
      })
    ]);

    if (values[0] !== 'first' || values[1] !== 'second') {
      throw new Error('Overlapping context scopes leaked values.');
    }

    const firstSnapshot = firstScope.terminate();
    const secondSnapshot = secondScope.terminate();

    console.log('automatic scope value:', automatic.value);
    console.log('automatic scope snapshot:', automatic.snapshot);
    console.log('first scope requestId:', values[0]);
    console.log('second scope requestId:', values[1]);
    console.log('first scope snapshot:', firstSnapshot);
    console.log('second scope snapshot:', secondSnapshot);
  }
}

await BrowserContextDemo.run();
// #endregion usage
