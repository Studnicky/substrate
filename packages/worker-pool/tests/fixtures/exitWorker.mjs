import { parentPort } from 'node:worker_threads';
import { existsSync, writeFileSync } from 'node:fs';

if (parentPort === null) {
  throw new Error('exitWorker must run in a worker thread');
}

parentPort.on('message', (item) => {
  if (item.exit === true && typeof item.stateFile === 'string' && existsSync(item.stateFile) === false) {
    writeFileSync(item.stateFile, 'exited');
    process.exit(0);
    return;
  }

  parentPort.postMessage({ 'type': 'result', 'value': item.value });
});
