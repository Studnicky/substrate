import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { RuntimeValue } from "../../src/guards/RuntimeValue.js";

void describe("RuntimeValue", () => {
  void it("accepts recursive Date, Map, Set, array, record, JSON, and undefined operands without changing map keys", () => {
    const date = new Date(0);
    const key = { "id": 1 };
    const set = new Set<unknown>([date, { "enabled": true }, undefined]);
    const map = new Map<unknown, unknown>([[key, set]]);
    const candidate: unknown = { "map": map, "values": [undefined, date] };

    assert.equal(RuntimeValue.is(candidate), true);
    const result = RuntimeValue.intake(candidate);

    assert.strictEqual(result, candidate);
    assert.strictEqual(map.keys().next().value, key);
    assert.strictEqual(map.get(key), set);
  });

  void it("rejects cycles in records, maps, and sets", () => {
    const record: Record<string, unknown> = {};
    record["self"] = record;
    const map = new Map<unknown, unknown>();
    map.set("self", map);
    const set = new Set<unknown>();
    set.add(set);

    assert.equal(RuntimeValue.is(record), false);
    assert.equal(RuntimeValue.is(map), false);
    assert.equal(RuntimeValue.is(set), false);
    assert.throws(() => RuntimeValue.intake(record), TypeError);
  });

  void it("rejects unsupported and invalid nested runtime values", () => {
    class ExternalValue {}

    const unsupported: readonly unknown[] = [
      () => undefined,
      Symbol("value"),
      1n,
      Number.NaN,
      Number.POSITIVE_INFINITY,
      new ExternalValue()
    ];

    for (const value of unsupported) {
      assert.equal(RuntimeValue.is(value), false);
    }

    assert.equal(RuntimeValue.is({ "nested": [new Set<unknown>([() => undefined])] }), false);
  });
});
