/** observedScheduler — override all lifecycle hooks to emit a debug trace. Run: npx tsx examples/observedScheduler.ts */

import { VirtualTimeCounter } from '@studnicky/clock';
import assert from 'node:assert/strict';

import { VirtualScheduler } from '../src/index.js';

// #region usage
class ObservedScheduler extends VirtualScheduler {
  readonly events: string[] = [];

  public constructor(counter: Readonly<VirtualTimeCounter>) {
    super(counter);
  }

  protected override onSchedule(id: string, atMs: number, variant: 'interval' | 'timeout'): void {
    const line = `[scheduler] schedule id=${id} atMs=${atMs.toString()} variant=${variant}`;
    console.log(line);
    this.events.push(line);
  }

  protected override onAdvance(deltaMs: number): void {
    const line = `[scheduler] advance deltaMs=${deltaMs.toString()}`;
    console.log(line);
    this.events.push(line);
  }

  protected override onRunUntil(atMs: number): void {
    const line = `[scheduler] runUntil atMs=${atMs.toString()}`;
    console.log(line);
    this.events.push(line);
  }

  protected override onFire(id: string): void {
    const line = `[scheduler] fire id=${id}`;
    console.log(line);
    this.events.push(line);
  }

  protected override onFireError(id: string, error: unknown): void {
    const message = error instanceof Error ? error.message : String(error);
    const line = `[scheduler] fireError id=${id} error="${message}"`;
    console.log(line);
    this.events.push(line);
  }

  protected override onReschedule(id: string, atMs: number): void {
    const line = `[scheduler] reschedule id=${id} nextAtMs=${atMs.toString()}`;
    console.log(line);
    this.events.push(line);
  }

  protected override onCancel(id: string): void {
    const line = `[scheduler] cancel id=${id}`;
    console.log(line);
    this.events.push(line);
  }

  protected override onCancelAll(): void {
    const line = '[scheduler] cancelAll';
    console.log(line);
    this.events.push(line);
  }

  protected override onIdle(): void {
    const line = '[scheduler] idle';
    console.log(line);
    this.events.push(line);
  }
}

const counter = VirtualTimeCounter.create({ 'startMs': 0 });
const scheduler = new ObservedScheduler(counter);

// Schedule a one-shot task at t=100
scheduler.scheduleAt(100, () => {
  console.log('[task:one-shot] fired at t=100');
});

// Schedule an interval task every 150 ms
scheduler.scheduleEvery(150, () => {
  console.log('[task:interval] fired');
});

// Schedule a task that throws — exercises onFireError
scheduler.scheduleAt(200, () => {
  console.log('[task:failing] about to throw');
  throw new Error('task failure');
});

// Advance to t=300 — fires the one-shot at 100, the interval at 150, the failing at 200,
// and reschedules the interval to 300.
scheduler.advance(300);

// Cancel everything to exercise onCancelAll + onIdle
scheduler.cancelAll();
// #endregion usage

// Verify event sequence
const evts = scheduler.events;

// schedule: one-shot (vtask-1), interval (vtask-2), failing (vtask-3)
assert.ok(evts.some((e) => { return e.includes('schedule') && e.includes('vtask-1') && e.includes('timeout'); }), 'one-shot scheduled');
assert.ok(evts.some((e) => { return e.includes('schedule') && e.includes('vtask-2') && e.includes('interval'); }), 'interval scheduled');
assert.ok(evts.some((e) => { return e.includes('schedule') && e.includes('vtask-3') && e.includes('timeout'); }), 'failing task scheduled');

// advance + runUntil appear
assert.ok(evts.some((e) => { return e.includes('advance') && e.includes('300'); }), 'advance(300) traced');
assert.ok(evts.some((e) => { return e.includes('runUntil') && e.includes('atMs'); }), 'runUntil traced');

// fire events for all three tasks
assert.ok(evts.some((e) => { return e.includes('fire') && e.includes('vtask-1'); }), 'one-shot fired');
assert.ok(evts.some((e) => { return e.includes('fire') && e.includes('vtask-2'); }), 'interval fired');
assert.ok(evts.some((e) => { return e.includes('fire') && e.includes('vtask-3'); }), 'failing task fired');

// fireError for the failing task
assert.ok(evts.some((e) => { return e.includes('fireError') && e.includes('vtask-3') && e.includes('task failure'); }), 'fireError traced');

// reschedule for the interval task
assert.ok(evts.some((e) => { return e.includes('reschedule') && e.includes('vtask-2'); }), 'interval rescheduled');

// idle after advance drains pending tasks — heap has only the interval pending at 300
// then cancelAll clears it
assert.ok(evts.some((e) => { return e.includes('cancelAll') && e.startsWith('[scheduler]'); }), 'cancelAll traced');
assert.ok(evts.some((e) => { return e.includes('idle') && e.startsWith('[scheduler]'); }), 'idle traced');

console.log('observedScheduler: all assertions passed');
