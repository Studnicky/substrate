import { WebWorkerFactory, WebWorkerMessageTransport, WebWorkerPool } from '../src/browser/index.js';

class BrowserWorkerPoolExample {
  static async run(): Promise<void> {
    const workerSource = 'self.onmessage = (event) => { self.postMessage(event.data * 2); };';
    const factory = WebWorkerFactory.create({
      'options': { 'type': 'module' },
      'script': `data:application/javascript,${encodeURIComponent(workerSource)}`
    });
    const transport = WebWorkerMessageTransport.create<number, number>({
      'decode': (value: unknown): number => {
        if (typeof value !== 'number') {
          throw new Error('Worker response must be a number');
        }
        return value;
      }
    });
    const pool = WebWorkerPool.create({
      'factory': factory,
      'maximumWorkers': 2,
      'transport': transport
    });

    try {
      const result = await pool.run([1, 2, 3]);

      console.log(result);
    } finally {
      await pool.close();
    }
  }
}

await BrowserWorkerPoolExample.run();
