import { parentPort } from 'node:worker_threads';

if (parentPort === null) {
  throw new Error('immediateExitWorker must run in a worker thread');
}

parentPort.on('message', () => {
  process.exit(0);
});
