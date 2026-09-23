import { parentPort } from 'node:worker_threads';

interface ResultThenExitRequestInterface {
  value: unknown;
}

if (parentPort === null) {
  throw new Error('resultThenExitWorker must run in a worker thread');
}
const port = parentPort;

port.on('message', (item: ResultThenExitRequestInterface) => {
  port.postMessage({ 'type': 'result', 'value': item.value });
  process.nextTick(() => {
    process.exit(0);
  });
});
