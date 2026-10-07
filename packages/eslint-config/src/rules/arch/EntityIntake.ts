import type { Rule } from 'eslint';

import { Predicates } from '#runtime';

import { INTAKE_MEMBER } from '../constants/IntakeParseOnlyConstants.js';
import { AstHelpers } from '../shared/astHelpers.js';

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
    const result = node.type === 'ArrowFunctionExpression'
      || node.type === 'FunctionDeclaration'
      || node.type === 'FunctionExpression';
    return result;
  }

  static #isIntakeMember(node: Rule.Node): boolean {
    const id = AstHelpers.getNodeProperty(node, 'id');

    if (Predicates.isRecord(id) && id.name === INTAKE_MEMBER) {
      return true;
    }

    const parent: Rule.Node | undefined = node.parent ?? undefined;

    // An entity may express `intake` as a class method rather than a function or a const —
    // `@studnicky/errors` hand-writes its boundary that way, because it cannot depend on
    // `@studnicky/entity`'s compiled parser without creating a dependency cycle. A method named
    // `intake` inside an entity namespace is the same sanctioned boundary as
    // `export const intake = ...`, and refusing to recognise it would report the very
    // trust boundary this rule exists to require.
    if (parent?.type === 'MethodDefinition' || parent?.type === 'PropertyDefinition') {
      const result = EntityIntake.#isMemberNamedIntake(parent);

      return result;
    }

    if (parent?.type !== 'VariableDeclarator') {
      return false;
    }

    const result = EntityIntake.#isDeclaratorNamedIntake(parent);

    return result;
  }

  static #isDeclaratorNamedIntake(declarator: Rule.Node): boolean {
    const declaredId = AstHelpers.getNodeProperty(declarator, 'id');
    const result = Predicates.isRecord(declaredId) && declaredId.name === INTAKE_MEMBER;

    return result;
  }

  static #isMemberNamedIntake(member: Rule.Node): boolean {
    const key = AstHelpers.getNodeProperty(member, 'key');
    const result = Predicates.isRecord(key) && key.name === INTAKE_MEMBER;

    return result;
  }

  static #isUnreachableHelper(node: Rule.Node): boolean {
    const parent: Rule.Node | undefined = node.parent ?? undefined;

    if (parent?.type === 'MethodDefinition' || parent?.type === 'PropertyDefinition') {
      const result = EntityIntake.#isUnreachableMember(parent);

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

  static #isUnreachableMember(parent: Rule.Node): boolean {
    if (EntityIntake.#isPrivateMember(parent)) {
      return true;
    }
    const enclosingClass = EntityIntake.#enclosingClassDeclaration(parent);
    const result = enclosingClass !== undefined && EntityIntake.#isUnexported(enclosingClass);

    return result;
  }

  static #isPrivateMember(memberDefinition: Rule.Node): boolean {
    const key = AstHelpers.getNodeProperty(memberDefinition, 'key');

    if (Predicates.isRecord(key) && key.type === 'PrivateIdentifier') {
      return true;
    }

    const result = AstHelpers.getNodeProperty(memberDefinition, 'accessibility') === 'private';
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
      if (current.type === 'ExportNamedDeclaration' || current.type === 'ExportDefaultDeclaration') {
        return false;
      }
      const currentType = AstHelpers.getNodeType(current);

      if (currentType === 'TSModuleBlock' || currentType === 'TSModuleDeclaration') {
        return true;
      }

      current = current.parent ?? undefined;
    }

    return true;
  }

  static #isInEntityNamespace(node: Rule.Node): boolean {
    let current: Rule.Node | undefined = node.parent ?? undefined;

    while (current !== undefined) {
      if (AstHelpers.getNodeType(current) === 'TSModuleDeclaration') {
        const id = AstHelpers.getNodeProperty(current, 'id');

        if (Predicates.isRecord(id) && typeof id.name === 'string' && id.name.endsWith('Entity')) {
          return true;
        }
      }

      current = current.parent ?? undefined;
    }

    return false;
  }
}
