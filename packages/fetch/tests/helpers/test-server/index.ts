import { ConfigurationError } from '../../../src/errors/index.js';
import { TestDispatcher } from '../../../src/testing/TestDispatcher.js';

const TEST_SERVER_URL = 'http://127.0.0.1:41234';

let activeUsers = 0;
let originalFetch: typeof globalThis.fetch | undefined;
let originalTransportFlag: string | undefined;
let testDispatcher: TestDispatcher | undefined;

function log(...parts: readonly unknown[]): void {
  if (process.env.SUBSTRATE_FETCH_TEST_LOG === '1') {
    console.error('[fetch-test-server]', ...parts);
  }
}

function ensureDispatcher(): TestDispatcher {
  if (testDispatcher === undefined) {
    testDispatcher = TestDispatcher.create({
      'connections': 64,
      'enabled': true,
      'pipelining': 1
    });
  }

  return testDispatcher;
}

function installTransport(): void {
  if (originalFetch === undefined) {
    originalFetch = globalThis.fetch;
  }

  if (originalTransportFlag === undefined) {
    originalTransportFlag = process.env.SUBSTRATE_FETCH_TEST_TRANSPORT;
  }

  process.env.SUBSTRATE_FETCH_TEST_TRANSPORT = '1';

  const dispatcher = ensureDispatcher();
  globalThis.fetch = dispatcher.fetch.bind(dispatcher) as typeof globalThis.fetch;
}

function restoreTransport(): void {
  if (originalFetch !== undefined) {
    globalThis.fetch = originalFetch;
  }

  if (originalTransportFlag === undefined) {
    delete process.env.SUBSTRATE_FETCH_TEST_TRANSPORT;
  } else {
    process.env.SUBSTRATE_FETCH_TEST_TRANSPORT = originalTransportFlag;
  }

  testDispatcher = undefined;
}

export async function startTestServer(): Promise<string> {
  activeUsers += 1;

  if (activeUsers === 1) {
    installTransport();
    log('start', { 'activeUsers': activeUsers, 'url': TEST_SERVER_URL });
  } else {
    log('reuse', { 'activeUsers': activeUsers, 'url': TEST_SERVER_URL });
  }

  return TEST_SERVER_URL;
}

export async function stopTestServer(): Promise<void> {
  if (activeUsers > 0) {
    activeUsers -= 1;
  } else {
    log('stop-underflow', { 'activeUsers': 0, 'url': TEST_SERVER_URL });
    return;
  }

  if (activeUsers > 0) {
    log('retain', { 'activeUsers': activeUsers });
    return;
  }

  restoreTransport();
  log('stop', { 'activeUsers': activeUsers });
}

export function getTestServerUrl(): string {
  if (activeUsers === 0) {
    throw new ConfigurationError('Test server not started. Call startTestServer() first.');
  }

  return TEST_SERVER_URL;
}
