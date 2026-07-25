import { parentPort } from 'node:worker_threads';

if (parentPort === null) {
  throw new Error('resultThenWaitExitWorker must run in a worker thread');
}

parentPort.on('message', (item) => {
  parentPort.postMessage({ 'type': 'result', 'value': item.value });
  if (item.exitAfterResult !== true) {
    return;
  }
  const gate = new Int32Array(item.gate);
  Atomics.wait(gate, 0, 0);
  process.exit(0);
});
