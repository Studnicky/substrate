import { parentPort } from 'node:worker_threads';

interface ResultThenWaitExitRequestInterface {
  exitAfterResult?: boolean;
  gate: SharedArrayBuffer;
  value: unknown;
}

if (parentPort === null) {
  throw new Error('resultThenWaitExitWorker must run in a worker thread');
}
const port = parentPort;

port.on('message', (item: ResultThenWaitExitRequestInterface) => {
  port.postMessage({ 'type': 'result', 'value': item.value });
  if (item.exitAfterResult !== true) {
    return;
  }
  const gate = new Int32Array(item.gate);
  Atomics.wait(gate, 0, 0);
  process.exit(0);
});
