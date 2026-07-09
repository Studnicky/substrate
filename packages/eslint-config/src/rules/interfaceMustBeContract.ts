import type { Rule } from 'eslint';

import {
  IndexKind,
  type Program,
  type Symbol,
  SymbolFlags,
  type Type,
  type TypeChecker,
  TypeFlags,
  type TypeReference
} from 'typescript';

/**
 * interface-must-be-contract — interfaces express runtime contracts, not data.
 *
 * The law: a `type` is JSON-serializable and validatable (schema-derived); an
 * `interface` is a runtime contract that carries the members a type cannot —
 * functions, constructors, and references to class instances. An interface
 * whose every member is JSON-serializable is a data shape wearing the wrong
 * keyword and must be declared as a schema-derived `type XxxType` in an entity
 * instead.
 *
 * Serializability is resolved through the TypeScript type checker, not syntax.
 * An interface is a legitimate contract when it has a call/construct signature,
 * or when any property or index type resolves to a non-serializable type: a
 * function or constructor type, a class instance (a symbol bearing
 * `SymbolFlags.Class`, which transitively covers `Date`, `Map`, `Set`,
 * `Promise`, and the like, since their members carry methods), or `any` /
 * `unknown`. A property whose annotation is a named reference is judged by what
 * that name resolves to — a reference to a pure-data type is itself data; a
 * reference to a class is a contract signal. Type parameters (`T`) are
 * serializable placeholders, so `interface Box<T> { v: T }` is a data shape.
 */

const isObject = (value: unknown): value is Record<string, unknown> => {
  return value !== null && value !== undefined && typeof value === 'object' && !Array.isArray(value);
};

// `Array.isArray` narrows to `any[]` per its lib.es5.d.ts signature; this
// guard reasserts the narrowed type as `unknown[]` so callers stay type-safe.
const isUnknownArray = (value: unknown): value is unknown[] => {
  if (!Array.isArray(value)) { return false; }
  return true;
};

type ParserServicesType = {
  readonly 'getSymbolAtLocation': (node: unknown) => Symbol | undefined;
  readonly 'getTypeAtLocation': (node: unknown) => Type;
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

const isSerializable = (type: Type, checker: TypeChecker, visited: Set<Type>): boolean => {
  if (visited.has(type)) { return true; }
  visited.add(type);

  const { flags } = type;

  // Serializable primitives and type parameters
  if (
    (flags & TypeFlags.String) !== 0 ||
    (flags & TypeFlags.Number) !== 0 ||
    (flags & TypeFlags.Boolean) !== 0 ||
    (flags & TypeFlags.BigInt) !== 0 ||
    (flags & TypeFlags.StringLiteral) !== 0 ||
    (flags & TypeFlags.NumberLiteral) !== 0 ||
    (flags & TypeFlags.BooleanLiteral) !== 0 ||
    (flags & TypeFlags.BigIntLiteral) !== 0 ||
    (flags & TypeFlags.EnumLike) !== 0 ||
    (flags & TypeFlags.Null) !== 0 ||
    (flags & TypeFlags.Undefined) !== 0 ||
    (flags & TypeFlags.TypeParameter) !== 0
  ) {
    return true;
  }

  // Non-serializable
  if (
    (flags & TypeFlags.Any) !== 0 ||
    (flags & TypeFlags.Unknown) !== 0 ||
    (flags & TypeFlags.Void) !== 0 ||
    (flags & TypeFlags.Never) !== 0 ||
    (flags & TypeFlags.ESSymbol) !== 0 ||
    (flags & TypeFlags.UniqueESSymbol) !== 0
  ) {
    return false;
  }

  // Union: serializable iff every constituent is serializable
  if (type.isUnion()) {
    const unionTypes = type.types;
    const unionLength = unionTypes.length;
    for (let i = 0; i < unionLength; i++) {
      if (!isSerializable(unionTypes[i]!, checker, visited)) { return false; }
    }
    return true;
  }

  // Intersection: serializable iff every constituent is serializable
  if (type.isIntersection()) {
    const intersectionTypes = type.types;
    const intersectionLength = intersectionTypes.length;
    for (let i = 0; i < intersectionLength; i++) {
      if (!isSerializable(intersectionTypes[i]!, checker, visited)) { return false; }
    }
    return true;
  }

  // Array / ReadonlyArray
  if (checker.isArrayType(type)) {
    const typeArgs = checker.getTypeArguments(type as unknown as TypeReference);
    const typeArgsLength = typeArgs.length;
    for (let i = 0; i < typeArgsLength; i++) {
      if (!isSerializable(typeArgs[i]!, checker, visited)) { return false; }
    }
    return true;
  }

  // Tuple
  if (checker.isTupleType(type)) {
    const typeArgs = checker.getTypeArguments(type as unknown as TypeReference);
    const typeArgsLength = typeArgs.length;
    for (let i = 0; i < typeArgsLength; i++) {
      if (!isSerializable(typeArgs[i]!, checker, visited)) { return false; }
    }
    return true;
  }

  // Object types (plain objects, interfaces, type literals, classes)
  if ((flags & TypeFlags.Object) !== 0) {
    if (type.getCallSignatures().length > 0) { return false; }
    if (type.getConstructSignatures().length > 0) { return false; }

    const symbol = type.getSymbol();
    if (symbol !== undefined && (symbol.flags & SymbolFlags.Class) !== 0) { return false; }

    const props = type.getProperties();
    const propsLength = props.length;

    for (let i = 0; i < propsLength; i++) {
      const prop = props[i]!;
      const decl = prop.valueDeclaration ?? prop.declarations?.[0];
      if (decl === undefined) { return false; }
      const propType = checker.getTypeOfSymbolAtLocation(prop, decl);
      if (!isSerializable(propType, checker, visited)) { return false; }
    }

    const stringIndexType = checker.getIndexTypeOfType(type, IndexKind.String);
    if (stringIndexType !== undefined && !isSerializable(stringIndexType, checker, visited)) {
      return false;
    }

    const numberIndexType = checker.getIndexTypeOfType(type, IndexKind.Number);
    if (numberIndexType !== undefined && !isSerializable(numberIndexType, checker, visited)) {
      return false;
    }

    return true;
  }

  return false;
};

type InterfaceNode = {
  readonly 'body': { readonly 'body': readonly unknown[]; readonly 'range': [number, number] };
  readonly 'extends': readonly { readonly 'range': [number, number] }[] | undefined;
  readonly 'id': { readonly 'name': string; readonly 'range': [number, number] };
  readonly 'parent': unknown;
  readonly 'range': [number, number];
  readonly 'typeParameters': { readonly 'range': [number, number] } | undefined;
};

class OptionsAllow {
  static get(options: unknown[]): string[] {
    const first = options[0];
    if (first !== null && first !== undefined && typeof first === 'object') {
      const obj = first as Record<string, unknown>;
      const allow = obj.allow;
      if (Array.isArray(allow)) {
        return allow;
      }
    }
    return [];
  }
}

class InterfaceMerged {
  static check(sourceCode: Rule.RuleContext['sourceCode'], node: Rule.Node, name: string): boolean {
    const vars = sourceCode.getDeclaredVariables(node);
    const varsLength = vars.length;

    for (let index = 0; index < varsLength; index++) {
      const variable = vars[index];

      if (variable !== null && variable !== undefined) {
        const varAny = variable as unknown as Record<string, unknown>;
        const defs = varAny.defs;
        if (Array.isArray(defs) && defs.length > 1) {
          return true;
        }
      }
    }
    const program = sourceCode.ast;
    if (!isObject(program)) { return false; }

    const programObj = program as Record<string, unknown>;
    const body = programObj.body;
    if (!isUnknownArray(body)) { return false; }

    const bodyLength = body.length;
    let sameNameCount = 0;

    for (let index = 0; index < bodyLength; index++) {
      const bodyNode = body[index];

      if (!isObject(bodyNode)) { continue; }
      const nodeType = bodyNode.type;
      if (nodeType === 'TSInterfaceDeclaration') {
        const nodeId = bodyNode.id;
        if (isObject(nodeId)) {
          const nodeName = nodeId.name;
          if (nodeName === name) {
            sameNameCount++;
          }
        }
      }
    }

    return sameNameCount > 1;
  }
}

export const interfaceMustBeContract: Rule.RuleModule = {
  'create': (context) => {
    const allow = new Set(OptionsAllow.get(context.options));
    const { sourceCode } = context;

    const services = ContextHelpers.getServices(context);

    if (services?.program === undefined) {
      return {};
    }

    const checker = services.program.getTypeChecker();

    // Global/module augmentation: an interface inside `declare global { ... }`
    // or `declare module '...' { ... }` cannot become a `type` alias.
    const isAugmentation = (parent: unknown): boolean => {
      let current = parent;

      while (isObject(current)) {
        if (current.type === 'TSModuleDeclaration') { return true; }
        current = current.parent;
      }

      return false;
    };

    const isInterfaceKeyword = (token: unknown): boolean => {
      return isObject(token) && token.value === 'interface';
    };
    const fixInterface = (node: Rule.Node, rawNode: InterfaceNode): NonNullable<Rule.ReportDescriptor['fix']> => {
      return (fixer): Rule.Fix[] | null => {
        const fixes: Rule.Fix[] = [];

        // Replace the `interface` keyword with `type`. Target the keyword token
        // specifically — not the first token — so a leading `declare` modifier
        // (`declare interface Foo`) is preserved, producing `declare type Foo`.
        const interfaceToken = sourceCode.getFirstToken(node, {
          'filter': isInterfaceKeyword
        });
        if (interfaceToken === null) { return null; }
        fixes.push(fixer.replaceText(interfaceToken, 'type'));

        // The anchor after which ` =` is inserted (or the extends clause is
        // replaced) — type parameters if present, otherwise the name.
        const afterName = rawNode.typeParameters ?? rawNode.id;
        const extendsClause = rawNode.extends;

        if (extendsClause !== undefined && extendsClause.length > 0) {
          // Replace the ` extends ... ` span with ` = `, dropping the extends
          // clause and inserting the assignment token in one fix.
          const [_afterNameStart, afterNameEnd] = afterName.range;
          const [bodyStart, _bodyEnd] = rawNode.body.range;
          fixes.push(fixer.replaceTextRange([afterNameEnd, bodyStart], ' = '));

          // Append ` & Heritage1 & Heritage2;` after the closing brace.
          const source = sourceCode.getText();
          let heritageText = '';

          extendsClause.forEach((heritage) => {
            if (heritage === undefined) { return; }
            const [heritageStart, heritageEnd] = heritage.range;
            heritageText = `${heritageText} & ${source.slice(heritageStart, heritageEnd)}`;
          });
          fixes.push(fixer.insertTextAfterRange(rawNode.body.range, `${heritageText};`));
          return fixes;
        }

        // No heritage: insert ` =` after the name/type params (the original
        // space before `{` is preserved, producing `type Foo = {`), then append
        // the terminating semicolon after the closing brace.
        fixes.push(fixer.insertTextAfterRange(afterName.range, ' ='));
        fixes.push(fixer.insertTextAfterRange(rawNode.body.range, ';'));
        return fixes;
      };
    };

    const visitTSInterfaceDeclaration = (node: Rule.Node) => {
      const rawNode = node as unknown as InterfaceNode;
      const nodeId = rawNode.id;

      if (allow.has(nodeId.name)) { return; }

      const symbolAtId = services.getSymbolAtLocation(nodeId);
      const interfaceType = symbolAtId !== undefined && symbolAtId !== null
        ? checker.getDeclaredTypeOfSymbol(symbolAtId)
        : services.getTypeAtLocation(node);

      // Contract signals: call/construct signatures
      if (interfaceType.getCallSignatures().length > 0) { return; }
      if (interfaceType.getConstructSignatures().length > 0) { return; }

      // Empty interfaces are the standard consumer-declaration-merge idiom
      // (`interface Foo {}`, meant for a downstream `declare module` to merge
      // members into later). A rewrite to `type Foo = {}` is never an
      // improvement (there is no shape to preserve) and would permanently
      // remove the interface's ability to be merged into by any consumer —
      // exactly the kind of destructive autofix a "pure JSON data shape"
      // check must never produce for a declaration with no members to judge.
      if (rawNode.body.body.length === 0) { return; }

      // Check all properties
      const props = interfaceType.getProperties();

      for (const prop of props) {
        const decl = prop.valueDeclaration ?? prop.declarations?.at(0);
        if (decl === undefined) { return; }
        const propType = checker.getTypeOfSymbolAtLocation(prop, decl);
        if (!isSerializable(propType, checker, new Set())) { return; }
      }

      // Check index types
      const stringIndexType = checker.getIndexTypeOfType(interfaceType, IndexKind.String);
      if (stringIndexType !== undefined && !isSerializable(stringIndexType, checker, new Set())) { return; }

      const numberIndexType = checker.getIndexTypeOfType(interfaceType, IndexKind.Number);
      if (numberIndexType !== undefined && !isSerializable(numberIndexType, checker, new Set())) { return; }

      const interfaceName = nodeId.name;
      const nodeParent = rawNode.parent;
      // Declaration merging: a `type` alias cannot merge, so converting a merged
      // interface would produce a duplicate-identifier TS error. Detect a merge
      // via the scope variable's def count, with a top-level AST scan as fallback.
      const canFix = !InterfaceMerged.check(sourceCode, node, interfaceName) && !isAugmentation(nodeParent);

      context.report({
        'data': { 'name': interfaceName },
        'fix': canFix ? fixInterface(node, rawNode) : null,
        'messageId': 'dataShapeMustBeType',
        'node': node
      });
    };

    return {
      'TSInterfaceDeclaration': visitTSInterfaceDeclaration
    };
  },
  'meta': {
    'docs': {
      'description':
        'Interfaces express runtime contracts (functions, constructors, class references). A pure JSON-serializable data shape must be a schema-derived `type XxxType`, not an `interface`.'
    },
    'fixable': 'code',
    'messages': {
      'dataShapeMustBeType':
        "Interface '{{name}}' resolves to a fully JSON-serializable data shape with no contract signal (no call/construct signature, and no member typed as a function, constructor, or class instance). Data shapes must be declared as a schema-derived `type {{name}}Type` in an entity; `interface` is reserved for runtime contracts. The autofix only performs the mechanical interface-to-type rewrite — it does not (and cannot) move the result into an entity namespace for you. If `all-types-are-entities` is enabled, expect that rule to immediately flag the autofixed type alias; finishing the move into an entity is a required manual step, not a bug in either rule."
    },
    'schema': [
      {
        'additionalProperties': false,
        'properties': {
          'allow': {
            'items': { 'type': 'string' },
            'type': 'array'
          }
        },
        'type': 'object'
      }
    ],
    'type': 'problem'
  }
};
