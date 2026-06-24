/** subclass-hooks — override onInitialize to seed default values into every scope. Run: npx tsx packages/context/examples/subclass-hooks.ts */

import assert from 'node:assert/strict';

// #region usage
import type { ContextScope } from '../src/index.js';

import { Context } from '../src/index.js';

/**
 * A Context subclass that automatically seeds `_createdAt` on every scope.
 */
class AuditContext extends Context {
  protected override onInitialize(
    _initial: Record<string, unknown> | undefined,
    scope: ContextScope
  ): void {
    // Seed a timestamp into the new scope so every execute() can read it
    scope.execute(() => {
      this.set('_createdAt', Date.now());
    });
  }
}

// Context.create uses `new this(config)` so the return type is AuditContext
const auditContext = AuditContext.create({ 'name': 'audit' });

const scope = auditContext.initialize({ 'operation': 'delete', 'resource': 'user/99' });

scope.execute(() => {
  const createdAt = auditContext.get<number>('_createdAt');
  const operation = auditContext.get<string>('operation');
  const resource = auditContext.get<string>('resource');

  console.log(`operation:  ${operation}`);
  console.log(`resource:   ${resource}`);
  console.log(`_createdAt: ${createdAt}`);
});

const snapshot = scope.terminate();

console.log('snapshot keys:', Object.keys(snapshot).sort());
// #endregion usage

assert.equal(snapshot.operation, 'delete');
assert.equal(snapshot.resource, 'user/99');
assert.ok(typeof snapshot._createdAt === 'number' && snapshot._createdAt > 0);

console.log('subclass-hooks: all assertions passed');
