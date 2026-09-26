import type { SchemaNodeInterface } from '@studnicky/entity/interfaces';

import { SchemaNode } from '@studnicky/entity/types';

import type { DrilldownRulesSchemaInterface } from '../interfaces/DrilldownRulesSchemaInterface.js';
import type { DrilldownRulesStaticInterface } from '../interfaces/DrilldownRulesStaticInterface.js';

import { AlphabeticRangeEntity } from '../entities/AlphabeticRangeEntity.js';
import { CidrRangeEntity } from '../entities/CidrRangeEntity.js';
import { DateRangeEntity } from '../entities/DateRangeEntity.js';
import { DateRangeFilterRuleEntity } from '../entities/DateRangeFilterRuleEntity.js';
import { FilterOperatorEntity } from '../entities/FilterOperatorEntity.js';
import { NumericRangeFilterRuleEntity } from '../entities/NumericRangeFilterRuleEntity.js';
import { RangeEntity } from '../entities/RangeEntity.js';
import { SemverRangeEntity } from '../entities/SemverRangeEntity.js';
import { SequentialRangeEntity } from '../entities/SequentialRangeEntity.js';
import { SortDirectionEntity } from '../entities/SortDirectionEntity.js';
import { SortRuleEntity } from '../entities/SortRuleEntity.js';
import { ValueFilterRuleEntity } from '../entities/ValueFilterRuleEntity.js';

/** Builds every group-value variant plus `groupRule`/`groupValue` against `self`, so the root `Node` and every flat variant entity share one construction, never two. */
class DrilldownGroupValuePieceBuilder {
  public static build(self: SchemaNodeInterface<DrilldownRulesSchemaInterface, DrilldownRulesStaticInterface>) {
    const alphabeticGroupValue = SchemaNode.defineObject({ 'type': 'object' } as const, {
      'end': SchemaNode.defineString(AlphabeticRangeEntity.Schema.properties.end),
      'rules': SchemaNode.defineReference('#', self),
      'start': SchemaNode.defineString(AlphabeticRangeEntity.Schema.properties.start),
      'type': SchemaNode.defineConst({}, 'alphabetic' as const)
    }, ['end', 'start', 'type'] as const, { 'additionalProperties': false, 'patternProperties': {} });
    const cidrGroupValue = SchemaNode.defineObject({ 'type': 'object' } as const, {
      'cidr': SchemaNode.defineString(CidrRangeEntity.Schema.properties.cidr),
      'rules': SchemaNode.defineReference('#', self),
      'type': SchemaNode.defineConst({}, 'cidr' as const)
    }, ['cidr', 'type'] as const, { 'additionalProperties': false, 'patternProperties': {} });
    const dateGroupValue = SchemaNode.defineObject({ 'type': 'object' } as const, {
      'after': SchemaNode.defineNumber(DateRangeEntity.Schema.properties.after),
      'before': SchemaNode.defineNumber(DateRangeEntity.Schema.properties.before),
      'rules': SchemaNode.defineReference('#', self),
      'type': SchemaNode.defineConst({}, 'date' as const)
    }, ['after', 'before', 'type'] as const, { 'additionalProperties': false, 'patternProperties': {} });
    const rangeGroupValue = SchemaNode.defineObject({ 'type': 'object' } as const, {
      'maximum': SchemaNode.defineNumber(RangeEntity.Schema.properties.maximum),
      'minimum': SchemaNode.defineNumber(RangeEntity.Schema.properties.minimum),
      'rules': SchemaNode.defineReference('#', self),
      'type': SchemaNode.defineConst({}, 'range' as const)
    }, ['maximum', 'minimum', 'type'] as const, { 'additionalProperties': false, 'patternProperties': {} });
    const semverGroupValue = SchemaNode.defineObject({ 'type': 'object' } as const, {
      'rules': SchemaNode.defineReference('#', self),
      'semver': SchemaNode.defineString(SemverRangeEntity.Schema.properties.semver),
      'type': SchemaNode.defineConst({}, 'semver' as const)
    }, ['semver', 'type'] as const, { 'additionalProperties': false, 'patternProperties': {} });
    const sequentialGroupValue = SchemaNode.defineObject({ 'type': 'object' } as const, {
      'rules': SchemaNode.defineReference('#', self),
      'sequential': SchemaNode.defineObject({ 'type': 'object' } as const, {
        'maximum': SchemaNode.defineNumber(SequentialRangeEntity.Schema.properties.maximum),
        'minimum': SchemaNode.defineNumber(SequentialRangeEntity.Schema.properties.minimum),
        'padding': SchemaNode.defineNumber(SequentialRangeEntity.Schema.properties.padding),
        'prefix': SchemaNode.defineString(SequentialRangeEntity.Schema.properties.prefix),
        'suffix': SchemaNode.defineString(SequentialRangeEntity.Schema.properties.suffix)
      }, ['maximum', 'minimum', 'padding', 'prefix'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
      'type': SchemaNode.defineConst({}, 'sequential' as const)
    }, ['sequential', 'type'] as const, { 'additionalProperties': false, 'patternProperties': {} });
    const stringGroupValue = SchemaNode.defineObject({ 'type': 'object' } as const, {
      'match': SchemaNode.defineString({ 'type': 'string' } as const),
      'rules': SchemaNode.defineReference('#', self),
      'type': SchemaNode.defineConst({}, 'string' as const)
    }, ['match', 'type'] as const, { 'additionalProperties': false, 'patternProperties': {} });
    const groupValue = SchemaNode.defineOneOf({}, [
      alphabeticGroupValue, cidrGroupValue, dateGroupValue, rangeGroupValue, semverGroupValue, sequentialGroupValue, stringGroupValue
    ] as const);
    const groupRule = SchemaNode.defineObject({ 'type': 'object' } as const, {
      'groupOutliers': SchemaNode.defineBoolean({ 'type': 'boolean' } as const),
      'property': SchemaNode.defineString({ 'type': 'string' } as const),
      'values': SchemaNode.defineArray({ 'type': 'array' } as const, groupValue, undefined)
    }, ['property'] as const, { 'additionalProperties': false, 'patternProperties': {} });

    return {
      'alphabeticGroupValue': alphabeticGroupValue,
      'cidrGroupValue': cidrGroupValue,
      'dateGroupValue': dateGroupValue,
      'groupRule': groupRule,
      'groupValue': groupValue,
      'rangeGroupValue': rangeGroupValue,
      'semverGroupValue': semverGroupValue,
      'sequentialGroupValue': sequentialGroupValue,
      'stringGroupValue': stringGroupValue
    };
  }
}

/** Builds `filter`/`sort`'s sibling nodes — not part of the recursion, so bundling them via `ReturnType` here (the same pattern `pieces` uses) keeps every field of `DrilldownRulesNodeBuilder.build`'s declared return type independently nameable. */
class DrilldownFilterSortNodeBuilder {
  public static build() {
    const dateRangeFilterRuleNode = SchemaNode.defineObject({ 'type': 'object' } as const, {
      'maximum': SchemaNode.defineNumber(DateRangeFilterRuleEntity.Schema.properties.maximum),
      'minimum': SchemaNode.defineNumber(DateRangeFilterRuleEntity.Schema.properties.minimum),
      'property': SchemaNode.defineString(DateRangeFilterRuleEntity.Schema.properties.property),
      'type': SchemaNode.defineConst({}, 'date' as const)
    }, ['property', 'type'] as const, { 'additionalProperties': false, 'patternProperties': {} });
    const numericRangeFilterRuleNode = SchemaNode.defineObject({ 'type': 'object' } as const, {
      'maximum': SchemaNode.defineNumber(NumericRangeFilterRuleEntity.Schema.properties.maximum),
      'minimum': SchemaNode.defineNumber(NumericRangeFilterRuleEntity.Schema.properties.minimum),
      'property': SchemaNode.defineString(NumericRangeFilterRuleEntity.Schema.properties.property),
      'type': SchemaNode.defineConst({}, 'numeric' as const)
    }, ['property', 'type'] as const, { 'additionalProperties': false, 'patternProperties': {} });
    const valueFilterRuleNode = SchemaNode.defineObject({ 'type': 'object' } as const, {
      'operator': SchemaNode.defineEnum({}, FilterOperatorEntity.Schema.enum),
      'property': SchemaNode.defineString(ValueFilterRuleEntity.Schema.properties.property),
      'type': SchemaNode.defineConst({}, 'value' as const),
      'values': SchemaNode.defineArray({ 'type': 'array' } as const, SchemaNode.defineString({ 'type': 'string' } as const), undefined)
    }, ['operator', 'property', 'type', 'values'] as const, { 'additionalProperties': false, 'patternProperties': {} });

    /** Shared with `DrillDownConfigEntity`'s own `filter` property — both compose the same three variants. */
    const filterRuleNode = SchemaNode.defineOneOf({}, [dateRangeFilterRuleNode, numericRangeFilterRuleNode, valueFilterRuleNode] as const);

    const sortRuleNode = SchemaNode.defineObject({ 'type': 'object' } as const, { 'direction': SchemaNode.defineEnum({}, SortDirectionEntity.Schema.enum), 'property': SchemaNode.defineString(SortRuleEntity.Schema.properties.property) }, ['direction', 'property'] as const, { 'additionalProperties': false, 'patternProperties': {} });

    return {
      'filterRuleNode': filterRuleNode,
      'sortRuleNode': sortRuleNode
    };
  }
}

/** `build`'s declared return shape: every field is independently nameable via `ReturnType`, so `DrilldownRulesStaticInterface` — itself a generic argument inside `build` — never has to wait on inferring `build`'s own return type to resolve. An inferred return type here reintroduces the cycle. */
interface DrilldownRulesNodeBuilderResultInterface {
  readonly 'filterSort': ReturnType<typeof DrilldownFilterSortNodeBuilder.build>;
  readonly 'node': SchemaNodeInterface<DrilldownRulesSchemaInterface, DrilldownRulesStaticInterface>;
  readonly 'pieces': ReturnType<typeof DrilldownGroupValuePieceBuilder.build>;
}

/** Builds the one recursive root `Node`, its `filter`/`sort` siblings, and every group-value piece that both `DrilldownRulesEntity` and each flat variant entity read from — one `defineRecursive` call, one recursion anchor, no restated schema. */
class DrilldownRulesNodeBuilder {
  public static build(): DrilldownRulesNodeBuilderResultInterface {
    const filterSort = DrilldownFilterSortNodeBuilder.build();
    let capturedGroupValuePieces: ReturnType<typeof DrilldownGroupValuePieceBuilder.build> | undefined;

    const node = SchemaNode.defineRecursive<DrilldownRulesSchemaInterface, DrilldownRulesStaticInterface>((self) => {
      const pieces = DrilldownGroupValuePieceBuilder.build(self);

      capturedGroupValuePieces = pieces;

      const built = SchemaNode.defineObject({ 'type': 'object' } as const, {
        'filter': SchemaNode.defineArray({ 'type': 'array' } as const, filterSort.filterRuleNode, undefined),
        'group': SchemaNode.defineArray({ 'type': 'array' } as const, pieces.groupRule, undefined),
        'sort': SchemaNode.defineArray({ 'type': 'array' } as const, filterSort.sortRuleNode, undefined)
      }, [] as const, { 'additionalProperties': false, 'patternProperties': {} });

      return built;
    });

    if (capturedGroupValuePieces === undefined) {
      throw new Error('defineRecursive did not synchronously build the group-value pieces');
    }

    return {
      'filterSort': filterSort,
      'node': node,
      'pieces': capturedGroupValuePieces
    };
  }
}

export const drilldownRulesNodes: DrilldownRulesNodeBuilderResultInterface = DrilldownRulesNodeBuilder.build();
