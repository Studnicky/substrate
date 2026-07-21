/** observedLogger — subclass hook overrides that emit console.log trace lines for every logger lifecycle stage. Run: npx tsx examples/observedLogger.ts */

import { EventRecorder } from '@studnicky/errors';
import assert from 'node:assert/strict';

// #region usage
import type {
  LogBodyDataEntity,
  LoggerHookEventKindEntity,
  LoggerOptionsInterface,
  LogLevelEntity,
  LogMetadataInterface,
  LogRecordEntity,
  TransportInterface
} from '../src/index.js';

import { FunctionTransport, LogBody, Logger } from '../src/index.js';

// ---------------------------------------------------------------------------
// ObservedLogger — records every Logger lifecycle event
// ---------------------------------------------------------------------------

interface LogEventInterface {
  readonly 'bindings'?: LogMetadataInterface;
  readonly 'error'?: unknown;
  readonly 'kind': LoggerHookEventKindEntity.Type;
  readonly 'level'?: LogLevelEntity.Type;
  readonly 'message'?: LogBodyDataEntity.Type['message'];
}

class ObservedLogger extends Logger {
  constructor(config: LoggerOptionsInterface = {}) {
    super(config);
  }

  readonly #recorder = new EventRecorder<LogEventInterface>();

  get events(): LogEventInterface[] { return this.#recorder.events; }

  protected override onLog(level: LogLevelEntity.Type, record: LogRecordEntity.Type): void {
    this.#recorder.record(
      { 'kind': 'log', 'level': level, 'message': String(record.data.message) },
      `[logger] onLog level=${level} msg=${String(record.data.message)}`
    );
  }

  protected override onDropped(level: LogLevelEntity.Type): void {
    this.#recorder.record({ 'kind': 'dropped', 'level': level }, `[logger] onDropped level=${level}`);
  }

  protected override onChildCreate(bindings: LogMetadataInterface): void {
    this.#recorder.record(
      { 'bindings': bindings, 'kind': 'childCreate' },
      `[logger] onChildCreate bindings=${JSON.stringify(bindings)}`
    );
  }

  protected override onTransportError(_transport: TransportInterface, _record: LogRecordEntity.Type, error: unknown): void {
    this.#recorder.record(
      { 'error': error, 'kind': 'transportError' },
      `[logger] onTransportError error=${String(error instanceof Error ? error.message : error)}`
    );
  }
}

// ---------------------------------------------------------------------------
// Scenario
// ---------------------------------------------------------------------------

const throwingTransport = FunctionTransport.create(() => {
  throw new Error('transport failure');
});

const logger = new ObservedLogger({
  'level': 'info',
  'metadata': { 'service': 'observed-demo' },
  'transports': [throwingTransport]
});

// onLog — fires for an info record (at or above INFO floor)
const infoBody = LogBody.create({
  'component': 'demo',
  'context': {},
  'message': 'Hello from observed logger',
  'operation': 'run',
  'status': 'success'
});

logger.info(infoBody);

// onDropped — fires because debug is below INFO floor
const debugBody = LogBody.create({
  'component': 'demo',
  'context': {},
  'message': 'This is below the floor',
  'operation': 'debug-probe',
  'status': 'success'
});

logger.debug(debugBody);

// onChildCreate — fires when child() is called
const child = logger.child({ 'requestId': 'req-abc' });

// onTransportError already fired above (throwingTransport); verify via events

console.log('Logger events:', JSON.stringify(logger.events));
// #endregion usage

// Verify onLog fired for the info call
{
  const logEvents = logger.events.filter((e) => { return e.kind === 'log'; });
  assert.strictEqual(logEvents.length, 1);
  const [firstLog] = logEvents;
  assert.ok(firstLog?.kind === 'log');
  assert.strictEqual(firstLog.message, 'Hello from observed logger');
}

// Verify onDropped fired for the debug call
const droppedEvents = logger.events.filter((e) => { return e.kind === 'dropped'; });
assert.strictEqual(droppedEvents.length, 1);

// Verify onChildCreate fired
{
  const childEvents = logger.events.filter((e) => { return e.kind === 'childCreate'; });
  assert.strictEqual(childEvents.length, 1);
  const [firstChild] = childEvents;
  assert.ok(firstChild?.kind === 'childCreate');
  assert.deepStrictEqual(firstChild.bindings, { 'requestId': 'req-abc' });
}

// Verify onTransportError fired (throwing transport)
{
  const transportErrorEvents = logger.events.filter((e) => { return e.kind === 'transportError'; });
  assert.strictEqual(transportErrorEvents.length, 1);
  const [firstTransportError] = transportErrorEvents;
  assert.ok(firstTransportError?.kind === 'transportError');
  assert.ok(firstTransportError.error instanceof Error);
}

// child is exercised: its info method is invoked to confirm the child is a usable Logger
child.info(infoBody);
assert.ok(typeof child.info === 'function');

console.log('observedLogger: all assertions passed');
