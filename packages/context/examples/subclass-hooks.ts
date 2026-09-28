/** subclass-hooks — override onInitialize to seed default values into every scope. Run: npx tsx packages/context/examples/subclass-hooks.ts */

// #region usage
import type { ContextScopeInterface } from '@studnicky/context/interfaces';

import { Context } from '@studnicky/context/node';
import assert from 'node:assert/strict';

import { ContextConfigEntity } from '../src/entities/ContextConfigEntity.js';
import { NodeContextStorage } from '../src/node/NodeContextStorage.js';

/**
 * A Context subclass that automatically seeds `_createdAt` on every scope.
 */
class AuditContext extends Context {
  static override create(
    config: ContextConfigEntity.InputType,
    storage: NodeContextStorage = new NodeContextStorage()
  ): AuditContext {
    return new AuditContext(ContextConfigEntity.create(config), storage);
  }
  protected override onInitialize(
    _initial: Record<string, unknown> | undefined,
    scope: ContextScopeInterface
  ): void {
    // Seed a timestamp into the new scope so every execute() can read it
    scope.execute(() => {
      this.set('_createdAt', Date.now());
    });
  }
}

// AuditContext.create returns audit contexts with normalized configuration and Node storage.
const auditContext = AuditContext.create({ 'name': 'audit' });

const scope = auditContext.initialize({ 'operation': 'delete', 'resource': 'user/99' });

scope.execute(() => {
  const createdAt = auditContext.get('_createdAt');
  const operation = auditContext.get('operation');
  const resource = auditContext.get('resource');

  console.log(`operation:  ${operation}`);
  console.log(`resource:   ${resource}`);
  console.log(`_createdAt: ${createdAt}`);
});

const snapshot = scope.terminate();

console.log('snapshot keys:', [...snapshot.keys()].toSorted());
// #endregion usage

assert.equal(snapshot.get('operation'), 'delete');
assert.equal(snapshot.get('resource'), 'user/99');
const auditedCreatedAt = snapshot.get('_createdAt');
assert.ok(typeof auditedCreatedAt === 'number' && auditedCreatedAt > 0);

console.log('subclass-hooks: all assertions passed');
