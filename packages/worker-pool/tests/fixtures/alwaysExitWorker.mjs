import { parentPort } from 'node:worker_threads';

if (parentPort === null) {
  throw new Error('alwaysExitWorker must run in a worker thread');
}

parentPort.on('message', () => {
  process.exit(0);
});
