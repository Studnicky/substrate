/** observedFlagEvaluator — override the lifecycle hooks to collect telemetry. Run: npx tsx examples/observedFlagEvaluator.ts */

import assert from 'node:assert/strict';

// #region usage
import { FlagEvaluator } from '../src/index.js';

class TelemetryFlagEvaluator extends FlagEvaluator {
  readonly evaluations: { 'flag': string; 'result': boolean }[] = [];
  readonly defaults: string[] = [];
  readonly ruleMismatches: string[] = [];

  protected override onEvaluate(flag: string, _context: Record<string, unknown>, result: boolean): void {
    console.log(`[flags] '${flag}' -> ${String(result)}`);
    this.evaluations.push({ 'flag': flag, 'result': result });
  }

  protected override onDefault(flag: string): void {
    console.log(`[flags] '${flag}' is not registered — returning false`);
    this.defaults.push(flag);
  }

  protected override onRuleMismatch(flag: string, context: Record<string, unknown>): void {
    console.log(`[flags] '${flag}' rollout bucket missed for`, context);
    this.ruleMismatches.push(flag);
  }
}

const evaluator = TelemetryFlagEvaluator.create();

evaluator.register('dark-mode', { 'defaultValue': false, 'enabled': true });
evaluator.register('legacy-search', { 'defaultValue': false, 'enabled': false });
evaluator.register('new-checkout', { 'defaultValue': false, 'enabled': true, 'rolloutPercent': 25 });

const darkModeOn = evaluator.evaluate('dark-mode', { 'targetingKey': 'user-42' });
const legacySearchOn = evaluator.evaluate('legacy-search', { 'targetingKey': 'user-42' });
const unregisteredOn = evaluator.evaluate('never-registered', { 'targetingKey': 'user-42' });

// the same targetingKey always resolves the same way for the same flag
const checkoutFirst = evaluator.evaluate('new-checkout', { 'targetingKey': 'user-42' });
const checkoutSecond = evaluator.evaluate('new-checkout', { 'targetingKey': 'user-42' });
// #endregion usage

// a flag with no rolloutPercent (implicit 100) is on for everyone once enabled
assert.equal(darkModeOn, true);

// a disabled flag returns its registered defaultValue, not false
assert.equal(legacySearchOn, false);

// an unregistered flag returns false and fires onDefault
assert.equal(unregisteredOn, false);
assert.deepEqual(evaluator.defaults, ['never-registered']);

// determinism: the same flag + targetingKey always resolves identically
assert.equal(checkoutFirst, checkoutSecond);

// every evaluate() call fires onEvaluate exactly once, last
assert.equal(evaluator.evaluations.length, 5);

console.log('observedFlagEvaluator: all assertions passed');
