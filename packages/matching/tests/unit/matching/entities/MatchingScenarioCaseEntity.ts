import type { EntityCreateFunctionInterface, EntityIntakeFunctionInterface, EntityValidateFunctionInterface, SchemaNodeInterface } from '@studnicky/entity/interfaces';
import type { NodeStaticType } from '@studnicky/entity/types';

import { EntityCompiler } from '@studnicky/entity/browser';
import { SchemaNode } from '@studnicky/entity/types';

const stringSchema = { 'type': 'string' } as const;
const stringNode = SchemaNode.defineString({ 'type': 'string' } as const);
const numberSchema = { 'type': 'number' } as const;
const numberNode = SchemaNode.defineNumber({ 'type': 'number' } as const);
const booleanSchema = { 'type': 'boolean' } as const;
const booleanNode = SchemaNode.defineBoolean({ 'type': 'boolean' } as const);
const stringListSchema = { 'items': stringSchema, 'type': 'array' } as const;
const stringListNode = SchemaNode.defineArray({ 'type': 'array' } as const, stringNode, undefined);
const optionsSchema = { 'additionalProperties': false, 'properties': { 'bucketSize': numberSchema, 'relocationLimit': numberSchema }, 'required': ['bucketSize', 'relocationLimit'], 'type': 'object' } as const;
const optionsNode = SchemaNode.defineObject({ 'type': 'object' } as const, { 'bucketSize': numberNode, 'relocationLimit': numberNode }, ['bucketSize', 'relocationLimit'] as const, { 'additionalProperties': false, 'patternProperties': {} });
const ahoSchema = { 'additionalProperties': stringSchema, 'properties': {}, 'required': [], 'type': 'object' } as const;
const ahoNode = SchemaNode.defineObject({ 'type': 'object' } as const, {}, [] as const, { 'additionalProperties': stringNode, 'patternProperties': {} });

/** Builds the `{ description, expected, input, name, shape }` envelope one branch of the case union shares, varying only `shape` and the two payloads. */
class MatchingScenarioCaseBuilders {
  static scenarioSchema<const TShape extends string, TInputSchema extends object, TExpectedSchema extends object>(shape: TShape, inputSchema: TInputSchema, expectedSchema: TExpectedSchema) {
    const result = {
      'additionalProperties': false,
      'properties': {
        'description': { 'minLength': 1, 'type': 'string' },
        'expected': expectedSchema,
        'input': inputSchema,
        'name': { 'minLength': 1, 'type': 'string' },
        'shape': { 'const': shape }
      },
      'required': ['description', 'expected', 'input', 'name', 'shape'],
      'type': 'object'
    } as const;
    return result;
  }

  static scenarioNode<const TShape extends string, TInputNode extends SchemaNodeInterface<unknown, unknown>, TExpectedNode extends SchemaNodeInterface<unknown, unknown>>(shape: TShape, inputNode: TInputNode, expectedNode: TExpectedNode) {
    const result = SchemaNode.defineObject({ 'type': 'object' } as const, {
      'description': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
      'expected': expectedNode,
      'input': inputNode,
      'name': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
      'shape': SchemaNode.defineConst({}, shape)
    }, ['description', 'expected', 'input', 'name', 'shape'] as const, { 'additionalProperties': false, 'patternProperties': {} });
    return result;
  }
}

const normalizationEncodingScoringInputSchema = { 'additionalProperties': false, 'properties': { 'cosineKey': stringSchema, 'cosineLeft': numberSchema, 'cosineRight': numberSchema, 'damerauLeft': stringSchema, 'damerauRight': stringSchema, 'documentCount': numberSchema, 'documentFrequency': numberSchema, 'doubleMetaphoneInput': stringSchema, 'jaccardLeft': stringListSchema, 'jaccardRight': stringListSchema, 'jaroLeft': stringSchema, 'jaroRight': stringSchema, 'levenshteinLeft': stringSchema, 'levenshteinRight': stringSchema, 'metaphoneLeft': stringSchema, 'metaphoneRight': stringSchema, 'minimumHashLeft': stringSchema, 'minimumHashRight': stringSchema, 'ngramInput': stringSchema, 'ngramLeft': stringSchema, 'ngramRight': stringSchema, 'ngramSize': numberSchema, 'normalizerInput': stringSchema, 'seed': numberSchema, 'signatureSize': numberSchema, 'soundexLeft': stringSchema, 'soundexRight': stringSchema, 'tfIdfInput': stringSchema, 'tfIdfToken': stringSchema, 'tokenInput': stringSchema, 'unicodeInput': stringSchema }, 'required': ['cosineKey', 'cosineLeft', 'cosineRight', 'damerauLeft', 'damerauRight', 'documentCount', 'documentFrequency', 'doubleMetaphoneInput', 'jaccardLeft', 'jaccardRight', 'jaroLeft', 'jaroRight', 'levenshteinLeft', 'levenshteinRight', 'metaphoneLeft', 'metaphoneRight', 'minimumHashLeft', 'minimumHashRight', 'ngramInput', 'ngramLeft', 'ngramRight', 'ngramSize', 'normalizerInput', 'seed', 'signatureSize', 'soundexLeft', 'soundexRight', 'tfIdfInput', 'tfIdfToken', 'tokenInput', 'unicodeInput'], 'type': 'object' } as const;
const normalizationEncodingScoringInputNode = SchemaNode.defineObject({ 'type': 'object' } as const, { 'cosineKey': stringNode, 'cosineLeft': numberNode, 'cosineRight': numberNode, 'damerauLeft': stringNode, 'damerauRight': stringNode, 'documentCount': numberNode, 'documentFrequency': numberNode, 'doubleMetaphoneInput': stringNode, 'jaccardLeft': stringListNode, 'jaccardRight': stringListNode, 'jaroLeft': stringNode, 'jaroRight': stringNode, 'levenshteinLeft': stringNode, 'levenshteinRight': stringNode, 'metaphoneLeft': stringNode, 'metaphoneRight': stringNode, 'minimumHashLeft': stringNode, 'minimumHashRight': stringNode, 'ngramInput': stringNode, 'ngramLeft': stringNode, 'ngramRight': stringNode, 'ngramSize': numberNode, 'normalizerInput': stringNode, 'seed': numberNode, 'signatureSize': numberNode, 'soundexLeft': stringNode, 'soundexRight': stringNode, 'tfIdfInput': stringNode, 'tfIdfToken': stringNode, 'tokenInput': stringNode, 'unicodeInput': stringNode }, ['cosineKey', 'cosineLeft', 'cosineRight', 'damerauLeft', 'damerauRight', 'documentCount', 'documentFrequency', 'doubleMetaphoneInput', 'jaccardLeft', 'jaccardRight', 'jaroLeft', 'jaroRight', 'levenshteinLeft', 'levenshteinRight', 'metaphoneLeft', 'metaphoneRight', 'minimumHashLeft', 'minimumHashRight', 'ngramInput', 'ngramLeft', 'ngramRight', 'ngramSize', 'normalizerInput', 'seed', 'signatureSize', 'soundexLeft', 'soundexRight', 'tfIdfInput', 'tfIdfToken', 'tokenInput', 'unicodeInput'] as const, { 'additionalProperties': false, 'patternProperties': {} });
const normalizationEncodingScoringExpectedSchema = { 'additionalProperties': false, 'properties': { 'damerau': numberSchema, 'doubleMetaphone': stringListSchema, 'jaccard': numberSchema, 'jaroMinimum': numberSchema, 'jaroWinklerMinimum': numberSchema, 'levenshteinMinimum': numberSchema, 'ngrams': stringListSchema, 'normalizer': stringSchema, 'sorensenDice': numberSchema, 'tokens': stringListSchema, 'unicode': stringSchema }, 'required': ['damerau', 'doubleMetaphone', 'jaccard', 'jaroMinimum', 'jaroWinklerMinimum', 'levenshteinMinimum', 'ngrams', 'normalizer', 'sorensenDice', 'tokens', 'unicode'], 'type': 'object' } as const;
const normalizationEncodingScoringExpectedNode = SchemaNode.defineObject({ 'type': 'object' } as const, { 'damerau': numberNode, 'doubleMetaphone': stringListNode, 'jaccard': numberNode, 'jaroMinimum': numberNode, 'jaroWinklerMinimum': numberNode, 'levenshteinMinimum': numberNode, 'ngrams': stringListNode, 'normalizer': stringNode, 'sorensenDice': numberNode, 'tokens': stringListNode, 'unicode': stringNode }, ['damerau', 'doubleMetaphone', 'jaccard', 'jaroMinimum', 'jaroWinklerMinimum', 'levenshteinMinimum', 'ngrams', 'normalizer', 'sorensenDice', 'tokens', 'unicode'] as const, { 'additionalProperties': false, 'patternProperties': {} });

const structuralMatchingInputSchema = { 'additionalProperties': false, 'properties': { 'ahoPatterns': ahoSchema, 'ahoValue': stringSchema, 'customDelimiter': stringSchema, 'customDelimiterPattern': stringSchema, 'customDelimiterValue': stringSchema, 'exactMiss': stringSchema, 'exactPattern': stringSchema, 'exactValue': stringSchema, 'globBracePattern': stringSchema, 'globClassPattern': stringSchema, 'globDeepPattern': stringSchema, 'globQuestionPattern': stringSchema, 'globValue': stringSchema, 'radixPattern': stringSchema, 'radixValue': stringSchema, 'suffixMiss': stringSchema, 'suffixPattern': stringSchema, 'suffixValue': stringSchema, 'trieDeepPattern': stringSchema, 'trieDeepValue': stringSchema, 'trieMiss': stringSchema, 'triePattern': stringSchema }, 'required': ['ahoPatterns', 'ahoValue', 'customDelimiter', 'customDelimiterPattern', 'customDelimiterValue', 'exactMiss', 'exactPattern', 'exactValue', 'globBracePattern', 'globClassPattern', 'globDeepPattern', 'globQuestionPattern', 'globValue', 'radixPattern', 'radixValue', 'suffixMiss', 'suffixPattern', 'suffixValue', 'trieDeepPattern', 'trieDeepValue', 'trieMiss', 'triePattern'], 'type': 'object' } as const;
const structuralMatchingInputNode = SchemaNode.defineObject({ 'type': 'object' } as const, { 'ahoPatterns': ahoNode, 'ahoValue': stringNode, 'customDelimiter': stringNode, 'customDelimiterPattern': stringNode, 'customDelimiterValue': stringNode, 'exactMiss': stringNode, 'exactPattern': stringNode, 'exactValue': stringNode, 'globBracePattern': stringNode, 'globClassPattern': stringNode, 'globDeepPattern': stringNode, 'globQuestionPattern': stringNode, 'globValue': stringNode, 'radixPattern': stringNode, 'radixValue': stringNode, 'suffixMiss': stringNode, 'suffixPattern': stringNode, 'suffixValue': stringNode, 'trieDeepPattern': stringNode, 'trieDeepValue': stringNode, 'trieMiss': stringNode, 'triePattern': stringNode }, ['ahoPatterns', 'ahoValue', 'customDelimiter', 'customDelimiterPattern', 'customDelimiterValue', 'exactMiss', 'exactPattern', 'exactValue', 'globBracePattern', 'globClassPattern', 'globDeepPattern', 'globQuestionPattern', 'globValue', 'radixPattern', 'radixValue', 'suffixMiss', 'suffixPattern', 'suffixValue', 'trieDeepPattern', 'trieDeepValue', 'trieMiss', 'triePattern'] as const, { 'additionalProperties': false, 'patternProperties': {} });
const structuralMatchingExpectedSchema = { 'additionalProperties': false, 'properties': { 'aho': stringListSchema, 'exact': booleanSchema }, 'required': ['aho', 'exact'], 'type': 'object' } as const;
const structuralMatchingExpectedNode = SchemaNode.defineObject({ 'type': 'object' } as const, { 'aho': stringListNode, 'exact': booleanNode }, ['aho', 'exact'] as const, { 'additionalProperties': false, 'patternProperties': {} });

const candidateMaterializationInputSchema = { 'additionalProperties': false, 'properties': { 'bloomBitCount': numberSchema, 'bloomHashCount': numberSchema, 'cuckooBucketCount': numberSchema, 'id': stringSchema, 'minimumHashValue': stringSchema, 'ngramQuery': stringSchema, 'ngramRegisteredValue': stringSchema, 'ngramSize': numberSchema, 'rowsPerBand': numberSchema, 'seed': numberSchema, 'signatureSize': numberSchema }, 'required': ['bloomBitCount', 'bloomHashCount', 'cuckooBucketCount', 'id', 'minimumHashValue', 'ngramQuery', 'ngramRegisteredValue', 'ngramSize', 'rowsPerBand', 'seed', 'signatureSize'], 'type': 'object' } as const;
const candidateMaterializationInputNode = SchemaNode.defineObject({ 'type': 'object' } as const, { 'bloomBitCount': numberNode, 'bloomHashCount': numberNode, 'cuckooBucketCount': numberNode, 'id': stringNode, 'minimumHashValue': stringNode, 'ngramQuery': stringNode, 'ngramRegisteredValue': stringNode, 'ngramSize': numberNode, 'rowsPerBand': numberNode, 'seed': numberNode, 'signatureSize': numberNode }, ['bloomBitCount', 'bloomHashCount', 'cuckooBucketCount', 'id', 'minimumHashValue', 'ngramQuery', 'ngramRegisteredValue', 'ngramSize', 'rowsPerBand', 'seed', 'signatureSize'] as const, { 'additionalProperties': false, 'patternProperties': {} });
const candidateMaterializationExpectedSchema = { 'additionalProperties': false, 'properties': { 'lshCandidates': stringListSchema, 'ngramCandidates': stringListSchema }, 'required': ['lshCandidates', 'ngramCandidates'], 'type': 'object' } as const;
const candidateMaterializationExpectedNode = SchemaNode.defineObject({ 'type': 'object' } as const, { 'lshCandidates': stringListNode, 'ngramCandidates': stringListNode }, ['lshCandidates', 'ngramCandidates'] as const, { 'additionalProperties': false, 'patternProperties': {} });

const cuckooRollbackInputSchema = { 'additionalProperties': false, 'properties': { 'bucketCount': numberSchema, 'first': stringSchema, 'options': optionsSchema, 'second': stringSchema }, 'required': ['bucketCount', 'first', 'options', 'second'], 'type': 'object' } as const;
const cuckooRollbackInputNode = SchemaNode.defineObject({ 'type': 'object' } as const, { 'bucketCount': numberNode, 'first': stringNode, 'options': optionsNode, 'second': stringNode }, ['bucketCount', 'first', 'options', 'second'] as const, { 'additionalProperties': false, 'patternProperties': {} });
const cuckooRollbackExpectedSchema = { 'additionalProperties': false, 'properties': { 'secondAdded': booleanSchema }, 'required': ['secondAdded'], 'type': 'object' } as const;
const cuckooRollbackExpectedNode = SchemaNode.defineObject({ 'type': 'object' } as const, { 'secondAdded': booleanNode }, ['secondAdded'] as const, { 'additionalProperties': false, 'patternProperties': {} });

const treeCandidatesInputSchema = { 'additionalProperties': false, 'properties': { 'deepPattern': stringSchema, 'literalPattern': stringSchema, 'singlePattern': stringSchema, 'topic': stringSchema }, 'required': ['deepPattern', 'literalPattern', 'singlePattern', 'topic'], 'type': 'object' } as const;
const treeCandidatesInputNode = SchemaNode.defineObject({ 'type': 'object' } as const, { 'deepPattern': stringNode, 'literalPattern': stringNode, 'singlePattern': stringNode, 'topic': stringNode }, ['deepPattern', 'literalPattern', 'singlePattern', 'topic'] as const, { 'additionalProperties': false, 'patternProperties': {} });
const treeCandidatesExpectedSchema = { 'additionalProperties': false, 'properties': { 'afterUnregister': stringListSchema, 'beforeUnregister': stringListSchema }, 'required': ['afterUnregister', 'beforeUnregister'], 'type': 'object' } as const;
const treeCandidatesExpectedNode = SchemaNode.defineObject({ 'type': 'object' } as const, { 'afterUnregister': stringListNode, 'beforeUnregister': stringListNode }, ['afterUnregister', 'beforeUnregister'] as const, { 'additionalProperties': false, 'patternProperties': {} });

const radixCandidatesInputSchema = { 'additionalProperties': false, 'properties': { 'errorsPattern': stringSchema, 'nestedTopic': stringSchema, 'topic': stringSchema, 'usersPattern': stringSchema }, 'required': ['errorsPattern', 'nestedTopic', 'topic', 'usersPattern'], 'type': 'object' } as const;
const radixCandidatesInputNode = SchemaNode.defineObject({ 'type': 'object' } as const, { 'errorsPattern': stringNode, 'nestedTopic': stringNode, 'topic': stringNode, 'usersPattern': stringNode }, ['errorsPattern', 'nestedTopic', 'topic', 'usersPattern'] as const, { 'additionalProperties': false, 'patternProperties': {} });
const radixCandidatesExpectedSchema = { 'additionalProperties': false, 'properties': { 'candidates': stringListSchema }, 'required': ['candidates'], 'type': 'object' } as const;
const radixCandidatesExpectedNode = SchemaNode.defineObject({ 'type': 'object' } as const, { 'candidates': stringListNode }, ['candidates'] as const, { 'additionalProperties': false, 'patternProperties': {} });

/** The scenario case shapes `Matching.loop.spec.ts` exercises across the matching primitives. */
export namespace MatchingScenarioCaseEntity {
  export const Schema = {
    'oneOf': [
      MatchingScenarioCaseBuilders.scenarioSchema('candidate-materialization', candidateMaterializationInputSchema, candidateMaterializationExpectedSchema),
      MatchingScenarioCaseBuilders.scenarioSchema('cuckoo-rollback', cuckooRollbackInputSchema, cuckooRollbackExpectedSchema),
      MatchingScenarioCaseBuilders.scenarioSchema('normalization-encoding-scoring', normalizationEncodingScoringInputSchema, normalizationEncodingScoringExpectedSchema),
      MatchingScenarioCaseBuilders.scenarioSchema('radix-candidates', radixCandidatesInputSchema, radixCandidatesExpectedSchema),
      MatchingScenarioCaseBuilders.scenarioSchema('structural-matching', structuralMatchingInputSchema, structuralMatchingExpectedSchema),
      MatchingScenarioCaseBuilders.scenarioSchema('tree-candidates', treeCandidatesInputSchema, treeCandidatesExpectedSchema)
    ]
  } as const;

  export const Node = SchemaNode.defineOneOf({}, [
    MatchingScenarioCaseBuilders.scenarioNode('candidate-materialization', candidateMaterializationInputNode, candidateMaterializationExpectedNode),
    MatchingScenarioCaseBuilders.scenarioNode('cuckoo-rollback', cuckooRollbackInputNode, cuckooRollbackExpectedNode),
    MatchingScenarioCaseBuilders.scenarioNode('normalization-encoding-scoring', normalizationEncodingScoringInputNode, normalizationEncodingScoringExpectedNode),
    MatchingScenarioCaseBuilders.scenarioNode('radix-candidates', radixCandidatesInputNode, radixCandidatesExpectedNode),
    MatchingScenarioCaseBuilders.scenarioNode('structural-matching', structuralMatchingInputNode, structuralMatchingExpectedNode),
    MatchingScenarioCaseBuilders.scenarioNode('tree-candidates', treeCandidatesInputNode, treeCandidatesExpectedNode)
  ] as const);
  export type Type = NodeStaticType<typeof Node>;

  export const validate: EntityValidateFunctionInterface<Type> = EntityCompiler.compile<Type>(Schema);
  export const intake: EntityIntakeFunctionInterface<Type> = EntityCompiler.compileIntake<Type>(Schema);
  export const create: EntityCreateFunctionInterface<Type> = EntityCompiler.compileCreate<Type>(Schema);
}
