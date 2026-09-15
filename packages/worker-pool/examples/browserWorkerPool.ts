import { WebWorkerFactory, WebWorkerMessageTransport, WebWorkerPool } from '../src/browser/index.js';
import { ItemEntity } from './entities/ItemEntity.js';

class BrowserWorkerPoolExample {
  static async run(): Promise<void> {
    const workerSource = 'self.onmessage = (event) => { self.postMessage({ n: event.data.n * 2 }); };';
    const factory = WebWorkerFactory.create({
      'options': { 'type': 'module' },
      'script': `data:application/javascript,${encodeURIComponent(workerSource)}`
    });
    const transport = WebWorkerMessageTransport.fromEntity<ItemEntity.Type, ItemEntity.Type>(ItemEntity.intake);
    const pool = WebWorkerPool.create({
      'factory': factory,
      'maximumWorkers': 2,
      'transport': transport
    });

    try {
      const result = await pool.run([{ 'n': 1 }, { 'n': 2 }, { 'n': 3 }]);

      console.log(result);
    } finally {
      await pool.close();
    }
  }
}

await BrowserWorkerPoolExample.run();
