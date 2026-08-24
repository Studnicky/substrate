import type { Rule } from 'eslint';
import type ts from 'typescript';

import { AstHelpers } from '../shared/astHelpers.js';
import { ObjectGuard } from '../shared/ObjectGuard.js';
import {
  INDEXED_COLLECTION_NAMES, MESSAGE, RULE_NAME
} from './constants/DynamicPropertyAccessConstants.js';

// WHY THIS RULE IS SCOPED THE WAY IT IS — measured, not asserted.
//
// The hazard is real but narrow: assigning VARIABLE string keys to a PLAIN OBJECT
// drives it out of fast properties into dictionary mode, after which every access on
// that object degrades from an inline-cached lookup to a hash lookup.
//
//   node --allow-natives-syntax
//   const o = {}; for (let i = 0; i < 200; i++) { o['k' + i] = i; }
//   %HasFastProperties(o)                                    -> false   <-- the hazard
//   const a = []; for (let i = 0; i < 200; i++) { a[i] = i; }
//   %HasFastProperties(a)                                    -> true
//   const t = new Float64Array(200); for (...) { t[i] = i; }
//   %HasFastProperties(t)                                    -> true
//
// Three exemptions follow from measurement, and each was previously absent:
//
// 1. LITERAL KEYS. A prior revision of this rule claimed "the engine does not
//    special-case a computed access just because the key happens to be a literal."
//    That is false. V8 folds a literal computed key at bytecode generation:
//
//      node --print-bytecode --print-bytecode-filter=f
//      function f(o) { return o.foo; }     -> GetNamedProperty a0, [0], [0]
//      function g(o) { return o['foo']; }  -> GetNamedProperty a0, [0], [0]
//
//    Byte-identical: same opcode, same operands, same constant-pool entry, same
//    feedback slot. Measured at 5e7 iterations they are also indistinguishable
//    (17.7ms vs 17.7ms). A literal key is a dot access; there is nothing to report.
//
// 2. INDEXED COLLECTIONS (arrays, tuples, typed arrays, DataView, strings). Hidden
//    classes describe NAMED properties, held in the descriptor array. Indexed
//    properties live in a separate elements backing store keyed by elements kind, so
//    indexed access cannot "break hidden classes" — the map pointer is unchanged
//    across indexed writes (`%DebugPrint` shows an identical `- map:` and
//    `- elements:` before and after). Flagging this was not merely harmless noise: it
//    removed the FASTEST way to iterate an array and left only slower ones. At
//    5,000,000 elements:
//
//      a[i]  index loop                      3.9 ms   1.00x   <-- was banned
//      for (const v of a)                   26.9 ms   6.85x   (banned by for-of-arrays)
//      a.at(i)  index loop                   6.5 ms   1.66x
//      a.forEach(...)                       21.5 ms   5.46x
//      a.reduce(...)                        23.3 ms   5.94x
//      for (const [,v] of a.entries())      35.2 ms   8.97x
//
//    On a Float64Array the gap is far worse: `t[i]` 3.2ms vs `t.at(i)` 92.9ms —
//    28.92x. A rule in the `v8Optimization/` family must not mandate the slow path.
//
// 3. WELL-KNOWN SYMBOLS. `[Symbol.iterator]` has NO non-computed spelling in
//    JavaScript. Flagging it made implementing an iterable impossible — see
//    packages/errors/src/errors/ValidationErrors.ts, real production code that
//    previously lint-clean. A well-known symbol is a compile-time constant, not a
//    dynamic key.
//
// WRITES ONLY, BECAUSE THAT IS WHAT THE MEASUREMENT ABOVE COVERS.
//
// The documented hazard is a variable-key ASSIGNMENT driving a plain object into dictionary
// mode. A READ cannot cause that transition — `%HasFastProperties` is unchanged by
// `o[k]` in an expression position — so reporting reads flagged sites that could not exhibit
// the hazard this rule exists to prevent.
//
// That over-reach had a cost. A read in `packages/json/src/json/StructuralHash.ts` was
// "fixed" by rewriting `value[key]` as `Reflect.get(value, key)`, which does not remove the
// dynamic key at all — it only spells it in a form the rule did not pattern-match. Measured
// over a realistic object walk at 200,000 iterations the two are indistinguishable
// (75.3ms vs 73.0ms, 0.97x), so the rewrite bought nothing and obscured the call site. The
// remedy this rule's message names is a `Map`, and a read of a plain JSON object arriving
// from `JSON.parse` cannot become one; `Object.entries` — the other obvious rewrite — is
// 5.80x SLOWER (437.0ms) because it allocates a pair array per walk.
//
// So the rule reports assignment targets, updates (`o[k]++`), `delete o[k]`, and
// destructuring targets. Reads are silent.
//
// PAIRED RULES — change these together, they are designed to interlock:
//   * `v8/for-of-arrays` mandates index loops (6.85x, measured above). This rule must
//     therefore keep `a[i]` legal or the two jointly forbid every fast option.
//   * `prefer-collection-types` pushes dynamic-key lookups toward `Map`. That is the
//     same remedy this rule's message names, deliberately.
//
// WITHOUT TYPE SERVICES this rule reports nothing beyond the literal/symbol checks.
// An identifier's type cannot be guessed from the AST, and guessing here would
// reintroduce exactly the array false positives documented above. Same posture as
// `forOfArrays.ts`: the type-checker is authoritative, or the rule stays quiet.

class KeyClassification {
  /**
   * A key that V8 resolves statically: a string/numeric literal (folded to
   * `GetNamedProperty`, identical to dot access) or a well-known symbol such as
   * `Symbol.iterator` (a compile-time constant with no alternative spelling).
   */
  public static isStaticKey(property: unknown): boolean {
    const nodeType = AstHelpers.getNodeType(property);

    if (nodeType === 'Literal') {
      return true;
    }

    if (nodeType !== 'MemberExpression' || !ObjectGuard.isObject(property)) {
      return false;
    }

    const result = AstHelpers.getIdentifierName(property.object) === 'Symbol';

    return result;
  }
}

class ReceiverClassification {
  /**
   * True when every meaningful constituent of `type` is an indexed collection, whose
   * element access goes to the elements store rather than the hidden class.
   * Union-aware so `readonly number[] | undefined` is still recognized.
   */
  public static isIndexedCollection(type: ts.Type, checker: ts.TypeChecker): boolean {
    const constituents = type.isUnion() ? type.types : [type];
    const constituentCount = constituents.length;
    let sawCollection = false;

    for (let index = 0; index < constituentCount; index += 1) {
      const constituent = constituents[index];

      if (constituent === undefined) {
        continue;
      }
      if (ReceiverClassification.#isNullish(constituent, checker)) {
        continue;
      }
      if (!ReceiverClassification.#isSingleIndexedCollection(constituent, checker)) {
        return false;
      }
      sawCollection = true;
    }

    return sawCollection;
  }

  static #isSingleIndexedCollection(type: ts.Type, checker: ts.TypeChecker): boolean {
    if (checker.isArrayType(type) || checker.isTupleType(type)) {
      return true;
    }

    const name = ReceiverClassification.#symbolName(type, checker);

    if (name === undefined) {
      return false;
    }

    const result = INDEXED_COLLECTION_NAMES.has(name) || name === 'String';

    return result;
  }

  static #isNullish(type: ts.Type, checker: ts.TypeChecker): boolean {
    const text = checker.typeToString(type);
    const result = text === 'undefined' || text === 'null';

    return result;
  }

  static #symbolName(type: ts.Type, checker: ts.TypeChecker): string | undefined {
    const direct = type.getSymbol()?.getName();

    if (direct !== undefined) {
      return direct;
    }

    const result = checker.getApparentType(type).getSymbol()
      ?.getName();

    return result;
  }
}

class PropertyOperation {
  /**
   * True when this computed access WRITES to the receiver: an assignment target, an
   * update (`o[k]++`), or a `delete`. Everything else is a read.
   */
  public static isWrite(node: Rule.Node): boolean {
    const parent: Rule.Node | undefined = node.parent ?? undefined;

    if (parent === undefined) {
      return false;
    }
    const raw = parent as unknown as Record<string, unknown>;

    if (raw.type === 'AssignmentExpression') {
      const result = raw.left === node;
      return result;
    }

    if (raw.type === 'UpdateExpression') {
      const result = raw.argument === node;
      return result;
    }

    if (raw.type === 'UnaryExpression') {
      const result = raw.operator === 'delete' && raw.argument === node;
      return result;
    }

    // A destructuring target: `[o[k]] = xs` / `({ a: o[k] } = obj)`.
    const result = raw.type === 'ArrayPattern' || raw.type === 'ObjectPattern' || raw.type === 'Property' && raw.value === node && PropertyOperation.#inPattern(parent);

    return result;
  }

  static #inPattern(node: Rule.Node): boolean {
    let current: Rule.Node | undefined = node.parent ?? undefined;

    while (current !== undefined) {
      const raw = current as unknown as Record<string, unknown>;

      if (raw.type === 'ObjectPattern' || raw.type === 'ArrayPattern') {
        return true;
      }
      if (raw.type === 'AssignmentExpression' || raw.type === 'VariableDeclarator') {
        return false;
      }
      current = current.parent ?? undefined;
    }

    return false;
  }
}

export const dynamicPropertyAccess: Rule.RuleModule = {
  'create': (context) => {
    const onMemberExpression = (node: Rule.Node): void => {
      if (!ObjectGuard.isObject(node)) {
        return;
      }
      if (node.computed !== true) {
        return;
      }
      if (KeyClassification.isStaticKey(node.property)) {
        return;
      }
      if (!PropertyOperation.isWrite(node)) {
        return;
      }

      const servicesUnknown: unknown = context.sourceCode.parserServices;

      if (!AstHelpers.hasTypeServices(servicesUnknown)) {
        return;
      }

      const tsNode = servicesUnknown.esTreeNodeToTSNodeMap.get(node.object);

      if (tsNode === undefined) {
        return;
      }

      const checker = servicesUnknown.program.getTypeChecker();
      const receiverType = checker.getTypeAtLocation(tsNode);

      if (ReceiverClassification.isIndexedCollection(receiverType, checker)) {
        return;
      }

      context.report({
        'messageId': 'forbidden',
        'node': node
      });
    };

    return { 'MemberExpression[computed=true]': onMemberExpression };
  },
  'meta': {
    'docs': {
      'description': MESSAGE,
      'recommended': false
    },
    'messages': { 'forbidden': `${RULE_NAME}: ${MESSAGE}` },
    'schema': [],
    'type': 'problem'
  }
};
