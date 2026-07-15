import type { Rule } from 'eslint';

import type { LayerOptionsType } from '../../types/LayerOptionsType.js';

import { layerOptionsSchema } from '../layers/layerOptionsSchema.js';
import { LayerResolver } from '../layers/LayerResolver.js';

const isObject = (value: unknown): value is Record<string, unknown> =>
{return value !== null && value !== undefined && typeof value === 'object' && !Array.isArray(value);};

class ImportSourceValue {
  public static get(node: unknown): string | undefined {
    if (!isObject(node)) { return undefined; }

    const source: unknown = node.source;
    if (!isObject(source)) { return undefined; }

    const value: unknown = source.value;
    return typeof value === 'string' ? value : undefined;
  }
}

export const layerImportBoundary: Rule.RuleModule = {
  'create': (context) => {
    const options = (context.options as unknown[]).at(0) as LayerOptionsType | undefined;

    if (options === undefined) { return {}; }

    const filename = context.physicalFilename;

    const onImportDeclaration: NonNullable<Rule.RuleListener['ImportDeclaration']> = (node) => {
      const sourceLayer = LayerResolver.layerForPath(filename, options);
      if (sourceLayer === undefined) { return; }

      const specifier = ImportSourceValue.get(node);
      if (specifier === undefined) { return; }

      const targetLayer = LayerResolver.layerForImport(specifier, filename, options);
      if (targetLayer === undefined) { return; }

      if (!LayerResolver.canImport(sourceLayer, targetLayer, options)) {
        context.report({
          'data': {
            'sourceLayer': sourceLayer,
            'specifier': specifier,
            'targetLayer': targetLayer
          },
          'messageId': 'crossLayerImport',
          'node': node
        });
      }
    };

    return { 'ImportDeclaration': onImportDeclaration };
  },
  'meta': {
    'docs': {
      'description': 'Disallow imports that cross hexagonal-architecture layer boundaries not permitted by the configured allow-matrix.',
      'recommended': false
    },
    'messages': {
      'crossLayerImport': "Layer '{{sourceLayer}}' may not import from layer '{{targetLayer}}' (import '{{specifier}}'). Check the allowed-imports matrix for this architecture."
    },
    'schema': [layerOptionsSchema],
    'type': 'problem'
  }
};
