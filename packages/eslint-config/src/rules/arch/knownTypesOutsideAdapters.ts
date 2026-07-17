import type { Rule } from 'eslint';

import type { LayerOptionsType } from '../../types/LayerOptionsType.js';

import { layerOptionsSchema } from '../layers/layerOptionsSchema.js';
import { LayerResolver } from '../layers/LayerResolver.js';

type NoAnyUnknownOutsideAdaptersOptionsType = LayerOptionsType & {
  'adapterLayerName'?: string;
};

const noAnyUnknownOutsideAdaptersSchema = {
  ...layerOptionsSchema,
  'properties': {
    ...layerOptionsSchema.properties,
    'adapterLayerName': {
      'description': 'Name of the layer exempted from this ban — the layer responsible for converting untyped intake data into known shapes. Defaults to "adapters".',
      'type': 'string'
    }
  }
};

type MessageIdType = 'noAny' | 'noUnknown';

class TypeKeywordReport {
  public static listener(context: Rule.RuleContext, sourceLayer: string, messageId: MessageIdType): NonNullable<Rule.RuleListener['TSAnyKeyword']> {
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
    const options = context.options.at(0) as NoAnyUnknownOutsideAdaptersOptionsType | undefined;

    if (options === undefined) { return {}; }

    const filename = context.physicalFilename;
    const sourceLayer = LayerResolver.layerForPath(filename, options);

    const adapterLayerName = options.adapterLayerName ?? 'adapters';
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
    'schema': [noAnyUnknownOutsideAdaptersSchema],
    'type': 'problem'
  }
};
