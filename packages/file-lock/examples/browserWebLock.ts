import { WebLock } from '../src/browser/index.js';

const lock = await WebLock.create({ 'name': 'substrate-browser-lock-demo' });

try {
  console.log('browser lock acquired');
} finally {
  lock.release();
}
