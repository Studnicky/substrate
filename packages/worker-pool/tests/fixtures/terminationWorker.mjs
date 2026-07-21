import { parentPort } from 'node:worker_threads';

if (parentPort === null) {
  throw new Error('terminationWorker must run in a worker thread');
}

parentPort.on('message', (item) => {
  if (item.crash === true) {
    throw new Error(item.error);
  }

  const respond = () => {
    parentPort.postMessage({ 'type': 'result', 'value': item.value });
  };

  if (typeof item.ms === 'number' && item.ms > 0) {
    setTimeout(respond, item.ms);
  } else {
    respond();
  }
});
