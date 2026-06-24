/** 03-telemetry-hooks — FetchClient subclass with telemetry lifecycle hooks. Run: npx tsx packages/fetch/examples/03-telemetry-hooks.ts */

import assert from 'node:assert/strict';

// #region usage
import { FetchClient } from '../src/index.js';

type RequestEventType = {
  'method': string;
  'requestId': string;
  'url': string;
};

type ResponseEventType = {
  'durationMs': number;
  'method': string;
  'requestId': string;
  'statusCode': number;
};

type ErrorEventType = {
  'durationMs': number;
  'error': unknown;
  'method': string;
  'requestId': string;
  'url': string;
};

// Subclass FetchClient to capture telemetry events via protected lifecycle hooks.
class TelemetryClient extends FetchClient {
  public readonly requestEvents: RequestEventType[] = [];
  public readonly responseEvents: ResponseEventType[] = [];
  public readonly errorEvents: ErrorEventType[] = [];

  protected override onRequestStart(method: string, _path: string, requestId: string, url: string): void {
    this.requestEvents.push({ 'method': method, 'requestId': requestId, 'url': url });
  }

  protected override onResponseSuccess(method: string, requestId: string, statusCode: number, durationMs: number): void {
    this.responseEvents.push({ 'durationMs': durationMs, 'method': method, 'requestId': requestId, 'statusCode': statusCode });
  }

  protected override onRequestError(error: unknown, method: string, requestId: string, url: string, durationMs: number): void {
    this.errorEvents.push({ 'durationMs': durationMs, 'error': error, 'method': method, 'requestId': requestId, 'url': url });
  }

  /** Exposes protected hooks for demonstration without a real network call. */
  simulateRequest(method: string, path: string, requestId: string, url: string): void {
    this.onRequestStart(method, path, requestId, url);
  }

  simulateSuccess(method: string, requestId: string, statusCode: number, durationMs: number): void {
    this.onResponseSuccess(method, requestId, statusCode, durationMs);
  }

  simulateError(error: unknown, method: string, requestId: string, url: string, durationMs: number): void {
    this.onRequestError(error, method, requestId, url, durationMs);
  }
}

const client = new TelemetryClient({ 'baseURL': 'https://api.example.com' });

// Simulate a successful request lifecycle
client.simulateRequest('GET', '/users', 'req-001', 'https://api.example.com/users');
client.simulateSuccess('GET', 'req-001', 200, 45);

// Simulate an error
const err = new Error('connection refused');
client.simulateError(err, 'POST', 'req-002', 'https://api.example.com/data', 120);

console.log('TelemetryClient — hooks fire correctly:');
console.log(`  onRequestStart: ${client.requestEvents.length} event(s)`);
console.log(`  onResponseSuccess: ${client.responseEvents.length} event(s)`);
console.log(`  onRequestError: ${client.errorEvents.length} event(s)`);
// #endregion usage

assert.ok(client instanceof FetchClient, 'TelemetryClient extends FetchClient');
assert.ok(client instanceof TelemetryClient, 'instanceof works as expected');

assert.strictEqual(client.requestEvents.length, 1, 'onRequestStart fired once');
assert.strictEqual(client.requestEvents[0]?.method, 'GET');
assert.strictEqual(client.requestEvents[0]?.requestId, 'req-001');
assert.strictEqual(client.requestEvents[0]?.url, 'https://api.example.com/users');

assert.strictEqual(client.responseEvents.length, 1, 'onResponseSuccess fired once');
assert.strictEqual(client.responseEvents[0]?.statusCode, 200);
assert.strictEqual(client.responseEvents[0]?.durationMs, 45);

assert.strictEqual(client.errorEvents.length, 1, 'onRequestError fired once');
assert.strictEqual(client.errorEvents[0]?.error, err);
assert.strictEqual(client.errorEvents[0]?.durationMs, 120);

console.log('03-telemetry-hooks: all assertions passed');
