import type { Rule } from 'eslint';

import type { LayerOptionsType } from '../../types/LayerOptionsType.js';

import { layerOptionsSchema } from '../layers/layerOptionsSchema.js';
import { LayerResolver } from '../layers/LayerResolver.js';
import { ImportSourceValue } from '../shared/importSourceValue.js';

type AdapterOnlyImportOptionsType = LayerOptionsType & {
  'adapterLayerName'?: string;
  'adapterOnlyImports'?: string[];
};

const adapterOnlyImportSchema = {
  ...layerOptionsSchema,
  'properties': {
    ...layerOptionsSchema.properties,
    'adapterLayerName': {
      'description': 'Name of the layer treated as the adapters layer for exemption purposes. Defaults to "adapters".',
      'type': 'string'
    },
    'adapterOnlyImports': {
      'description': 'Package names/roots restricted to the adapters layer, e.g. ["express", "pg", "axios"].',
      'items': { 'type': 'string' },
      'type': 'array'
    }
  }
};

class AdapterOnlyMatch {
  public static find(specifier: string, adapterOnlyImports: readonly string[]): string | undefined {
    const entriesLen = adapterOnlyImports.length;
    for (let index = 0; index < entriesLen; index += 1) {
      const entry = adapterOnlyImports[index];
      if (entry !== undefined && (specifier === entry || specifier.startsWith(`${entry}/`))) {
        return entry;
      }
    }
    return undefined;
  }
}

export const adapterOnlyImport: Rule.RuleModule = {
  'create': (context) => {
    const ruleOptions: readonly unknown[] = context.options;
    const [firstOption] = ruleOptions;
    const options = firstOption as AdapterOnlyImportOptionsType | undefined;

    if (options === undefined) { return {}; }

    const filename = context.physicalFilename;
    const sourceLayer = LayerResolver.layerForPath(filename, options);

    const adapterLayerName = options.adapterLayerName ?? 'adapters';
    if (sourceLayer === undefined || sourceLayer === adapterLayerName) { return {}; }

    const adapterOnlyImports = options.adapterOnlyImports;
    if (adapterOnlyImports === undefined) { return {}; }

    const onImportDeclaration: NonNullable<Rule.RuleListener['ImportDeclaration']> = (node) => {
      const specifier = ImportSourceValue.get(node);
      if (specifier === undefined) { return; }

      const matched = AdapterOnlyMatch.find(specifier, adapterOnlyImports);
      if (matched === undefined) { return; }

      context.report({
        'data': {
          'layer': sourceLayer,
          'specifier': specifier
        },
        'messageId': 'adapterOnlyImport',
        'node': node
      });
    };

    return { 'ImportDeclaration': onImportDeclaration };
  },
  'meta': {
    'docs': {
      'description': 'Disallow importing adapter-only third-party dependencies (concrete HTTP frameworks, database drivers, external API clients) outside the adapters layer of a hexagonal architecture.',
      'recommended': false
    },
    'messages': {
      'adapterOnlyImport': "Layer '{{layer}}' may not import adapter-only dependency '{{specifier}}' directly. Hide it behind a port/adapter."
    },
    'schema': [adapterOnlyImportSchema],
    'type': 'problem'
  }
};
