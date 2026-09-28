import { parentPort } from 'node:worker_threads';
import { existsSync, writeFileSync } from 'node:fs';

interface ExitRequestInterface {
  exit?: boolean;
  stateFile?: string;
  value: unknown;
}

if (parentPort === null) {
  throw new Error('exitWorker must run in a worker thread');
}
const port = parentPort;

port.on('message', (item: ExitRequestInterface) => {
  if (item.exit === true && typeof item.stateFile === 'string' && existsSync(item.stateFile) === false) {
    writeFileSync(item.stateFile, 'exited');
    process.exit(0);
    return;
  }

  port.postMessage({ 'type': 'result', 'value': item.value });
});
