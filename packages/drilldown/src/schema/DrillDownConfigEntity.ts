/**
 * DrillDownConfigEntity — JSON Schema and types for the DrillDown engine configuration.
 *
 * Defines the serializable configuration shape that instructs the DrillDown
 * grouping engine how to partition, filter, sort, and bound a hierarchical data
 * exploration tree. The compiled Ajv validate function is the runtime type-guard
 * used when receiving a config from an external source (LLM, API, user input).
 *
 * @module
 */

import type { SchemaCreateFunctionInterface, SchemaIntakeFunctionInterface } from '@studnicky/json/interfaces';
import type { ValidateFunction } from 'ajv';
import type { FromSchema, JSONSchema } from 'json-schema-to-ts';

import { SchemaValidator } from '@studnicky/json';

import { DrilldownRulesEntity } from './DrilldownRulesEntity.js';

export namespace DrillDownConfigEntity {
  const rulesPointerKey = '$ref';
  const rulesLink = {
    'description': 'Explicit rule tree (filter/group/sort) describing exactly how to partition, filter, and order the data. When provided, this takes precedence over autoGrouping/propertyPriority at each level the rules cover.',
    'title': 'DrillDownConfigRules'
  } as { 'description': string, 'title': 'DrillDownConfigRules' };

  Object.defineProperty(rulesLink, rulesPointerKey, { 'enumerable': true, 'value': DrilldownRulesEntity.Schema.$id });


  export const Schema = {
    '$id': 'urn:studnicky:drilldown:config',
    'additionalProperties': false,
    'description': 'Serializable configuration that instructs the DrillDown grouping engine how to partition, filter, sort, and bound a hierarchical data exploration tree. All properties are optional — omit any you do not need.',
    'properties': {
      'autoGrouping': {
        'additionalProperties': false,
        'description': 'Controls automatic property selection and ordering when propertyPriority is omitted. The engine scores candidate properties and picks the ordering that best achieves the given target.',
        'properties': {
          'mode': {
            'description': 'count = target the desired number of groups per level; size = target the desired number of records per group.',
            'enum': ['count', 'size'],
            'type': 'string'
          },
          'target': {
            'description': 'Numeric target for the chosen mode.',
            'type': 'number'
          }
        },
        'required': ['mode', 'target'],
        'type': 'object'
      },
      'excludeProperties': {
        'description': 'Property names that the autoGrouping algorithm must never group on. Use to suppress identifiers, timestamps with excessive cardinality, or any property that would produce unhelpful singleton groups.',
        'items': { 'type': 'string' },
        'type': 'array'
      },
      'filter': {
        'description': 'Filter rules applied to records before grouping. Multiple rules are ANDed. Three variants are available, discriminated by the type field: date (UTC epoch-ms range), numeric (minimum/maximum range), and value (exact include/exclude list).',
        'items': {
          'oneOf': [
            {
              'additionalProperties': false,
              'properties': {
                'maximum': {
                  'description': 'UTC epoch-ms upper bound (inclusive).',
                  'type': 'number'
                },
                'minimum': {
                  'description': 'UTC epoch-ms lower bound (inclusive).',
                  'type': 'number'
                },
                'property': {
                  'description': 'Record property name.',
                  'type': 'string'
                },
                'type': {
                  'description': 'Filter on a date property.',
                  'enum': ['date'],
                  'type': 'string'
                }
              },
              'required': ['type', 'property'],
              'type': 'object'
            },
            {
              'additionalProperties': false,
              'properties': {
                'maximum': {
                  'description': 'Inclusive upper bound.',
                  'type': 'number'
                },
                'minimum': {
                  'description': 'Inclusive lower bound.',
                  'type': 'number'
                },
                'property': {
                  'description': 'Record property name.',
                  'type': 'string'
                },
                'type': {
                  'description': 'Filter on a numeric property.',
                  'enum': ['numeric'],
                  'type': 'string'
                }
              },
              'required': ['type', 'property'],
              'type': 'object'
            },
            {
              'additionalProperties': false,
              'properties': {
                'operator': {
                  'description': 'include keeps only matching records; exclude removes them.',
                  'enum': ['include', 'exclude'],
                  'type': 'string'
                },
                'property': {
                  'description': 'Record property name.',
                  'type': 'string'
                },
                'type': {
                  'description': 'Filter on exact property values.',
                  'enum': ['value'],
                  'type': 'string'
                },
                'values': {
                  'description': 'Set of values to match.',
                  'items': { 'type': 'string' },
                  'type': 'array'
                }
              },
              'required': ['type', 'property', 'operator', 'values'],
              'type': 'object'
            }
          ]
        },
        'type': 'array'
      },
      'granularity': {
        'additionalProperties': false,
        'description': 'Fine-grained bucket size controls applied per property type. Any field may be omitted; the engine falls back to defaults for omitted dimensions.',
        'properties': {
          'cidr': {
            'description': 'CIDR prefix length for IP address bucketing (e.g. 24 groups by /24 subnet).',
            'type': 'integer'
          },
          'count': {
            'description': 'Target number of numeric buckets when auto-ranging.',
            'type': 'integer'
          },
          'date': {
            'description': 'Temporal granularity for date grouping.',
            'enum': ['day', 'month', 'quarter', 'week', 'year'],
            'type': 'string'
          },
          'density': {
            'description': 'Density hint for quantile bucketing (0–1 fraction of the value range per bucket).',
            'type': 'number'
          },
          'prefix': {
            'description': 'String prefix length for lexicographic bucketing.',
            'type': 'integer'
          }
        },
        'type': 'object'
      },
      'maximumDepth': {
        'description': 'Hard cap on tree depth. When set, the engine stops recursing at this depth even if propertyPriority has more entries or autoGrouping would continue. Defaults to the length of propertyPriority (or unlimited for autoGrouping).',
        'minimum': 1,
        'type': 'integer'
      },
      'maximumNodes': {
        'description': 'Global cap on the total number of grouped (non-leaf) nodes produced. Once the budget is exhausted the engine stops subdividing. Use to bound memory and render cost on large datasets.',
        'minimum': 1,
        'type': 'integer'
      },
      'minimumGroupSize': {
        'description': 'Minimum number of records a subgroup must contain to be recursed into. Groups at or below this size are treated as leaf nodes. Use to suppress noise from rare combinations.',
        'minimum': 1,
        'type': 'integer'
      },
      'numericGrouping': {
        'description': 'When true, numeric properties are automatically bucketed into ranges rather than grouped by exact value. Useful for continuous measurements such as scores, counts, or durations.',
        'type': 'boolean'
      },
      'propertyPriority': {
        'description': 'Ordered list of record property names to group by. Each entry adds one level to the tree (e.g. ["device", "daypart"] groups first by device, then by daypart within each device group). When omitted, the engine selects and orders properties automatically via autoGrouping.',
        'items': { 'type': 'string' },
        'type': 'array'
      },
      // External $ref by $id, not an embedded spread of DrilldownRulesEntity.Schema — a spread
      // would fold DrilldownRulesEntity's own `$ref: '#'` into this document, making it resolve
      // to *this* schema's root instead of DrilldownRulesEntity's, corrupting the recursion.
      // TS sees only `{ title: ... }` (no `$ref`) via the same technique DrilldownRulesEntity
      // uses for its own recursive node — `deserialize` below substitutes the real type.
      'rules': rulesLink,
      'sort': {
        'description': 'Sort rules applied to grouped records. Evaluated in order; earlier entries take precedence. Use $groupCount or $groupKey as the property for group-level sorts.',
        'items': {
          'additionalProperties': false,
          'properties': {
            'direction': {
              'description': 'asc = ascending; desc = descending.',
              'enum': ['asc', 'desc'],
              'type': 'string'
            },
            'property': {
              'description': 'Property name to sort on, or the special tokens $groupCount (sort by descendant count) or $groupKey (sort by the group boundary value).',
              'type': 'string'
            }
          },
          'required': ['property', 'direction'],
          'type': 'object'
        },
        'type': 'array'
      }
    },
    'required': [],
    'title': 'DrillDown Configuration',
    'type': 'object'
  } as const satisfies JSONSchema;

  export type Type = FromSchema<
    typeof Schema,
    { 'deserialize': [{ 'output': DrilldownRulesEntity.Type; 'pattern': { 'title': 'DrillDownConfigRules' } }] }
  >;

  /** Type-guard — returns true when `value` is a valid `DrillDownConfigEntity.Type`. */
  export const validate: ValidateFunction<Type> = SchemaValidator.compile<Type>(Schema);
  export const intake: SchemaIntakeFunctionInterface<Type> = SchemaValidator.compileIntake<Type>(Schema);
  export const create: SchemaCreateFunctionInterface<Type> = SchemaValidator.compileCreate<Type>(Schema);

  /**
   * The single canonical default drilldown configuration. Used by callers that
   * open a drilldown without authoring a bespoke config. It intentionally omits
   * `propertyPriority` so the engine discovers groupable fields from the actual
   * decoded records.
   */
  export const DEFAULT: Type = {
    'autoGrouping': { 'mode': 'count', 'target': 10 },
    'excludeProperties': ['id', 'iri', 'latitude', 'longitude', 'sourceFileId', 'sourceRowNumber'],
    'maximumDepth': 4,
    'maximumNodes': 250,
    'minimumGroupSize': 2,
    'sort': [{ 'direction': 'desc', 'property': '$groupCount' }]
  };

}
