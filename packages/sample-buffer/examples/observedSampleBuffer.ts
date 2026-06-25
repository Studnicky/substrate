/** observedSampleBuffer — trace all lifecycle hooks while filling a buffer past capacity and computing a percentile. Run: npx tsx examples/observedSampleBuffer.ts */

import assert from 'node:assert/strict';

// #region usage
import { SampleBuffer } from '../src/index.js';

class TracedSampleBuffer extends SampleBuffer {
  readonly overflowLog: number[] = [];
  readonly evictLog: number[] = [];
  readonly pushLog: { 'evicted': boolean; 'value': number }[] = [];
  readonly computeStartLog: number[] = [];
  readonly computeCompleteLog: { 'length': number; 'sorted': readonly number[] }[] = [];
  readonly percentileLog: { 'pct': number; 'result': number }[] = [];
  clearCount = 0;

  protected override onOverflow(value: number): void {
    console.log(`[sample-buffer] overflow value=${String(value)} capacity=${String(this._capacity)}`);
    this.overflowLog.push(value);
  }

  protected override onEvict(oldValue: number): void {
    console.log(`[sample-buffer] evict oldValue=${String(oldValue)}`);
    this.evictLog.push(oldValue);
  }

  protected override onPush(value: number, evicted: boolean): void {
    console.log(`[sample-buffer] push value=${String(value)} evicted=${String(evicted)} length=${String(this._length)}`);
    this.pushLog.push({ 'evicted': evicted, 'value': value });
  }

  protected override onComputeStart(length: number): void {
    console.log(`[sample-buffer] computeStart length=${String(length)}`);
    this.computeStartLog.push(length);
  }

  protected override onComputeComplete(length: number, sorted: readonly number[]): void {
    console.log(`[sample-buffer] computeComplete length=${String(length)} sorted=[${sorted.join(',')}]`);
    this.computeCompleteLog.push({ 'length': length, 'sorted': sorted });
  }

  protected override onPercentile(pct: number, result: number): void {
    console.log(`[sample-buffer] percentile pct=${String(pct)} result=${String(result)}`);
    this.percentileLog.push({ 'pct': pct, 'result': result });
  }

  protected override onClear(): void {
    console.log(`[sample-buffer] clear length=${String(this._length)}`);
    this.clearCount++;
  }
}

const buf = TracedSampleBuffer.create({ 'capacity': 3 });

// Fill the buffer (3 pushes, no overflow)
buf.push(10);
buf.push(20);
buf.push(30);

// Push past capacity — triggers overflow + eviction
buf.push(40); // evicts 10
buf.push(50); // evicts 20

// Compute a percentile (triggers computeStart + computeComplete + percentile hook)
const p50 = buf.percentile(50);

// Second call uses cache — no computeStart/computeComplete
const p50Cached = buf.percentile(50);

// Clear
buf.clear();
// #endregion usage

// Assertions
assert.ok(p50 !== undefined, 'p50 should be defined');
assert.ok(p50Cached !== undefined, 'p50Cached should be defined');
assert.equal(p50, p50Cached, 'cached result should match');

// 5 pushes total
assert.equal(buf.pushLog.length, 5, 'push hook fired 5 times');

// 2 overflows (pushes 4 and 5 onto a full buffer)
assert.equal(buf.overflowLog.length, 2, 'overflow hook fired 2 times');
assert.equal(buf.overflowLog[0], 40, 'first overflow value is 40');
assert.equal(buf.overflowLog[1], 50, 'second overflow value is 50');

// 2 evictions match 2 overflows
assert.equal(buf.evictLog.length, 2, 'evict hook fired 2 times');
assert.equal(buf.evictLog[0], 10, 'first eviction was 10');
assert.equal(buf.evictLog[1], 20, 'second eviction was 20');

// computeStart fires once (second percentile() is a cache hit)
assert.equal(buf.computeStartLog.length, 1, 'computeStart fires once per cache miss');

// computeComplete fires once
assert.equal(buf.computeCompleteLog.length, 1, 'computeComplete fires once per cache miss');

// percentile fires twice (both calls)
assert.equal(buf.percentileLog.length, 2, 'percentile hook fires on every non-empty call');

// clear fires once
assert.equal(buf.clearCount, 1, 'clear hook fires');

console.log('observedSampleBuffer: all assertions passed');
