import type { Rule } from 'eslint';
import type { FromSchema, JSONSchema } from 'json-schema-to-ts';

import { LayerOptionsEntity } from '../layers/LayerOptionsEntity.js';
import { LayerResolver } from '../layers/LayerResolver.js';

namespace KnownTypesOutsideAdaptersOptionsEntity {
  export const Schema = {
    ...LayerOptionsEntity.Schema,
    'properties': {
      ...LayerOptionsEntity.Schema.properties,
      'adapterLayerName': {
        'description': 'Name of the layer exempted from this ban — the layer responsible for converting untyped intake data into known shapes. Defaults to "adapters".',
        'type': 'string'
      }
    }
  } as const satisfies JSONSchema;

  export type Type = FromSchema<typeof Schema>;
}

class TypeKeywordReport {
  public static listener(context: Rule.RuleContext, sourceLayer: string, messageId: 'noAny' | 'noUnknown'): NonNullable<Rule.RuleListener['TSAnyKeyword']> {
    return (node: Rule.Node) => {
      context.report({
        'data': { 'layer': sourceLayer },
        'messageId': messageId,
        'node': node
      });
    };
  }
}

export const knownTypesOutsideAdapters: Rule.RuleModule = {
  'create': (context) => {
    const options: unknown = context.options.at(0);

    if (!LayerOptionsEntity.validate(options)) { return {}; }

    const filename = context.physicalFilename;
    const sourceLayer = LayerResolver.layerForPath(filename, options);

    const adapterLayerNameValue: unknown = Reflect.get(options, 'adapterLayerName');
    const adapterLayerName = typeof adapterLayerNameValue === 'string' ? adapterLayerNameValue : 'adapters';
    if (sourceLayer === undefined || sourceLayer === adapterLayerName) { return {}; }

    return {
      'TSAnyKeyword': TypeKeywordReport.listener(context, sourceLayer, 'noAny'),
      'TSUnknownKeyword': TypeKeywordReport.listener(context, sourceLayer, 'noUnknown')
    };
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
