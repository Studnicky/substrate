/** observedLogger — subclass hook overrides that emit console.log trace lines for every logger lifecycle stage. Run: npx tsx examples/observedLogger.ts */

import assert from 'node:assert/strict';

// #region usage
import type { LogBodyDataType } from '../src/interfaces/LogBodyDataType.js';
import type { LogFaultDataType } from '../src/interfaces/LogFaultDataType.js';
import type { LoggerOptionsInterface } from '../src/interfaces/LoggerOptionsInterface.js';
import type { TransportInterface } from '../src/transports/TransportInterface.js';
import type { LogLevelType } from '../src/types/LogLevelType.js';
import type { LogMetadataType } from '../src/types/LogMetadataType.js';
import type { LogRecordType } from '../src/types/LogRecordType.js';

import { LogBody } from '../src/modules/LogBody.js';
import { Logger } from '../src/modules/Logger.js';
import { FunctionTransport } from '../src/transports/FunctionTransport.js';

// ---------------------------------------------------------------------------
// ObservedLogger — records every Logger lifecycle event
// ---------------------------------------------------------------------------

type LogEvent =
  | { 'error': unknown; 'kind': 'transportError' }
  | { 'bindings': LogMetadataType; 'kind': 'childCreate' }
  | { 'kind': 'dropped'; 'level': LogLevelType }
  | { 'kind': 'log'; 'level': LogLevelType; 'message': string };

class ObservedLogger extends Logger {
  constructor(config: LoggerOptionsInterface = {}) {
    super(config);
  }

  readonly events: LogEvent[] = [];

  protected override onLog(level: LogLevelType, record: LogRecordType): void {
    console.log(`[logger] onLog level=${level} msg=${String(record.data.message)}`);
    this.events.push({ 'kind': 'log', 'level': level, 'message': String(record.data.message) });
  }

  protected override onDropped(level: LogLevelType): void {
    console.log(`[logger] onDropped level=${level}`);
    this.events.push({ 'kind': 'dropped', 'level': level });
  }

  protected override onChildCreate(bindings: LogMetadataType): void {
    console.log(`[logger] onChildCreate bindings=${JSON.stringify(bindings)}`);
    this.events.push({ 'bindings': bindings, 'kind': 'childCreate' });
  }

  protected override onTransportError(_transport: TransportInterface, _record: LogRecordType, error: unknown): void {
    console.log(`[logger] onTransportError error=${String(error instanceof Error ? error.message : error)}`);
    this.events.push({ 'error': error, 'kind': 'transportError' });
  }
}

// ---------------------------------------------------------------------------
// ObservedLogBody — records every builder lifecycle event
// ---------------------------------------------------------------------------

type BuilderEvent =
  | { 'field': string; 'kind': 'buildError' }
  | { 'kind': 'build'; 'result': LogBodyDataType | LogFaultDataType };

class ObservedLogBody extends LogBody {
  constructor() { super(); }

  readonly builderEvents: BuilderEvent[] = [];

  protected override onBuild(result: LogBodyDataType | LogFaultDataType): void {
    console.log(`[logger] onBuild event=${result.event}`);
    this.builderEvents.push({ 'kind': 'build', 'result': result });
  }

  protected override onBuildError(field: string): void {
    console.log(`[logger] onBuildError field=${field}`);
    this.builderEvents.push({ 'field': field, 'kind': 'buildError' });
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
const infoBody = LogBody.create()
  .component('demo')
  .operation('run')
  .status('success')
  .message('Hello from observed logger')
  .context({})
  .build();

logger.info(infoBody);

// onDropped — fires because debug is below INFO floor
const debugBody = LogBody.create()
  .component('demo')
  .operation('debug-probe')
  .status('success')
  .message('This is below the floor')
  .context({})
  .build();

logger.debug(debugBody);

// onChildCreate — fires when child() is called
const child = logger.child({ 'requestId': 'req-abc' });

// onTransportError already fired above (throwingTransport); verify via events

// onBuild — fire via ObservedLogBody
const observedBuilder = new ObservedLogBody();
observedBuilder
  .component('builder')
  .operation('construct')
  .status('success')
  .message('Built payload')
  .context({ 'n': 42 })
  .build();

// onBuildError — fire via missing field
const errorBuilder = new ObservedLogBody();
try {
  errorBuilder
    .operation('construct')
    .status('success')
    .message('Missing component')
    .context({})
    .build();
} catch {
  // expected — onBuildError fired before throw
}

console.log('Logger events:', JSON.stringify(logger.events));
console.log('Builder events:', JSON.stringify(observedBuilder.builderEvents));
console.log('Builder error events:', JSON.stringify(errorBuilder.builderEvents));
// #endregion usage

// Verify onLog fired for the info call
const logEvents = logger.events.filter((e) => { return e.kind === 'log'; });
assert.strictEqual(logEvents.length, 1);
const [firstLog] = logEvents;
assert.ok(firstLog?.kind === 'log');
assert.strictEqual(firstLog.message, 'Hello from observed logger');

// Verify onDropped fired for the debug call
const droppedEvents = logger.events.filter((e) => { return e.kind === 'dropped'; });
assert.strictEqual(droppedEvents.length, 1);

// Verify onChildCreate fired
const childEvents = logger.events.filter((e) => { return e.kind === 'childCreate'; });
assert.strictEqual(childEvents.length, 1);
const [firstChild] = childEvents;
assert.ok(firstChild?.kind === 'childCreate');
assert.deepStrictEqual(firstChild.bindings, { 'requestId': 'req-abc' });

// Verify onTransportError fired (throwing transport)
const transportErrorEvents = logger.events.filter((e) => { return e.kind === 'transportError'; });
assert.strictEqual(transportErrorEvents.length, 1);
const [firstTransportError] = transportErrorEvents;
assert.ok(firstTransportError?.kind === 'transportError');
assert.ok(firstTransportError.error instanceof Error);

// Verify onBuild fired
assert.strictEqual(observedBuilder.builderEvents.filter((e) => { return e.kind === 'build'; }).length, 1);

// Verify onBuildError fired
const buildErrorEvents = errorBuilder.builderEvents.filter((e) => { return e.kind === 'buildError'; });
assert.strictEqual(buildErrorEvents.length, 1);
const [firstBuildError] = buildErrorEvents;
assert.ok(firstBuildError?.kind === 'buildError');
assert.strictEqual(firstBuildError.field, 'component');

// child is exercised: its info method is invoked to confirm the child is a usable Logger
child.info(infoBody);
assert.ok(typeof child.info === 'function');

console.log('observedLogger: all assertions passed');
