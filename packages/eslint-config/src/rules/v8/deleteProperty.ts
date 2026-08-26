import type { Rule } from 'eslint';

import {
  IndexKind,
  type Type,
  type TypeChecker,
  TypeFlags
} from 'typescript';

import { AstHelpers } from '../shared/astHelpers.js';
import { ObjectGuard } from '../shared/ObjectGuard.js';

// THE HAZARD IS MEASURED, NOT ASSUMED — AND IT IS REAL FOR BOTH SHAPES BELOW.
//
// Deleting an own property drops the object out of fast properties regardless of what kind
// of object it is (`%HasFastProperties` reports `false` after deletion in both rows):
//
//   target                            reads, 2M objects   vs no-delete
//   class instance (fixed shape)      155.0ms              9.6x slower
//   dynamically-keyed record           49.0ms              2.3x slower
//   class instance, no delete          16.2ms               —
//   dynamic record, no delete          20.9ms               —
//
// The rule's premise is PROVEN, not disproven, by the dynamic-record row. A `delete` on a
// `Record<string, T>` still costs 2.3x — this rule's exemption below is not a "this is free"
// claim about that case. It stays a real, accepted cost.
//
// TWO SITES DELETE BECAUSE REMOVAL IS THE SPECIFIED SEMANTIC, WITH NO ALTERNATIVE SPELLING.
//
//   packages/json/src/json/Draft.ts:125   the `deleteProperty` trap of a `Proxy` handler —
//     a rule banning property removal inside the trap whose entire purpose is implementing
//     the `delete` operator is self-contradictory.
//   packages/json/src/json/Patch.ts:318   RFC-6902 `remove` — the spec defines the operation
//     as removing the member; `'x' in obj` must become `false`. Assigning `undefined` does
//     not satisfy that, and rebuilding the parent object changes identity and breaks
//     in-place mutation.
//
// The exemption below exists because the operation is MANDATORY at those two sites, NOT
// because it is free. Both still pay the cost measured above.
//
// THE EXEMPTION BOUNDARY: AN INDEX SIGNATURE, OR NO DECLARED SHAPE AT ALL.
//
// A type with a declared index signature (`Record<string, T>`, `{ [key: string]: T }`, an
// array/tuple's synthesized number index) is already ADMITTING it has no fixed hidden-class
// contract — that is what an index signature IS: a claim that any key of that kind may exist.
// Deleting from it does not revoke a guarantee the type never made. A fixed-shape class
// instance or interface with only declared members makes the opposite claim, and `delete`
// breaks it — that boundary is what must keep catching the real defect this rule exists for:
// `RetryError` used to delete an own `cause` off `this`, and every instance paid the 9.6x row
// above. `this` in an ordinary class carries no index signature, so it stays reported.
//
// `Reflect.deleteProperty`'s target at `Patch.ts:318` resolves — verified directly against
// this repo's own `checker.getTypeAtLocation`, not assumed — to TypeScript's bare `object`
// keyword type after the surrounding `typeof x !== 'object'` / `Array.isArray(x)` narrowing:
//
//   function removeValue(...): void {
//     let current: unknown = target;
//     ...
//     if (current === null || typeof current !== 'object') { throw ...; }
//     if (Array.isArray(current)) { ...; } else { Reflect.deleteProperty(current, lastPart); }
//   }
//
// `checker.getIndexInfoOfType` returns `undefined` for both index kinds on that narrowed
// `object` type — it is NOT a `Record`. But `object` also has ZERO declared members
// (`TypeFlags.NonPrimitive`, TypeScript's "some non-primitive value, nothing else known"
// type): there is no fixed hidden-class contract for the engine to break, because the type
// system itself commits to no shape at that point. A `delete obj.x` MemberExpression could
// never reach this case — accessing a named property statically requires the type to declare
// one, which `object` does not — so this branch can only be reached through
// `Reflect.deleteProperty`'s untyped-key signature, exactly the RFC-6902 shape above.
//
// WITHOUT TYPE SERVICES this rule reports every delete, exactly as it always has — this is
// the opposite default from `dynamic-property-access`/`for-of-arrays`, which stay silent
// without types. Those rules stay quiet because SYNTAX ALONE cannot tell a safe array index
// from an unsafe object key, and guessing would manufacture false positives on arrays. This
// rule has no such ambiguity: every `delete` on a member expression already costs something
// (proven above, even for the 2.3x dynamic-record case), so reporting by default and lifting
// the report only on PROVEN dynamic-shape evidence is the conservative direction — the same
// blanket behavior this rule has always had, now narrowed by evidence instead of guesswork.

class DeletionTarget {
  /** The object being deleted FROM — `obj` in `delete obj.x` / `delete obj?.x`. */
  public static fromDeleteMemberExpression(node: Rule.Node): Rule.Node | undefined {
    if (!ObjectGuard.isObject(node)) {
      return undefined;
    }

    const argument = node.argument;

    if (!ObjectGuard.isObject(argument)) {
      return undefined;
    }

    if (argument.type === 'MemberExpression') {
      const result = ObjectGuard.isObject(argument.object) ? argument.object as unknown as Rule.Node : undefined;

      return result;
    }
    if (argument.type === 'ChainExpression') {
      const expression = argument.expression;

      if (!ObjectGuard.isObject(expression) || expression.type !== 'MemberExpression') {
        return undefined;
      }

      const result = ObjectGuard.isObject(expression.object) ? expression.object as unknown as Rule.Node : undefined;

      return result;
    }

    return undefined;
  }

  /** The object being deleted FROM — `obj` in `Reflect.deleteProperty(obj, 'x')`. */
  public static fromReflectDeletePropertyCall(node: Rule.Node): Rule.Node | undefined {
    if (!ObjectGuard.isObject(node)) {
      return undefined;
    }

    const argumentList = node.arguments;

    if (!ObjectGuard.isArray(argumentList)) {
      return undefined;
    }

    const target = argumentList.at(0);
    const result = ObjectGuard.isObject(target) ? target as unknown as Rule.Node : undefined;

    return result;
  }
}

class DynamicShapeClassification {
  /**
   * True when every meaningful constituent of `type` has already forfeited a fixed
   * hidden-class contract — either by declaring an index signature (string or number kind:
   * `Record<K, V>`, `{ [key: string]: T }`, an array/tuple's synthesized number index) or by
   * being TypeScript's bare `object` keyword type, which declares no members at all. Neither
   * shape has a fixed-property guarantee for `delete` to violate. Union-aware, matching
   * `dynamic-property-access`'s `ReceiverClassification`, so `Record<string, T> | undefined`
   * is still recognized.
   */
  public static isDynamicallyShaped(type: Type, checker: TypeChecker): boolean {
    const constituents = type.isUnion() ? type.types : [type];
    const constituentCount = constituents.length;
    let sawDynamicShape = false;

    for (let index = 0; index < constituentCount; index += 1) {
      const constituent = constituents[index];

      if (constituent === undefined) {
        continue;
      }
      if (DynamicShapeClassification.#isNullish(constituent, checker)) {
        continue;
      }
      if (!DynamicShapeClassification.#isSingleDynamicallyShapedType(constituent, checker)) {
        return false;
      }
      sawDynamicShape = true;
    }

    return sawDynamicShape;
  }

  static #isSingleDynamicallyShapedType(type: Type, checker: TypeChecker): boolean {
    if ((type.flags & TypeFlags.NonPrimitive) !== 0) {
      return true;
    }

    const stringIndex = checker.getIndexInfoOfType(type, IndexKind.String);
    const numberIndex = checker.getIndexInfoOfType(type, IndexKind.Number);
    const result = stringIndex !== undefined || numberIndex !== undefined;

    return result;
  }

  static #isNullish(type: Type, checker: TypeChecker): boolean {
    const text = checker.typeToString(type);
    const result = text === 'undefined' || text === 'null';

    return result;
  }
}

export const deleteProperty: Rule.RuleModule = {
  'create': (context) => {
    const reportUnlessDynamicallyShaped = (node: Rule.Node, target: Rule.Node | undefined): void => {
      if (target !== undefined) {
        const servicesUnknown: unknown = context.sourceCode.parserServices;

        if (AstHelpers.hasTypeServices(servicesUnknown)) {
          const tsNode = servicesUnknown.esTreeNodeToTSNodeMap.get(target);

          if (tsNode !== undefined) {
            const checker = servicesUnknown.program.getTypeChecker();
            const targetType = checker.getTypeAtLocation(tsNode);

            if (DynamicShapeClassification.isDynamicallyShaped(targetType, checker)) {
              return;
            }
          }
        }
      }

      context.report({
        'messageId': 'forbidden',
        'node': node
      });
    };

    const onDeleteMemberExpression = (node: Rule.Node): void => {
      reportUnlessDynamicallyShaped(node, DeletionTarget.fromDeleteMemberExpression(node));
    };

    const onReflectDeletePropertyCall = (node: Rule.Node): void => {
      reportUnlessDynamicallyShaped(node, DeletionTarget.fromReflectDeletePropertyCall(node));
    };

    return {
      'CallExpression[callee.object.name="Reflect"][callee.property.name="deleteProperty"]': onReflectDeletePropertyCall,
      'UnaryExpression[operator="delete"][argument.type="ChainExpression"][argument.expression.type="MemberExpression"]': onDeleteMemberExpression,
      'UnaryExpression[operator="delete"][argument.type="MemberExpression"]': onDeleteMemberExpression
    };
  },
  'meta': {
    'docs': {
      'description': 'delete on member expressions is forbidden. It breaks V8 optimizations.',
      'recommended': false
    },
    'messages': { 'forbidden': 'v8Optimization/deleteProperty: delete on member expressions is forbidden. It breaks V8 optimizations.' },
    'schema': [],
    'type': 'problem'
  }
};
