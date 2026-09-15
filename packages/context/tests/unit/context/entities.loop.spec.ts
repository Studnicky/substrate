import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  ContextScopeStateEntity,
  ContextScopeTransitionEventEntity,
  ContextScopeVariantEntity
} from "../../../src/entities/index.js";

void describe("context lifecycle entities", () => {
  void it("accepts canonical scope state and transition objects", () => {
    assert.equal(ContextScopeVariantEntity.validate("active"), true);
    assert.equal(ContextScopeStateEntity.validate({ variant: "active" }), true);
    assert.equal(ContextScopeTransitionEventEntity.validate({ to: "terminated", type: "transitionTo" }), true);
  });

  void it("rejects incomplete and extended lifecycle objects", () => {
    assert.equal(ContextScopeVariantEntity.validate("unknown"), false);
    assert.equal(ContextScopeStateEntity.validate({ variant: "active", extra: true }), false);
    assert.equal(ContextScopeTransitionEventEntity.validate({ to: "terminated", type: "transitionTo", extra: true }), false);
    assert.equal(ContextScopeTransitionEventEntity.validate({ type: "transitionTo" }), false);
  });
});
