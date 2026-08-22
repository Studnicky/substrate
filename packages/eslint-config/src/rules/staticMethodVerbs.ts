import type { Rule } from 'eslint';
import type {
  FromSchema, JSONSchema
} from 'json-schema-to-ts';
import type {
  Program, Symbol, Type
} from 'typescript';

import {
  DEFAULT_MODE, TRIVIAL_OPTIONS
} from './constants/StaticMethodVerbsConstants.js';
import { ObjectGuard } from './shared/ObjectGuard.js';
import { TrivialExpression } from './shared/TrivialExpression.js';

namespace StaticMethodVerbsOptionsEntity {
  export const Schema = {
    'additionalProperties': false,
    'properties': {
      'mode': {
        'default': 'structural',
        'description': 'Detection mode: "any" flags every module-scope function; "structural" exempts trivial pass-through bodies (already covered by inline-trivial-logic); "typed" flags only functions whose return type is a named type/interface (requires type-aware parser services).',
        'enum': [
          'any',
          'structural',
          'typed'
        ],
        'type': 'string'
      }
    },
    'type': 'object'
  } as const satisfies JSONSchema;

  export type Type = FromSchema<typeof Schema>;
}

interface ParserServicesInterface {
  readonly 'getSymbolAtLocation': (node: unknown) => Symbol | undefined;
  readonly 'getTypeAtLocation': (node: unknown) => Type;
  readonly 'program': Program;
}

interface SourceCodeServicesAccessorInterface {
  readonly 'parserServices'?: ParserServicesInterface;
}

class ParserServicesGuard {
  public static hasTypeInformation(value: unknown): value is ParserServicesInterface {
    if (!ObjectGuard.isObject(value)) {
      return false;
    }
    if (typeof value.getSymbolAtLocation !== 'function' || typeof value.getTypeAtLocation !== 'function') {
      return false;
    }
    const result = ObjectGuard.isObject(value.program) && typeof value.program.getTypeChecker === 'function';

    return result;
  }
}

class ContextHelpers {
  public static getServices(context: Rule.RuleContext): ParserServicesInterface | undefined {
    const sourceCode: SourceCodeServicesAccessorInterface = context.sourceCode;
    const services: unknown = sourceCode.parserServices;
    const result = ParserServicesGuard.hasTypeInformation(services) ? services : undefined;

    return result;
  }
}

class AstHelpers {
  /**
   * A declaration is module-scope when its nearest non-export-wrapper container is a `Program`
   * — directly, or through an `export`/`export default` wrapper. A `namespace`/`module` body
   * (`TSModuleBlock`) is transparent the same way: `namespace Utils { export function f() {} }`
   * is a freestanding function at module scope in every way that matters here, just wrapped one
   * extra layer deeper. Recurses through arbitrarily nested namespaces and export wrappers.
   */
  public static isModuleScopeContainer(container: unknown): boolean {
    if (!ObjectGuard.isObject(container)) {
      return false;
    }
    if (container.type === 'Program') {
      return true;
    }

    if (container.type === 'ExportNamedDeclaration' || container.type === 'ExportDefaultDeclaration') {
      const result = AstHelpers.isModuleScopeContainer((container as { readonly 'parent'?: unknown }).parent);

      return result;
    }

    if (container.type === 'TSModuleBlock') {
      const moduleDeclaration = (container as { readonly 'parent'?: unknown }).parent;

      if (!ObjectGuard.isObject(moduleDeclaration) || moduleDeclaration.type !== 'TSModuleDeclaration') {
        return false;
      }
      const result = AstHelpers.isModuleScopeContainer((moduleDeclaration as { readonly 'parent'?: unknown }).parent);

      return result;
    }

    return false;
  }

  public static isFunctionInit(init: unknown): boolean {
    if (!ObjectGuard.isObject(init)) {
      return false;
    }
    const t = init.type;
    const result = t === 'ArrowFunctionExpression' || t === 'FunctionExpression';

    return result;
  }

  /**
   * Collects the name/function pairs of an object literal's method-shorthand and function-valued
   * properties (`{ calculate(x) {...} }` and `{ calculate: (x) => {...} }` alike). Computed keys
   * and spreads are skipped — there is no static name to report against.
   */
  public static objectExpressionFunctionProperties(objectExpression: unknown): readonly { readonly 'name': string; readonly 'node': unknown }[] {
    if (!ObjectGuard.isObject(objectExpression) || objectExpression.type !== 'ObjectExpression') {
      return [];
    }
    const properties = objectExpression.properties;

    if (!Array.isArray(properties)) {
      return [];
    }

    const result: { 'name': string; 'node': unknown }[] = [];

    properties.forEach((property) => {
      if (!ObjectGuard.isObject(property) || property.type !== 'Property') {
        return;
      }
      if (property.computed === true) {
        return;
      }
      const key = property.key;

      if (!ObjectGuard.isObject(key) || key.type !== 'Identifier' || typeof key.name !== 'string') {
        return;
      }
      if (!AstHelpers.isFunctionInit(property.value)) {
        return;
      }
      result.push({
        'name': key.name, 'node': property.value
      });
    });

    return result;
  }

  /**
   * Collects the local-name/function pairs produced by destructuring an object or array literal
   * that itself contains function-valued members — `const { foo } = { foo: (x) => {...} };` and
   * `const [foo] = [(x) => {...}];`. The reported name is the locally bound identifier, since
   * that is the freestanding name now in scope.
   */
  public static destructuredFunctionEntries(
    id: unknown,
    init: unknown
  ): readonly { readonly 'name': string; readonly 'node': unknown }[] {
    if (!ObjectGuard.isObject(id)) {
      return [];
    }

    if (id.type === 'ObjectPattern' && ObjectGuard.isObject(init) && init.type === 'ObjectExpression') {
      const sourceEntries = AstHelpers.objectExpressionFunctionProperties(init);
      const sourceEntriesByName = new Map(sourceEntries.map((entry) => {
        return [
          entry.name,
          entry.node
        ];
      }));
      const patternProperties = Array.isArray(id.properties) ? id.properties : [];
      const result: { 'name': string; 'node': unknown }[] = [];

      patternProperties.forEach((patternProperty) => {
        if (!ObjectGuard.isObject(patternProperty) || patternProperty.type !== 'Property') {
          return;
        }
        if (patternProperty.computed === true) {
          return;
        }
        const key = patternProperty.key;
        const value = patternProperty.value;

        if (!ObjectGuard.isObject(key) || key.type !== 'Identifier' || typeof key.name !== 'string') {
          return;
        }
        if (!ObjectGuard.isObject(value) || value.type !== 'Identifier' || typeof value.name !== 'string') {
          return;
        }
        const sourceNode = sourceEntriesByName.get(key.name);

        if (sourceNode !== undefined) {
          result.push({
            'name': value.name, 'node': sourceNode
          });
        }
      });

      return result;
    }

    if (id.type === 'ArrayPattern' && ObjectGuard.isObject(init) && init.type === 'ArrayExpression') {
      const patternElements = Array.isArray(id.elements) ? id.elements : [];
      const initElements = Array.isArray(init.elements) ? init.elements : [];
      const result: { 'name': string; 'node': unknown }[] = [];

      patternElements.forEach((patternElement, index) => {
        if (!ObjectGuard.isObject(patternElement) || patternElement.type !== 'Identifier') {
          return;
        }
        if (typeof patternElement.name !== 'string') {
          return;
        }
        const initElement: unknown = initElements.at(index);

        if (!AstHelpers.isFunctionInit(initElement)) {
          return;
        }
        result.push({
          'name': patternElement.name, 'node': initElement
        });
      });

      return result;
    }

    return [];
  }

  public static isNamedType(type: Type): boolean {
    if (type.aliasSymbol !== undefined) {
      return true;
    }
    const symbol = type.getSymbol();

    if (symbol === undefined) {
      return false;
    }
    const name = symbol.getName();
    const result = name !== '__type' && name !== '__function';

    return result;
  }

  /** Structural-mode trivia check: block body with a single trivial ReturnStatement, or a trivial expression-bodied arrow. */
  public static isBlockBodyTrivial(body: readonly unknown[]): boolean {
    if (body.length !== 1) {
      return false;
    }
    const [statement] = body;

    if (!ObjectGuard.isObject(statement)) {
      return false;
    }
    const statementType = statement.type;

    if (statementType !== 'ReturnStatement') {
      return false;
    }
    const argument = statement.argument;
    const result = TrivialExpression.isTrivial(argument, TRIVIAL_OPTIONS);

    return result;
  }

  public static isStructurallyExempt(node: unknown): boolean {
    if (!ObjectGuard.isObject(node) || !ObjectGuard.isObject(node.body)) {
      return false;
    }
    const { body } = node;

    if (body.type === 'BlockStatement') {
      const result = AstHelpers.isBlockBodyTrivial(Array.isArray(body.body) ? body.body : []);

      return result;
    }
    const result = TrivialExpression.isTrivial(body, TRIVIAL_OPTIONS);

    return result;
  }
}

export const staticMethodVerbs: Rule.RuleModule = {
  'create': (context) => {
    const rawOptions: unknown = context.options.at(0);
    const rawMode = ObjectGuard.isObject(rawOptions) ? rawOptions.mode : undefined;
    const mode = rawMode === 'any' || rawMode === 'structural' || rawMode === 'typed'
      ? rawMode
      : DEFAULT_MODE;

    const services = mode === 'typed' ? ContextHelpers.getServices(context) : undefined;
    const checker = services?.program !== undefined ? services.program.getTypeChecker() : undefined;

    if (mode === 'typed' && checker === undefined) {
      return {};
    }

    const report = (node: Rule.Node, name: string): void => {
      context.report({
        'data': { 'name': name },
        'messageId': 'freestandingFunction',
        'node': node
      });
    };

    const shouldReport = (node: unknown): boolean => {
      if (mode === 'any') {
        return true;
      }
      if (mode === 'structural') {
        const result = !AstHelpers.isStructurallyExempt(node);

        return result;
      }
      // 'typed'
      if (services === undefined || checker === undefined) {
        return false;
      }
      const type = services.getTypeAtLocation(node);
      const signature = type.getCallSignatures().at(0);
      const returnType = signature?.getReturnType();

      if (returnType === undefined) {
        return false;
      }
      const result = AstHelpers.isNamedType(returnType);

      return result;
    };

    const onFunctionDeclaration: NonNullable<Rule.RuleListener['FunctionDeclaration']> = (node) => {
      if (!AstHelpers.isModuleScopeContainer(node.parent)) {
        return;
      }
      // `node.id` is only absent for an anonymous default-exported declaration
      // (`export default function(x) {...}`) — that is still a freestanding function at module
      // scope and still worth checking, just reported under a placeholder label.
      const name = node.id?.name ?? '(default export)';

      if (!shouldReport(node)) {
        return;
      }
      report(node, name);
    };

    const onVariableDeclaration: NonNullable<Rule.RuleListener['VariableDeclaration']> = (node) => {
      if (!AstHelpers.isModuleScopeContainer(node.parent)) {
        return;
      }
      const { declarations } = node;

      declarations.forEach((declarator) => {
        if (declarator.id.type === 'Identifier') {
          const name = declarator.id.name;

          if (AstHelpers.isFunctionInit(declarator.init)) {
            if (!shouldReport(declarator.init)) {
              return;
            }
            context.report({
              'data': { 'name': name },
              'messageId': 'freestandingFunction',
              'node': declarator
            });

            return;
          }

          // Object-literal method shorthand / function-valued properties bound to a module-scope
          // const: `export const utils = { calculate(x) {...} };`. Each function member is its
          // own freestanding function in disguise — report it under `name.member`.
          const propertyEntries = AstHelpers.objectExpressionFunctionProperties(declarator.init);

          for (let propertyIndex = 0; propertyIndex < propertyEntries.length; propertyIndex += 1) {
            const entry = propertyEntries.at(propertyIndex);

            if (entry === undefined || !shouldReport(entry.node)) {
              continue;
            }
            context.report({
              'data': { 'name': `${name}.${entry.name}` },
              'messageId': 'freestandingFunction',
              'node': entry.node as Rule.Node
            });
          }

          return;
        }

        // Destructured export of a non-trivial function value:
        // `export const { foo } = { foo: (x) => {...} };` or its array-destructured equivalent.
        const destructuredEntries = AstHelpers.destructuredFunctionEntries(declarator.id, declarator.init);

        for (let entryIndex = 0; entryIndex < destructuredEntries.length; entryIndex += 1) {
          const entry = destructuredEntries.at(entryIndex);

          if (entry === undefined || !shouldReport(entry.node)) {
            continue;
          }
          context.report({
            'data': { 'name': entry.name },
            'messageId': 'freestandingFunction',
            'node': entry.node as Rule.Node
          });
        }
      });
    };

    return {
      'FunctionDeclaration': onFunctionDeclaration,
      'VariableDeclaration': onVariableDeclaration
    };
  },
  'meta': {
    'docs': {
      'description': 'Disallow freestanding functions at module scope. Convert to static class methods.',
      'recommended': false
    },
    'messages': { 'freestandingFunction': "Freestanding function '{{name}}' at module scope is forbidden. Convert it to a static method on a class." },
    'schema': [StaticMethodVerbsOptionsEntity.Schema],
    'type': 'problem'
  }
};
