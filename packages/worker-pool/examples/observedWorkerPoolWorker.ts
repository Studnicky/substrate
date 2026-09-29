/**
 * Worker entry script for examples/observedWorkerPool.ts.
 *
 * Receives a checkout item count, reports quote progress, and resolves with a Northstar Books
 * fulfilment quote in cents.
 */
import { parentPort } from 'node:worker_threads';

interface FulfilmentQuoteRequestInterface {
  readonly 'n': number;
}

if (parentPort === null) {
  throw new Error('observedWorkerPoolWorker must run in a worker thread');
}
const port = parentPort;

port.once('message', ({ 'n': itemCount }: FulfilmentQuoteRequestInterface) => {
  port.postMessage({ 'message': `quoting fulfilment for ${  String(itemCount)  } Northstar Books items`, 'type': 'log' });
  port.postMessage({ 'percent': 50, 'type': 'progress' });
  const shippingCents = itemCount * 495;
  port.postMessage({ 'type': 'result', 'value': shippingCents });
});
