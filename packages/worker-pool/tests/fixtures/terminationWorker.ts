import { parentPort } from 'node:worker_threads';

interface TerminationRequestInterface {
  crash?: boolean;
  error?: string;
  ms?: number;
  value: unknown;
}

if (parentPort === null) {
  throw new Error('terminationWorker must run in a worker thread');
}
const port = parentPort;

port.on('message', (item: TerminationRequestInterface) => {
  if (item.crash === true) {
    throw new Error(item.error);
  }

  const respond = (): void => {
    port.postMessage({ 'type': 'result', 'value': item.value });
  };

  if (typeof item.ms === 'number' && item.ms > 0) {
    setTimeout(respond, item.ms);
  } else {
    respond();
  }
});
