import { Predicates } from '../predicates/Predicates.js';
import { ValueCoders } from './registries/ValueCoders.js';

// WHY A GUARD, NOT A CAST.
//
// `FilterValue` is a recursive, non-JSON-Schema-representable union, so it can't be validated
// through `SchemaValidator` — this hand-rolls the same shape-proving role `intake` plays
// everywhere else in this codebase. Anywhere untyped traversal data (`Reflect.get`'s `any`,
// `JSON.parse`'s `any`) needs to become a real `FilterValue`, it crosses through here — never
// through an `as FilterValue` assertion, which would just be an unchecked promise instead of a
// proven one. `Date`/`Set`/`Map` are recognized via the `ValueCoders` registry and pass through
// unchanged at runtime even though `FilterValue`'s static union no longer names them.
//
// SHALLOW BY DESIGN. `intake` classifies exactly one level and recurses into children lazily
// through the SAME check — it does not eagerly walk and re-validate an entire subtree before a
// caller has asked for it. A path-traversal helper hopping through a large structure one segment
// at a time only needs each hop's classification, not the whole remaining tree validated up
// front; recursing eagerly here would make every single-property lookup pay for validating data
// nothing asked to see yet.

const valueCoders = new ValueCoders();

export class FilterValueGuard {
  static intake(input: unknown): unknown {
    if (input === null || input === undefined) {
      return input;
    }
    if (Predicates.isString(input) || Predicates.isNumber(input) || Predicates.isBoolean(input)) {
      return input;
    }
    if (valueCoders.coders.get('CORE.date')?.guard(input) === true) {
      return input;
    }
    if (Predicates.isArray(input)) {
      const result = FilterValueGuard.intakeArray(input);

      return result;
    }
    if (valueCoders.coders.get('CORE.set')?.guard(input) === true) {
      const result = FilterValueGuard.intakeSet(input as ReadonlySet<unknown>);

      return result;
    }
    if (valueCoders.coders.get('CORE.map')?.guard(input) === true) {
      const result = FilterValueGuard.intakeMap(input as ReadonlyMap<unknown, unknown>);

      return result;
    }
    if (Predicates.isRecord(input)) {
      const result = FilterValueGuard.intakeRecord(input);

      return result;
    }

    throw new TypeError(`Not a valid FilterValue: ${typeof input}`);
  }

  private static intakeArray(input: readonly unknown[]): unknown[] {
    const result: unknown[] = [];
    const inputLength = input.length;

    for (let index = 0; index < inputLength; index += 1) {
      result.push(FilterValueGuard.intake(input[index]));
    }

    return result;
  }

  private static intakeMap(input: ReadonlyMap<unknown, unknown>): Map<string, unknown> {
    const result = new Map<string, unknown>();

    for (const [key, item] of input.entries()) {
      result.set(String(key), FilterValueGuard.intake(item));
    }

    return result;
  }

  // Dynamic-keyed writes to a plain object drive it into dictionary mode
  // (@studnicky/v8/dynamic-property-access), and `Object.fromEntries`/computed
  // literal keys bypass V8's fast object-literal path
  // (@studnicky/v8/computed-object-properties). `Object.defineProperty` is
  // neither a bracket-notation write nor an object-literal computed key, so it
  // is the one construction path this ruleset leaves open for mirroring an
  // arbitrary input record's keys into a fresh plain object.
  private static intakeRecord(input: Record<string, unknown>): Record<string, unknown> {
    const result: Record<string, unknown> = {};
    const keys = Object.keys(input);
    const keysLength = keys.length;

    for (let index = 0; index < keysLength; index += 1) {
      const key = keys[index];

      if (key === undefined) {
        continue;
      }
      Object.defineProperty(result, key, {
        'configurable': true,
        'enumerable': true,
        'value': FilterValueGuard.intake(input[key]),
        'writable': true
      });
    }

    return result;
  }

  private static intakeSet(input: ReadonlySet<unknown>): Set<unknown> {
    const result = new Set<unknown>();

    for (const item of input) {
      result.add(FilterValueGuard.intake(item));
    }

    return result;
  }
}
