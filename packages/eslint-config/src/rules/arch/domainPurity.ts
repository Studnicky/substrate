import type { Rule } from 'eslint';

import type { LayerOptionsType } from '../../types/LayerOptionsType.js';

import { layerOptionsSchema } from '../layers/layerOptionsSchema.js';
import { LayerResolver } from '../layers/LayerResolver.js';

type DomainPurityOptionsType = LayerOptionsType & {
  'domainLayerName'?: string;
  'forbiddenCalls'?: string[];
  'forbiddenImports'?: string[];
};

const domainPuritySchema = {
  'additionalProperties': false,
  'properties': {
    ...layerOptionsSchema.properties,
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
  'required': layerOptionsSchema.required,
  'type': 'object'
} as const;

class AstNode {
  public static isObject(value: unknown): value is Record<string, unknown> {
    return value !== null && value !== undefined && typeof value === 'object' && !Array.isArray(value);
  }
}

class ImportSourceValue {
  public static get(node: unknown): string | undefined {
    if (!AstNode.isObject(node)) { return undefined; }

    const source: unknown = node.source;
    if (!AstNode.isObject(source)) { return undefined; }

    const value: unknown = source.value;
    return typeof value === 'string' ? value : undefined;
  }
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
    if (!AstNode.isObject(node)) { return undefined; }

    const callee: unknown = node.callee;
    if (!AstNode.isObject(callee)) { return undefined; }

    const calleeType = callee.type;

    if (calleeType === 'Identifier') {
      const name = callee.name;
      return typeof name === 'string' ? name : undefined;
    }

    if (calleeType === 'MemberExpression') {
      const object: unknown = callee.object;
      const property: unknown = callee.property;
      if (!AstNode.isObject(object) || !AstNode.isObject(property)) { return undefined; }
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
    const options = context.options.at(0) as DomainPurityOptionsType | undefined;

    if (options === undefined) { return {}; }

    const filename = context.physicalFilename;
    const domainLayerFile = LayerResolver.layerForPath(filename, options) === (options.domainLayerName ?? 'domain');

    if (!domainLayerFile) { return {}; }

    const forbiddenImports = options.forbiddenImports ?? [];
    const forbiddenCalls = options.forbiddenCalls ?? [];

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
    'schema': [domainPuritySchema],
    'type': 'problem'
  }
};
