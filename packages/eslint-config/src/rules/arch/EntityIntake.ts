import type { Rule } from 'eslint';

import { INTAKE_MEMBER } from '../constants/IntakeParseOnlyConstants.js';
import { ObjectGuard } from '../shared/ObjectGuard.js';

// PRIVATE HELPERS SHARE THE BOUNDARY. `FooEntity.intake` that outgrows a single function body
// commonly gets a private helper extracted — a `#normalize` method, a `private static` method, or
// a non-exported function or class nested in the same namespace. Nothing outside the entity can
// call any of those directly; the only way in from outside is still the public `intake`/`create`
// entry point. Reporting the helper's `unknown` parameter would report the very boundary this rule
// exists to require, so any such helper — private class member, or unexported declaration — nested
// inside a `*Entity` namespace counts as inside the boundary, same as `intake` itself.

/** Identifies an entity namespace's `intake` function, or a helper only it can reach, from any node in its body. */
export class EntityIntake {
  public static contains(node: Rule.Node): boolean {
    let current: Rule.Node | undefined = node;

    while (current !== undefined) {
      if (EntityIntake.#isFunction(current)) {
        if (!EntityIntake.#isInEntityNamespace(current)) {
          return false;
        }
        const result = EntityIntake.#isIntakeMember(current) || EntityIntake.#isUnreachableHelper(current);
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

    // An entity may express `intake` as a class method rather than a function or a const —
    // `@studnicky/errors` hand-writes its boundary that way, because it cannot depend on
    // `@studnicky/json`'s compiled parser without creating a dependency cycle. A method named
    // `intake` inside an entity namespace is the same sanctioned boundary as
    // `export const intake = ...`, and refusing to recognise it would report the very
    // trust boundary this rule exists to require.
    if (parent?.type === 'MethodDefinition' || parent?.type === 'PropertyDefinition') {
      const memberRaw = parent as unknown as Record<string, unknown>;
      const key: unknown = memberRaw.key;
      const named = ObjectGuard.isObject(key) && key.name === INTAKE_MEMBER;

      return named;
    }

    if (parent?.type !== 'VariableDeclarator') {
      return false;
    }

    const parentRaw = parent as unknown as Record<string, unknown>;
    const declaredId: unknown = parentRaw.id;
    const result = ObjectGuard.isObject(declaredId) && declaredId.name === INTAKE_MEMBER;
    return result;
  }

  static #isUnreachableHelper(node: Rule.Node): boolean {
    const parent: Rule.Node | undefined = node.parent ?? undefined;

    if (parent?.type === 'MethodDefinition' || parent?.type === 'PropertyDefinition') {
      if (EntityIntake.#isPrivateMember(parent)) {
        return true;
      }
      const enclosingClass = EntityIntake.#enclosingClassDeclaration(parent);
      const result = enclosingClass !== undefined && EntityIntake.#isUnexported(enclosingClass);
      return result;
    }

    if (parent?.type === 'VariableDeclarator') {
      const result = EntityIntake.#isUnexported(parent);
      return result;
    }

    if (node.type === 'FunctionDeclaration') {
      const result = EntityIntake.#isUnexported(node);
      return result;
    }

    return false;
  }

  static #isPrivateMember(memberDefinition: Rule.Node): boolean {
    const raw = memberDefinition as unknown as Record<string, unknown>;
    const key: unknown = raw.key;

    if (ObjectGuard.isObject(key) && key.type === 'PrivateIdentifier') {
      return true;
    }

    const result = raw.accessibility === 'private';
    return result;
  }

  static #enclosingClassDeclaration(memberDefinition: Rule.Node): Rule.Node | undefined {
    const classBody = memberDefinition.parent ?? undefined;
    const result = classBody?.parent ?? undefined;
    return result;
  }

  /** Reports whether `declarationOrDeclarator` is reached by an `export` before its `*Entity` namespace body. */
  static #isUnexported(declarationOrDeclarator: Rule.Node): boolean {
    let current: Rule.Node | undefined = declarationOrDeclarator;

    while (current !== undefined) {
      const raw = current as unknown as Record<string, unknown>;

      if (raw.type === 'ExportNamedDeclaration' || raw.type === 'ExportDefaultDeclaration') {
        return false;
      }
      if (raw.type === 'TSModuleBlock' || raw.type === 'TSModuleDeclaration') {
        return true;
      }

      current = current.parent ?? undefined;
    }

    return true;
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
