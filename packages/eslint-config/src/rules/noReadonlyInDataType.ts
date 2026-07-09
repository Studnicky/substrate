import type { Rule } from 'eslint';

import {
  getCombinedModifierFlags,
  ModifierFlags,
  type Program,
  type Symbol,
  type Type,
  type TypeChecker,
  type TypeReference
} from 'typescript';

/**
 * no-readonly-in-data-type — exported `type` aliases must not bake in `readonly`.
 *
 * Detection is driven by the TypeScript type checker, not syntax or name matching.
 * The checker resolves the alias's declared type and reports only when that type
 * provably bakes `readonly` into its own inline data structure. Generic
 * transformation types (mapped types like `DeepReadonlyType`, conditional types
 * like `DeepMergeType`) resolve to types with no concrete readonly members and are
 * therefore never flagged — with no name special-casing whatsoever. Types that
 * merely REFERENCE a readonly type are not flagged; recursion stops at named
 * type references (any type whose `aliasSymbol` is defined).
 *
 * The rule no-ops silently when no TypeScript program is available (projectService
 * not configured). There are no schema options.
 */

type AliasNodeType = {
  readonly 'id': object & { readonly 'name': string };
  readonly 'parent': { readonly 'type': string };
};

type ParserServicesType = {
  readonly 'getSymbolAtLocation': (node: unknown) => Symbol | undefined;
  readonly 'program': Program;
};

type SourceCodeServicesAccessorType = {
  readonly 'parserServices'?: ParserServicesType;
};

class ContextHelpers {
  public static getServices(context: Rule.RuleContext): ParserServicesType | undefined {
    const result = (context.sourceCode as unknown as SourceCodeServicesAccessorType).parserServices;
    return result;
  }
}

/**
 * Controls recursion depth — descend into the alias's own inline shapes but stop
 * at named references. A named reference (aliasSymbol defined) means the shape
 * lives in another alias; we never cross that boundary to avoid false positives
 * on types that merely COMPOSE with a readonly type.
 */
const isInlineStructural = (checker: TypeChecker, t: Type): boolean => {
  if (t.aliasSymbol !== undefined) { return false; }
  if (checker.isArrayType(t) || checker.isTupleType(t)) { return true; }
  if (t.isUnionOrIntersection()) { return true; }
  const s = t.getSymbol();
  return s?.getName() === '__type';
};

/**
 * Returns true when `type` provably bakes `readonly` into its own inline
 * data structure. Does NOT cross named type alias boundaries (isInlineStructural
 * gates all recursion). The visited Set prevents cycles on self-recursive types.
 */
const bakesReadonly = (checker: TypeChecker, type: Type, visited: Set<Type>): boolean => {
  if (visited.has(type)) { return false; }
  visited.add(type);

  if (type.isUnionOrIntersection()) {
    const unionTypes = type.types;
    const len = unionTypes.length;
    for (let i = 0; i < len; i++) {
      if (bakesReadonly(checker, unionTypes[i]!, visited)) { return true; }
    }
    return false;
  }

  if (checker.isArrayType(type)) {
    const indexInfos = checker.getIndexInfosOfType(type);
    const iiLen = indexInfos.length;
    for (let i = 0; i < iiLen; i++) {
      if (indexInfos[i]!.isReadonly) { return true; }
    }
    const typeArgs = checker.getTypeArguments(type as unknown as TypeReference);
    const taLen = typeArgs.length;
    for (let i = 0; i < taLen; i++) {
      const a = typeArgs[i]!;
      if (isInlineStructural(checker, a) && bakesReadonly(checker, a, visited)) { return true; }
    }
    return false;
  }

  if (checker.isTupleType(type)) {
    const tupleTarget = type as unknown as { readonly 'target': { readonly 'readonly': boolean } };
    if (tupleTarget.target.readonly) { return true; }
    const typeArgs = checker.getTypeArguments(type as unknown as TypeReference);
    const taLen = typeArgs.length;
    for (let i = 0; i < taLen; i++) {
      const a = typeArgs[i]!;
      if (isInlineStructural(checker, a) && bakesReadonly(checker, a, visited)) { return true; }
    }
    return false;
  }

  // Non-array, non-tuple type: check index infos for readonly index signatures.
  const indexInfos = checker.getIndexInfosOfType(type);
  const iiLen = indexInfos.length;
  for (let i = 0; i < iiLen; i++) {
    if (indexInfos[i]!.isReadonly) { return true; }
  }

  // Check each property for a readonly modifier or a readonly inline type.
  const props = type.getProperties();
  const propsLen = props.length;
  for (let i = 0; i < propsLen; i++) {
    const p = props[i]!;
    if (p.valueDeclaration !== undefined) {
      if ((getCombinedModifierFlags(p.valueDeclaration) & ModifierFlags.Readonly) !== 0) {
        return true;
      }
      const pt = checker.getTypeOfSymbolAtLocation(p, p.valueDeclaration);
      if (isInlineStructural(checker, pt) && bakesReadonly(checker, pt, visited)) { return true; }
    }
  }

  return false;
};

const isReadonlyOffender = (obj: Record<string, unknown>): boolean => {
  const nodeType = obj.type;
  const readonlyProp = obj.readonly;
  const operatorProp = obj.operator;

  if (nodeType === 'TSPropertySignature') { return readonlyProp === true; }
  if (nodeType === 'TSIndexSignature') { return readonlyProp === true; }
  if (nodeType === 'TSTypeOperator') { return operatorProp === 'readonly'; }
  if (nodeType === 'TSMappedType') { return readonlyProp === true || readonlyProp === '+'; }

  return false;
};

/**
 * Collects every AST node bearing a `readonly` modifier within the alias
 * declaration. Skips `checkType` and `extendsType` of `TSConditionalType` nodes
 * because those positions hold structural type guards (e.g. `A extends readonly
 * unknown[]`) whose `readonly` must not be removed — it constrains the narrowing,
 * not the alias's own data shape.
 */
const collectOffenders = (node: unknown, result: Rule.Node[]): void => {
  if (node === null || node === undefined || typeof node !== 'object') { return; }

  if (Array.isArray(node)) {
    const len = node.length;
    for (let i = 0; i < len; i++) {
      collectOffenders(node[i], result);
    }
    return;
  }

  const obj = node as Record<string, unknown>;

  if (isReadonlyOffender(obj)) {
    result.push(node as unknown as Rule.Node);
  }

  const isTSConditionalType = obj.type === 'TSConditionalType';
  const keys = Object.keys(obj);
  const keysLen = keys.length;

  for (let i = 0; i < keysLen; i++) {
    const key = keys[i];
    if (key === undefined) { continue; }
    if (key === 'parent' || key === 'loc' || key === 'range') { continue; }
    if (isTSConditionalType && (key === 'checkType' || key === 'extendsType')) { continue; }
    collectOffenders(obj[key], result);
  }
};

class ReadonlyTokenFilter {
  public static matches(t: unknown): boolean {
    if (t === null || typeof t !== 'object') { return false; }
    const tokenValue = (t as Record<string, unknown>).value;
    return tokenValue === 'readonly';
  }
}

class ReadonlyRemoveFix {
  public static make(startPos: number, nextStart: number): (fixer: Rule.RuleFixer) => Rule.Fix | null {
    return (fixer: Rule.RuleFixer) => {
      const start = startPos;
      const end = nextStart;
      const fix = fixer.removeRange([start, end]);
      return fix;
    };
  }
}

export const noReadonlyInDataType: Rule.RuleModule = {
  'create': (context) => {
    const { sourceCode } = context;
    const services = ContextHelpers.getServices(context);

    if (services?.program === undefined) {
      return {};
    }

    const checker = services.program.getTypeChecker();

    const onTSTypeAliasDeclaration = (node: Rule.Node): void => {
      const rawNode = node as unknown as AliasNodeType;

      if (rawNode.parent.type !== 'ExportNamedDeclaration') { return; }

      const symbol = services.getSymbolAtLocation(rawNode.id);
      if (symbol === undefined) { return; }

      const type = checker.getDeclaredTypeOfSymbol(symbol);

      if (!bakesReadonly(checker, type, new Set())) { return; }

      const offenders: Rule.Node[] = [];
      collectOffenders(node, offenders);

      const name = rawNode.id.name;

      const reportOffender = (offender: Rule.Node): void => {
        const readonlyToken = sourceCode.getFirstToken(offender, {
          'filter': ReadonlyTokenFilter.matches
        });
        if (readonlyToken === null) { return; }

        const nextToken = sourceCode.getTokenAfter(readonlyToken);
        if (nextToken === null) { return; }

        const prevToken = sourceCode.getTokenBefore(readonlyToken);
        let startPos = 0;
        if (prevToken !== null) {
          const prevObj = prevToken as unknown as Record<string, unknown>;
          const pv = prevObj.value;
          if (pv === '+') {
            const pRange = prevObj.range as [number, number] | undefined;
            const [pStart] = pRange ?? [0];
            if (pStart !== undefined && pStart !== 0) {
              startPos = pStart;
            }
          }
        }
        if (startPos === 0) {
          const rtObj = readonlyToken as unknown as Record<string, unknown>;
          const rtRange = rtObj.range as [number, number] | undefined;
          const [rtStart] = rtRange ?? [0];
          if (rtStart !== undefined) {
            startPos = rtStart;
          }
        }

        const ntObj = nextToken as unknown as Record<string, unknown>;
        const ntRange = ntObj.range as [number, number] | undefined;
        const [ntStart] = ntRange ?? [0];
        const nextStart = ntStart ?? 0;

        context.report({
          'data': { 'name': name },
          'fix': ReadonlyRemoveFix.make(startPos, nextStart),
          'messageId': 'noReadonly',
          'node': offender
        });
      };

      offenders.forEach(reportOffender);
    };

    return {
      'TSTypeAliasDeclaration': onTSTypeAliasDeclaration
    };
  },
  'meta': {
    'docs': {
      'description':
        'Exported data type aliases must not bake in `readonly` modifiers. A `type` describes shape, not access policy — consumers declare immutability at the use site.'
    },
    'fixable': 'code',
    'messages': {
      'noReadonly':
        "Exported data type '{{name}}' bakes in `readonly`. A `type` describes shape, not access policy — consumers declare immutability at the use site (`readonly`, `Readonly<T>`, `DeepReadonlyType<T>`)."
    },
    'schema': [],
    'type': 'problem'
  }
};
