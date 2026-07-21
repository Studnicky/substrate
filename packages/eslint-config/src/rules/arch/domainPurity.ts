import type { Rule } from 'eslint';
import type { FromSchema, JSONSchema } from 'json-schema-to-ts';

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

class ForbiddenSpecifierMatch {
  public static test(specifier: string, forbidden: readonly string[]): boolean {
    const result = forbidden.some((entry) => {
      return specifier === entry || specifier.startsWith(`${entry}/`);
    });
    return result;
  }
}

class CalleeDottedName {
  public static get(node: unknown): string | undefined {
    if (!ObjectGuard.isObject(node)) { return undefined; }

    const callee: unknown = node.callee;
    if (!ObjectGuard.isObject(callee)) { return undefined; }

    const calleeType = callee.type;

    if (calleeType === 'Identifier') {
      const name = callee.name;
      return typeof name === 'string' ? name : undefined;
    }

    if (calleeType === 'MemberExpression') {
      const object: unknown = callee.object;
      const property: unknown = callee.property;
      if (!ObjectGuard.isObject(object) || !ObjectGuard.isObject(property)) { return undefined; }
      if (object.type !== 'Identifier' || property.type !== 'Identifier') { return undefined; }

      const objectName = object.name;
      const propertyName = property.name;
      if (typeof objectName !== 'string' || typeof propertyName !== 'string') { return undefined; }

      return `${objectName}.${propertyName}`;
    }

    return undefined;
  }
}

export const domainPurity: Rule.RuleModule = {
  'create': (context) => {
    const options: unknown = context.options.at(0);

    if (!LayerOptionsEntity.validate(options)) { return {}; }

    const filename = context.physicalFilename;
    const domainLayerNameValue: unknown = Reflect.get(options, 'domainLayerName');
    const domainLayerName = typeof domainLayerNameValue === 'string' ? domainLayerNameValue : 'domain';
    const domainLayerFile = LayerResolver.layerForPath(filename, options) === domainLayerName;

    if (!domainLayerFile) { return {}; }

    const forbiddenImportsValue: unknown = Reflect.get(options, 'forbiddenImports');
    const forbiddenCallsValue: unknown = Reflect.get(options, 'forbiddenCalls');
    const forbiddenImports = Array.isArray(forbiddenImportsValue)
      ? forbiddenImportsValue.filter((value): value is string => { return typeof value === 'string'; })
      : [];
    const forbiddenCalls = Array.isArray(forbiddenCallsValue)
      ? forbiddenCallsValue.filter((value): value is string => { return typeof value === 'string'; })
      : [];

    const onImportDeclaration: NonNullable<Rule.RuleListener['ImportDeclaration']> = (node) => {
      const specifier = ImportSourceValue.get(node);
      if (specifier === undefined) { return; }

      if (ForbiddenSpecifierMatch.test(specifier, forbiddenImports)) {
        context.report({
          'data': { 'specifier': specifier },
          'messageId': 'impureImport',
          'node': node
        });
      }
    };

    const onCallExpression: NonNullable<Rule.RuleListener['CallExpression']> = (node) => {
      const callName = CalleeDottedName.get(node);
      if (callName === undefined) { return; }

      if (forbiddenCalls.includes(callName)) {
        context.report({
          'data': { 'callName': callName },
          'messageId': 'impureCall',
          'node': node
        });
      }
    };

    return {
      'CallExpression': onCallExpression,
      'ImportDeclaration': onImportDeclaration
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
