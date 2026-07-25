import { parentPort } from 'node:worker_threads';

if (parentPort === null) {
  throw new Error('resultThenExitWorker must run in a worker thread');
}

parentPort.on('message', (item) => {
  parentPort.postMessage({ 'type': 'result', 'value': item.value });
  process.nextTick(() => {
    process.exit(0);
  });
});
