import type {
  Rule, Scope
} from 'eslint';
import type {
  FromSchema, JSONSchema
} from 'json-schema-to-ts';

import { LayerOptionsEntity } from '../layers/LayerOptionsEntity.js';
import { LayerResolver } from '../layers/LayerResolver.js';
import { ImportSourceValue } from '../shared/importSourceValue.js';
import { ObjectGuard } from '../shared/ObjectGuard.js';

namespace DomainPurityOptionsEntity {
  export const Schema = {
    'additionalProperties': false,
    'properties': {
      ...LayerOptionsEntity.Schema.properties,
      'domainLayerName': {
        'description': 'Name of the layer treated as the pure-data domain layer, e.g. "domain" or "entities". Defaults to "domain".',
        'type': 'string'
      },
      'forbiddenCalls': {
        'description': 'Dotted call expressions forbidden in domain-layer files, e.g. ["Date.now", "Math.random"].',
        'items': { 'type': 'string' },
        'type': 'array'
      },
      'forbiddenImports': {
        'description': 'Bare import specifiers or roots forbidden in domain-layer files, e.g. ["fs", "axios", "node:fs"].',
        'items': { 'type': 'string' },
        'type': 'array'
      }
    },
    'required': LayerOptionsEntity.Schema.required,
    'type': 'object'
  } as const satisfies JSONSchema;

  export type Type = FromSchema<typeof Schema>;
}

class CalleeDottedName {
  /**
   * Recursively walks an `Identifier | MemberExpression` chain and builds its dotted
   * string form, e.g. `globalThis.Date.now`. Supports bracket-notation member access
   * with a string literal property (`Date["now"]`) at any depth of the chain.
   */
  public static resolveMemberChain(node: unknown): string | undefined {
    if (!ObjectGuard.isObject(node)) {
      return undefined;
    }

    const nodeType = node.type;

    if (nodeType === 'Identifier') {
      const name = node.name;
      const result = typeof name === 'string' ? name : undefined;

      return result;
    }

    if (nodeType === 'MemberExpression') {
      const object: unknown = node.object;
      const property: unknown = node.property;
      const computed = node.computed === true;

      const objectName = CalleeDottedName.resolveMemberChain(object);

      if (objectName === undefined) {
        return undefined;
      }
      if (!ObjectGuard.isObject(property)) {
        return undefined;
      }

      if (computed) {
        if (property.type !== 'Literal') {
          return undefined;
        }
        const value = property.value;
        const result = typeof value === 'string' ? `${objectName}.${value}` : undefined;

        return result;
      }

      if (property.type !== 'Identifier') {
        return undefined;
      }
      const propertyName = property.name;
      const result = typeof propertyName === 'string' ? `${objectName}.${propertyName}` : undefined;

      return result;
    }

    return undefined;
  }

  /**
   * Resolves a bare-identifier callee that is destructured from an object, e.g.
   * `const { now } = Date; now();`, back to its dotted source name (`Date.now`).
   * Only the direct one-level case is handled: a single `const`/`let`/`var`
   * declarator whose pattern is an `ObjectPattern` destructuring from a bare
   * `Identifier` init. Renamed destructuring (`const { now: n } = Date`) resolves
   * via the destructured property's key name, not the local alias.
   */
  private static resolveDestructuredAlias(name: string, scope: Scope.Scope): string | undefined {
    const variable = CalleeDottedName.findVariable(scope, name);

    if (variable?.defs.length !== 1) {
      return undefined;
    }

    const def = variable.defs.at(0);

    if (def?.type !== 'Variable') {
      return undefined;
    }

    const declarator: unknown = def.node;

    if (!ObjectGuard.isObject(declarator)) {
      return undefined;
    }

    const id: unknown = declarator.id;
    const init: unknown = declarator.init;

    if (!ObjectGuard.isObject(id) || id.type !== 'ObjectPattern') {
      return undefined;
    }
    if (!ObjectGuard.isObject(init) || init.type !== 'Identifier') {
      return undefined;
    }

    const objectName = init.name;

    if (typeof objectName !== 'string') {
      return undefined;
    }

    const properties: unknown = id.properties;

    if (!Array.isArray(properties)) {
      return undefined;
    }

    const propertiesLength = properties.length;

    for (let index = 0; index < propertiesLength; index += 1) {
      const property: unknown = properties.at(index);

      if (!ObjectGuard.isObject(property) || property.type !== 'Property') {
        continue;
      }

      const key: unknown = property.key;
      const value: unknown = property.value;

      if (!ObjectGuard.isObject(key) || !ObjectGuard.isObject(value)) {
        continue;
      }
      if (key.type !== 'Identifier' || value.type !== 'Identifier') {
        continue;
      }
      if (value.name !== name) {
        continue;
      }

      const propertyName = key.name;

      if (typeof propertyName === 'string') {
        return `${objectName}.${propertyName}`;
      }
    }

    return undefined;
  }

  private static findVariable(scope: Scope.Scope | null, name: string): Scope.Variable | undefined {
    let current = scope;

    while (current !== null) {
      const variables = current.variables;
      const variablesLength = variables.length;

      for (let index = 0; index < variablesLength; index += 1) {
        const candidate = variables.at(index);

        if (candidate?.name === name) {
          return candidate;
        }
      }
      current = current.upper;
    }

    return undefined;
  }

  public static get(node: unknown, context: Rule.RuleContext): string | undefined {
    if (!ObjectGuard.isObject(node)) {
      return undefined;
    }

    const callee: unknown = node.callee;
    const resolved = CalleeDottedName.resolveMemberChain(callee);

    if (resolved?.includes('.') === true) {
      return resolved;
    }

    if (ObjectGuard.isObject(callee) && callee.type === 'Identifier' && typeof callee.name === 'string') {
      const scope = context.sourceCode.getScope(callee as unknown as Rule.Node);
      const destructured = CalleeDottedName.resolveDestructuredAlias(callee.name, scope);

      if (destructured !== undefined) {
        return destructured;
      }
    }

    return resolved;
  }
}

export const domainPurity: Rule.RuleModule = {
  'create': (context) => {
    const options: unknown = context.options.at(0);

    if (!LayerOptionsEntity.validate(options)) {
      return {};
    }

    const filename = context.physicalFilename;
    const domainLayerNameValue: unknown = Reflect.get(options, 'domainLayerName');
    const domainLayerName = typeof domainLayerNameValue === 'string' ? domainLayerNameValue : 'domain';
    const domainLayerFile = LayerResolver.layerForPath(filename, options) === domainLayerName;

    if (!domainLayerFile) {
      return {};
    }

    const forbiddenImportsValue: unknown = Reflect.get(options, 'forbiddenImports');
    const forbiddenCallsValue: unknown = Reflect.get(options, 'forbiddenCalls');
    const forbiddenImports = Array.isArray(forbiddenImportsValue)
      ? forbiddenImportsValue.filter((value): value is string => {
        const result = typeof value === 'string';

        return result;
      })
      : [];
    const forbiddenCalls = Array.isArray(forbiddenCallsValue)
      ? forbiddenCallsValue.filter((value): value is string => {
        const result = typeof value === 'string';

        return result;
      })
      : [];
    const forbiddenCallsSet = new Set(forbiddenCalls);

    const checkForbiddenImport = (node: Rule.Node): void => {
      const specifier = ImportSourceValue.get(node);

      if (specifier === undefined) {
        return;
      }

      const isForbiddenImport = forbiddenImports.some((entry) => {
        const result = specifier === entry || specifier.startsWith(`${entry}/`);

        return result;
      });

      if (isForbiddenImport) {
        context.report({
          'data': { 'specifier': specifier },
          'messageId': 'impureImport',
          'node': node
        });
      }
    };

    const onImportDeclaration: NonNullable<Rule.RuleListener['ImportDeclaration']> = (node) => {
      checkForbiddenImport(node);
    };

    const onImportExpression: NonNullable<Rule.RuleListener['ImportExpression']> = (node) => {
      checkForbiddenImport(node);
    };

    const onCallExpression: NonNullable<Rule.RuleListener['CallExpression']> = (node) => {
      const callName = CalleeDottedName.get(node, context);

      if (callName === undefined) {
        return;
      }

      const segments = callName.split('.');
      const matchedSuffix = segments.some((_segment, index) => {
        const suffix = segments.slice(index).join('.');
        const result = forbiddenCallsSet.has(suffix);

        return result;
      });

      if (matchedSuffix) {
        context.report({
          'data': { 'callName': callName },
          'messageId': 'impureCall',
          'node': node
        });
      }
    };

    return {
      'CallExpression': onCallExpression,
      'ImportDeclaration': onImportDeclaration,
      'ImportExpression': onImportExpression
    };
  },
  'meta': {
    'docs': {
      'description': 'Disallow impure runtime dependencies (I/O imports, non-deterministic calls) inside hexagonal-architecture domain-layer files.',
      'recommended': false
    },
    'messages': {
      'impureCall': "Domain-layer files may not call '{{callName}}'. Business logic must stay deterministic — inject the value instead.",
      'impureImport': "Domain-layer files may not import '{{specifier}}'. Business logic must stay free of I/O and infrastructure dependencies."
    },
    'schema': [DomainPurityOptionsEntity.Schema],
    'type': 'problem'
  }
};
