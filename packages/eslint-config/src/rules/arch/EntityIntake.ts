import type { Rule } from 'eslint';

import { INTAKE_MEMBER } from '../constants/IntakeParseOnlyConstants.js';
import { ObjectGuard } from '../shared/ObjectGuard.js';

/** Identifies an entity namespace's `intake` function from any node in its body. */
export class EntityIntake {
  public static contains(node: Rule.Node): boolean {
    let current: Rule.Node | undefined = node;

    while (current !== undefined) {
      if (EntityIntake.#isFunction(current)) {
        const result = EntityIntake.#isIntakeMember(current) && EntityIntake.#isInEntityNamespace(current);
        return result;
      }

      current = current.parent ?? undefined;
    }

    return false;
  }

  static #isFunction(node: Rule.Node): boolean {
    const raw = node as unknown as Record<string, unknown>;
    const result = raw.type === 'ArrowFunctionExpression'
      || raw.type === 'FunctionDeclaration'
      || raw.type === 'FunctionExpression';
    return result;
  }

  static #isIntakeMember(node: Rule.Node): boolean {
    const raw = node as unknown as Record<string, unknown>;
    const id: unknown = raw.id;

    if (ObjectGuard.isObject(id) && id.name === INTAKE_MEMBER) {
      return true;
    }

    const parent: Rule.Node | undefined = node.parent ?? undefined;

    if (parent?.type !== 'VariableDeclarator') {
      return false;
    }

    const parentRaw = parent as unknown as Record<string, unknown>;
    const declaredId: unknown = parentRaw.id;
    const result = ObjectGuard.isObject(declaredId) && declaredId.name === INTAKE_MEMBER;
    return result;
  }

  static #isInEntityNamespace(node: Rule.Node): boolean {
    let current: Rule.Node | undefined = node.parent ?? undefined;

    while (current !== undefined) {
      const raw = current as unknown as Record<string, unknown>;

      if (raw.type === 'TSModuleDeclaration') {
        const id: unknown = raw.id;

        if (ObjectGuard.isObject(id) && typeof id.name === 'string' && id.name.endsWith('Entity')) {
          return true;
        }
      }

      current = current.parent ?? undefined;
    }

    return false;
  }
}
