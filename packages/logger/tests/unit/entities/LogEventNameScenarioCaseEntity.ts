import type { NodeStaticType } from '@studnicky/entity/types';

import { SchemaNode } from '@studnicky/entity/types';

const nameSchema = { 'minLength': 1, 'type': 'string' } as const;
const nameNode = SchemaNode.defineString(nameSchema);

const componentPrefixesSchema = {
  'additionalProperties': false,
  'properties': {
    'API': nameSchema, 'AUTH': nameSchema, 'CACHE': nameSchema, 'DATA_SOURCE': nameSchema, 'DB': nameSchema,
    'ENTITY': nameSchema, 'GRAPH': nameSchema, 'LLM': nameSchema, 'ONTOLOGY': nameSchema, 'QUERY_PLANNER': nameSchema,
    'QUERY_ROUTER': nameSchema, 'QUERY_TRANSLATE': nameSchema, 'SCHEMA': nameSchema, 'TIMING': nameSchema, 'WORKFLOW': nameSchema
  },
  'required': [
    'API', 'AUTH', 'CACHE', 'DATA_SOURCE', 'DB', 'ENTITY', 'GRAPH', 'LLM', 'ONTOLOGY', 'QUERY_PLANNER',
    'QUERY_ROUTER', 'QUERY_TRANSLATE', 'SCHEMA', 'TIMING', 'WORKFLOW'
  ],
  'type': 'object'
} as const;
const componentPrefixesNode = SchemaNode.defineObject({ 'type': 'object' } as const, {
    'API': nameNode, 'AUTH': nameNode, 'CACHE': nameNode, 'DATA_SOURCE': nameNode, 'DB': nameNode,
    'ENTITY': nameNode, 'GRAPH': nameNode, 'LLM': nameNode, 'ONTOLOGY': nameNode, 'QUERY_PLANNER': nameNode,
    'QUERY_ROUTER': nameNode, 'QUERY_TRANSLATE': nameNode, 'SCHEMA': nameNode, 'TIMING': nameNode, 'WORKFLOW': nameNode
  }, [
    'API', 'AUTH', 'CACHE', 'DATA_SOURCE', 'DB', 'ENTITY', 'GRAPH', 'LLM', 'ONTOLOGY', 'QUERY_PLANNER',
    'QUERY_ROUTER', 'QUERY_TRANSLATE', 'SCHEMA', 'TIMING', 'WORKFLOW'
  ] as const, { 'additionalProperties': false, 'patternProperties': {} });

function defineCreateEventBranch<const TShape extends string>(shape: TShape) {
  const schema = {
    'additionalProperties': false,
    'properties': {
      'description': nameSchema,
      'expected': nameSchema,
      'input': {
        'additionalProperties': false,
        'properties': { 'component': nameSchema, 'operation': nameSchema },
        'required': ['component', 'operation'],
        'type': 'object'
      },
      'name': nameSchema,
      'shape': { 'const': shape }
    },
    'required': ['description', 'expected', 'input', 'name', 'shape'],
    'type': 'object'
  } as const;
  const node = SchemaNode.defineObject({ 'type': 'object' } as const, {
      'description': nameNode,
      'expected': nameNode,
      'input': SchemaNode.defineObject({ 'type': 'object' } as const, { 'component': nameNode, 'operation': nameNode }, ['component', 'operation'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
      'name': nameNode,
      'shape': SchemaNode.defineConst({}, shape)
    }, ['description', 'expected', 'input', 'name', 'shape'] as const, { 'additionalProperties': false, 'patternProperties': {} });
  return { node, schema };
}

function defineParseEventBranch<const TShape extends string>(shape: TShape) {
  const schema = {
    'additionalProperties': false,
    'properties': {
      'description': nameSchema,
      'expected': {
        'additionalProperties': false,
        'properties': { 'component': nameSchema, 'operation': { 'type': 'string' } },
        'required': ['component', 'operation'],
        'type': 'object'
      },
      'input': { 'additionalProperties': false, 'properties': { 'event': nameSchema }, 'required': ['event'], 'type': 'object' },
      'name': nameSchema,
      'shape': { 'const': shape }
    },
    'required': ['description', 'expected', 'input', 'name', 'shape'],
    'type': 'object'
  } as const;
  const node = SchemaNode.defineObject({ 'type': 'object' } as const, {
      'description': nameNode,
      'expected': SchemaNode.defineObject({ 'type': 'object' } as const, { 'component': nameNode, 'operation': SchemaNode.defineString({ 'type': 'string' } as const) }, ['component', 'operation'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
      'input': SchemaNode.defineObject({ 'type': 'object' } as const, { 'event': nameNode }, ['event'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
      'name': nameNode,
      'shape': SchemaNode.defineConst({}, shape)
    }, ['description', 'expected', 'input', 'name', 'shape'] as const, { 'additionalProperties': false, 'patternProperties': {} });
  return { node, schema };
}

/** `LogEventName` scenario cases, discriminated by `shape`. */
export namespace LogEventNameScenarioCaseEntity {
  const componentPrefixesCaseSchema = {
    'additionalProperties': false,
    'properties': {
      'description': nameSchema,
      'expected': { 'additionalProperties': false, 'properties': { 'components': componentPrefixesSchema }, 'required': ['components'], 'type': 'object' },
      'input': { 'additionalProperties': false, 'properties': { 'components': componentPrefixesSchema }, 'required': ['components'], 'type': 'object' },
      'name': nameSchema,
      'shape': { 'const': 'component-prefixes' }
    },
    'required': ['description', 'expected', 'input', 'name', 'shape'],
    'type': 'object'
  } as const;
  const componentPrefixesCaseNode = SchemaNode.defineObject({ 'type': 'object' } as const, {
      'description': nameNode,
      'expected': SchemaNode.defineObject({ 'type': 'object' } as const, { 'components': componentPrefixesNode }, ['components'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
      'input': SchemaNode.defineObject({ 'type': 'object' } as const, { 'components': componentPrefixesNode }, ['components'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
      'name': nameNode,
      'shape': SchemaNode.defineConst({}, 'component-prefixes' as const)
    }, ['description', 'expected', 'input', 'name', 'shape'] as const, { 'additionalProperties': false, 'patternProperties': {} });

  const createConstantComponent = defineCreateEventBranch('create-constant-component' as const);
  const createGraphQuery = defineCreateEventBranch('create-graph-query' as const);
  const createQueryPlanner = defineCreateEventBranch('create-query-planner' as const);

  const parseGraphQuery = defineParseEventBranch('parse-graph-query' as const);
  const parseMultipleDots = defineParseEventBranch('parse-multiple-dots' as const);
  const parseQueryPlanner = defineParseEventBranch('parse-query-planner' as const);
  const parseStandalone = defineParseEventBranch('parse-standalone' as const);

  export const Schema = {
    'oneOf': [
      componentPrefixesCaseSchema,
      createConstantComponent.schema, createGraphQuery.schema, createQueryPlanner.schema,
      parseGraphQuery.schema, parseMultipleDots.schema, parseQueryPlanner.schema, parseStandalone.schema
    ]
  } as const;

  export const Node = SchemaNode.defineOneOf({}, [
    componentPrefixesCaseNode,
    createConstantComponent.node, createGraphQuery.node, createQueryPlanner.node,
    parseGraphQuery.node, parseMultipleDots.node, parseQueryPlanner.node, parseStandalone.node
  ]);
  export type Type = NodeStaticType<typeof Node>;
}
