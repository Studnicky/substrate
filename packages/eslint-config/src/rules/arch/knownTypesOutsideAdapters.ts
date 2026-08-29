import type { SchemaCreateFunctionInterface, SchemaIntakeFunctionInterface } from '@studnicky/json/interfaces';
import type { Rule } from 'eslint';
import type { FromSchema, JSONSchema } from 'json-schema-to-ts';

import { SchemaValidator } from '@studnicky/json';
import { Predicates } from '@studnicky/types';
import { isTypeReferenceNode, type Node, type Program, TypeFlags } from 'typescript';

import { LayerOptionsEntity } from '../layers/LayerOptionsEntity.js';
import { LayerResolver } from '../layers/LayerResolver.js';

namespace KnownTypesOutsideAdaptersOptionsEntity {
  export const Schema = {
    ...LayerOptionsEntity.Schema,
    'properties': {
      ...LayerOptionsEntity.Schema.properties,
      'adapterLayerName': {
        'default': 'adapters',
        'description': 'Name of the layer exempted from this ban — the layer responsible for converting untyped intake data into known shapes. Defaults to "adapters".',
        'type': 'string'
      }
    }
  } as const satisfies JSONSchema;

  export type Type = FromSchema<typeof Schema>;

  export const intake: SchemaIntakeFunctionInterface<Type> = SchemaValidator.compileIntake<Type>(Schema);
  export const create: SchemaCreateFunctionInterface<Type> = SchemaValidator.compileCreate<Type>(Schema);
}

interface NodeMapInterface {
  readonly 'get': (node: unknown) => Node | undefined;
}

interface ParserServicesInterface {
  readonly 'esTreeNodeToTSNodeMap': NodeMapInterface;
  readonly 'program': Program;
}

class ParserServices {
  public static has(value: unknown): value is ParserServicesInterface {
    if (!Predicates.isRecord(value)) { return false; }

    const program = value.program;
    const nodeMap = value.esTreeNodeToTSNodeMap;
    if (!Predicates.isRecord(program) || !Predicates.isRecord(nodeMap)) { return false; }

    const result = typeof program.getTypeChecker === 'function' && typeof nodeMap.get === 'function';
    return result;
  }
}

class TypeKeywordReport {
  public static report(context: Rule.RuleContext, sourceLayer: string, messageId: 'noAny' | 'noUnknown', node: Rule.Node): void {
    context.report({
      'data': { 'layer': sourceLayer },
      'messageId': messageId,
      'node': node
    });
  }

  public static listener(context: Rule.RuleContext, sourceLayer: string, messageId: 'noAny' | 'noUnknown'): NonNullable<Rule.RuleListener['TSAnyKeyword']> {
    return (node: Rule.Node) => {
      TypeKeywordReport.report(context, sourceLayer, messageId, node);
    };
  }
}

class ResolvedTypeReferenceReport {
  public static listener(
    context: Rule.RuleContext,
    sourceLayer: string,
    services: ParserServicesInterface
  ): NonNullable<Rule.RuleListener['TSTypeReference']> {
    const checker = services.program.getTypeChecker();

    return (node: Rule.Node) => {
      const tsNode = services.esTreeNodeToTSNodeMap.get(node);
      if (tsNode === undefined || !isTypeReferenceNode(tsNode)) { return; }

      const resolvedType = checker.getTypeFromTypeNode(tsNode);

      if ((resolvedType.flags & TypeFlags.Any) !== 0) {
        TypeKeywordReport.report(context, sourceLayer, 'noAny', node);
        return;
      }

      if ((resolvedType.flags & TypeFlags.Unknown) !== 0) {
        TypeKeywordReport.report(context, sourceLayer, 'noUnknown', node);
      }
    };
  }
}

export const knownTypesOutsideAdapters: Rule.RuleModule = {
  'create': (context) => {
    const rawOptions: unknown = context.options.at(0);
    if (rawOptions === undefined) { return {}; }
    const options = KnownTypesOutsideAdaptersOptionsEntity.intake(rawOptions);

    const filename = context.physicalFilename;
    const sourceLayer = LayerResolver.layerForPath(filename, options);

    if (sourceLayer === undefined || sourceLayer === options.adapterLayerName) { return {}; }

    const listeners: Rule.RuleListener = {
      'TSAnyKeyword': TypeKeywordReport.listener(context, sourceLayer, 'noAny'),
      'TSUnknownKeyword': TypeKeywordReport.listener(context, sourceLayer, 'noUnknown')
    };

    const servicesUnknown: unknown = context.sourceCode.parserServices;
    if (ParserServices.has(servicesUnknown)) {
      listeners.TSTypeReference = ResolvedTypeReferenceReport.listener(context, sourceLayer, servicesUnknown);
    }

    return listeners;
  },
  'meta': {
    'docs': {
      'description': "Disallow 'any' and 'unknown' types outside the adapters layer of a hexagonal architecture. Adapters are the only layer permitted to hold untyped intake data — their job is converting it into known shapes; every other layer must consume already-converted, known types.",
      'recommended': false
    },
    'messages': {
      'noAny': "Layer '{{layer}}' may not use 'any'. Only the adapters layer may hold untyped data — convert it to a known shape at the boundary.",
      'noUnknown': "Layer '{{layer}}' may not use 'unknown'. Only the adapters layer may hold untyped data — convert it to a known shape at the boundary."
    },
    'schema': [KnownTypesOutsideAdaptersOptionsEntity.Schema],
    'type': 'problem'
  }
};
