/**
 * Telemetry via FetchClient subclass hooks.
 *
 * Demonstrates: overriding onRequestStart, onResponseSuccess, onRequestError
 * to add telemetry without modifying core behavior.
 *
 * Run: npx tsx packages/fetch/examples/03-telemetry-hooks.ts
 */
import assert from 'node:assert/strict';

import { FetchClient } from '../src/index.js';

type RequestEventType = {
  method: string;
  requestId: string;
  url: string;
};

type ResponseEventType = {
  durationMs: number;
  method: string;
  requestId: string;
  statusCode: number;
};

type ErrorEventType = {
  durationMs: number;
  error: unknown;
  method: string;
  requestId: string;
  url: string;
};

class TelemetryClient extends FetchClient {
  public readonly requestEvents: RequestEventType[] = [];
  public readonly responseEvents: ResponseEventType[] = [];
  public readonly errorEvents: ErrorEventType[] = [];

  protected override onRequestStart(method: string, _path: string, requestId: string, url: string): void {
    this.requestEvents.push({ method, requestId, url });
  }

  protected override onResponseSuccess(method: string, requestId: string, statusCode: number, durationMs: number): void {
    this.responseEvents.push({ method, requestId, statusCode, durationMs });
  }

  protected override onRequestError(error: unknown, method: string, requestId: string, url: string, durationMs: number): void {
    this.errorEvents.push({ error, method, requestId, url, durationMs });
  }

  /** Exposes protected hooks for testing without a real network call. */
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

const client = new TelemetryClient({ baseURL: 'https://api.example.com' });

assert.ok(client instanceof FetchClient, 'TelemetryClient extends FetchClient');
assert.ok(client instanceof TelemetryClient, 'instanceof works as expected');

// Simulate a successful request lifecycle
client.simulateRequest('GET', '/users', 'req-001', 'https://api.example.com/users');
client.simulateSuccess('GET', 'req-001', 200, 45);

assert.strictEqual(client.requestEvents.length, 1, 'onRequestStart fired once');
assert.strictEqual(client.requestEvents[0]?.method, 'GET');
assert.strictEqual(client.requestEvents[0]?.requestId, 'req-001');
assert.strictEqual(client.requestEvents[0]?.url, 'https://api.example.com/users');

assert.strictEqual(client.responseEvents.length, 1, 'onResponseSuccess fired once');
assert.strictEqual(client.responseEvents[0]?.statusCode, 200);
assert.strictEqual(client.responseEvents[0]?.durationMs, 45);

// Simulate an error
const err = new Error('connection refused');
client.simulateError(err, 'POST', 'req-002', 'https://api.example.com/data', 120);

assert.strictEqual(client.errorEvents.length, 1, 'onRequestError fired once');
assert.strictEqual(client.errorEvents[0]?.error, err);
assert.strictEqual(client.errorEvents[0]?.durationMs, 120);

console.log('TelemetryClient — hooks fire correctly:');
console.log(`  onRequestStart: ${client.requestEvents.length} event(s)`);
console.log(`  onResponseSuccess: ${client.responseEvents.length} event(s)`);
console.log(`  onRequestError: ${client.errorEvents.length} event(s)`);
