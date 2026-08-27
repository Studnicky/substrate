import type { AutoGroupingConfigEntity } from '../../entities/AutoGroupingConfigEntity.js';
import type { GroupingOptionsEntity } from '../../entities/GroupingOptionsEntity.js';
import type { ScoredPropertyEntity } from '../../entities/ScoredPropertyEntity.js';
import type { DataRecordInterface, PropertyInfoInterface } from '../../interfaces/index.js';
import type { DrilldownRulesEntity } from '../../schema/DrilldownRulesEntity.js';
import type { GroupValueUnionType } from '../../types/index.js';

import { DRILLDOWN_DEFAULTS } from '../../constants/index.js';
import { DataAnalyzer } from '../DataAnalyzer.js';
import { DrilldownUtilities } from '../DrilldownUtilities.js';
import { valueDiscoveryEngine } from './valueDiscoveryEngine.js';

class LinearNodeTree {
  static build(property: string, values: GroupValueUnionType[]): DrilldownRulesEntity.Type {
    return {
      'group': [{
        'property': property,
        'values': values
      }]
    };
  }
}

class OptimalProperties {
  static calculate(
    analysis: { 'properties': Map<string, PropertyInfoInterface>, 'totalRecords': number },
    config: AutoGroupingConfigEntity.Type
  ): string[] {
    const totalRecords = analysis.totalRecords;
    const properties = Array.from(analysis.properties.values());

    const targetCardinality = config.mode === 'count'
      ? config.target
      : Math.ceil(totalRecords / config.target);

    const scored = properties.map((prop) => {
      const nonNullRecords = totalRecords - prop.nullCount;
      const effectiveCardinality = Math.min(prop.cardinality, nonNullRecords);
      const ratio = effectiveCardinality / targetCardinality;
      const logRatio = Math.abs(Math.log10(ratio));
      const proximityScore = Math.max(0, 1 - logRatio);
      const coverageScore = prop.coverage;
      const distributionValues = prop.distribution !== undefined ? Array.from(prop.distribution.values()) : [];
      const distributionScore = DrilldownUtilities.calculateDistributionBalance(distributionValues);
      const totalScore = (proximityScore * 50) + (coverageScore * 30) + (distributionScore * 20);

      return {
        'cardinality': effectiveCardinality,
        'property': prop.name,
        'score': totalScore
      };
    });

    const sortedScored = scored.toSorted((first, second) => { const result = second.score - first.score;
      return result; });
    const selectedProperties = PropertySelector.selectForTarget(sortedScored, config, totalRecords);

    return selectedProperties;
  }
}

class PropertySelector {
  static selectForTarget(
    scoredProperties: ScoredPropertyEntity.Type[],
    config: AutoGroupingConfigEntity.Type,
    totalRecords: number
  ): string[] {
    const selected: string[] = [];
    let estimatedGroups = 1;

    const targetGroups = config.mode === 'count'
      ? config.target
      : Math.ceil(totalRecords / config.target);

    for (let index = 0; index < scoredProperties.length; index++) {
      const prop = scoredProperties[index]!;

      if (prop.score < DRILLDOWN_DEFAULTS.minimumPropertyScore) {
        break;
      }

      selected.push(prop.property);
      estimatedGroups *= prop.cardinality;

      if (estimatedGroups >= targetGroups * DRILLDOWN_DEFAULTS.targetGroupMultiplier) {
        break;
      }
    }

    return selected;
  }
}

/**
 * Generates drilldown rules based on data analysis.
 */
export const ruleGenerator = {
  /**
   * Generates optimized drilldown rules for data based on configuration.
   * @param data - Array of data records to analyze
   * @param config - Auto-grouping configuration specifying target counts
   * @returns Generated drilldown rules with type-aware value buckets
   */
  'generateRules': function (data: DataRecordInterface[], config: AutoGroupingConfigEntity.Type): DrilldownRulesEntity.Type {
    const analysis = DataAnalyzer.analyze(data);
    const properties = OptimalProperties.calculate(analysis, config);
    const firstProperty = properties[0];

    if (firstProperty === undefined) {
      return {};
    }

    const values = valueDiscoveryEngine.discoverValues(data, firstProperty);

    const result = LinearNodeTree.build(firstProperty, values);
    return result;
  },

  /**
   * Returns the full ordered list of properties for multi-level grouping,
   * scored and ranked by how well they partition the data toward the target.
   * @param data - Array of data records to analyze
   * @param config - Auto-grouping configuration specifying target counts or sizes
   * @param excludeProperties - Property names to exclude from consideration
   * @returns Ordered list of property names for progressive grouping
   */
  'orderProperties': function (
    data: DataRecordInterface[],
    config: AutoGroupingConfigEntity.Type,
    excludeProperties?: string[]
  ): string[] {
    const options: GroupingOptionsEntity.Type = {};

    if (excludeProperties !== undefined) {
      options.excludeProperties = excludeProperties;
    }

    const analysis = DataAnalyzer.analyze(data, options);

    const result = OptimalProperties.calculate(analysis, config);
    return result;
  }
};
