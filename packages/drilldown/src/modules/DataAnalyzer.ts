import { Predicates } from '@studnicky/types';

import type { BoundsAccumulatorEntity } from '../entities/BoundsAccumulatorEntity.js';
import type { GroupingOptionsEntity } from '../entities/GroupingOptionsEntity.js';
import type { JsonPropertyTypeEntity } from '../entities/JsonPropertyTypeEntity.js';
import type { PropertyBoundsEntity } from '../entities/PropertyBoundsEntity.js';
import type { AnalysisResultInterface, DataRecordInterface, PropertyInfoInterface } from '../interfaces/index.js';

import { DrilldownUtilities } from './DrilldownUtilities.js';

class Bounds {
  static deriveBounds(type: JsonPropertyTypeEntity.Type, accumulator: BoundsAccumulatorEntity.Type): PropertyBoundsEntity.Type | undefined {
    if (type === 'number' && accumulator.numberMinimum !== null && accumulator.numberMaximum !== null) {
      return { 'maximum': accumulator.numberMaximum, 'minimum': accumulator.numberMinimum, 'type': 'number' };
    }
    if (type === 'date' && accumulator.dateMinimum !== null && accumulator.dateMaximum !== null) {
      return {
        'maximum': accumulator.dateMaximum,
        'minimum': accumulator.dateMinimum,
        'type': 'date'
      };
    }
    return undefined;
  }

  static toDateMs(value: unknown): number | null {
    const result = Predicates.isNumberType(value) && Predicates.isFiniteNumber(value) ? Math.trunc(value) : null;
    return result;
  }

  static toFiniteNumber(value: unknown): number | null {
    const numeric = Predicates.isNumberType(value) ? value : Number(value);
    const result = Predicates.isFiniteNumber(numeric) ? numeric : null;
    return result;
  }

  static update(accumulator: BoundsAccumulatorEntity.Type, type: JsonPropertyTypeEntity.Type, value: unknown): void {
    if (type === 'number') {
      const numeric = Bounds.toFiniteNumber(value);
      if (numeric === null) { return; }
      accumulator.numberMinimum = accumulator.numberMinimum === null ? numeric : Math.min(accumulator.numberMinimum, numeric);
      accumulator.numberMaximum = accumulator.numberMaximum === null ? numeric : Math.max(accumulator.numberMaximum, numeric);
      return;
    }
    if (type === 'date') {
      const ms = Bounds.toDateMs(value);
      if (ms === null) { return; }
      accumulator.dateMinimum = accumulator.dateMinimum === null ? ms : Math.min(accumulator.dateMinimum, ms);
      accumulator.dateMaximum = accumulator.dateMaximum === null ? ms : Math.max(accumulator.dateMaximum, ms);
    }
  }
}

class PropertyClassification {
  static detectPropertyType(path: string, value: unknown): JsonPropertyTypeEntity.Type {
    if (Predicates.isNumberType(value) && path.endsWith('EpochMs')) {
      return 'date';
    }
    const result = DrilldownUtilities.detectType(value);
    return result;
  }

  static toDistributionKey(type: JsonPropertyTypeEntity.Type, value: unknown): string {
    if (type === 'date' && Predicates.isNumberType(value)) {
      const result = DrilldownUtilities.isoFromEpochMs(value) ?? String(value);
      return result;
    }
    const result = String(value);
    return result;
  }
}

/**
 * Analyzes data records to discover groupable properties and recommend optimal grouping strategies.
 * Examines property distributions, cardinality, and data types to determine which properties
 * are suitable for hierarchical grouping operations.
 *
 * Use as a static utility - all methods are static for direct access without instantiation.
 */
export class DataAnalyzer {
  /**
   * Analyzes data records to identify groupable properties and recommend grouping order.
   * @param data - Array of data records to analyze
   * @param options - Configuration options that may exclude certain properties
   * @returns Analysis result containing property metadata and recommended grouping order
   * @example
   * const result = DataAnalyzer.analyze(records, { excludeProperties: ['id'] });
   * console.log(result.recommendedGrouping); // ['status', 'category', 'type']
   */
  static analyze(data: DataRecordInterface[], options: GroupingOptionsEntity.Type = {}): AnalysisResultInterface {
    const properties = new Map<string, PropertyInfoInterface>();
    const propertyPaths = DataAnalyzer.discoverProperties(data);

    for (const path of propertyPaths) {
      const info = DataAnalyzer.analyzeProperty(data, path);

      if (DataAnalyzer.isGroupable(info, options)) {
        properties.set(path, info);
      }
    }

    const recommendedGrouping = DataAnalyzer.getRecommendedGrouping(properties);

    return {
      'properties': properties,
      'recommendedGrouping': recommendedGrouping,
      'totalRecords': data.length
    };
  }

  private static analyzeProperty(data: DataRecordInterface[], path: string): PropertyInfoInterface {
    const distribution = new Map<string, number>();
    const bounds: BoundsAccumulatorEntity.Type = { 'dateMaximum': null, 'dateMinimum': null, 'numberMaximum': null, 'numberMinimum': null };
    let nullCount = 0;
    let firstType: JsonPropertyTypeEntity.Type | null = null;

    for (let index = 0; index < data.length; index++) {
      const item = data[index]!;
      const value = DrilldownUtilities.getPropertyValue(item, path);

      if (Predicates.isNullish(value)) {
        nullCount++;
        continue;
      }

      firstType ??= PropertyClassification.detectPropertyType(path, value);
      const stringValue = PropertyClassification.toDistributionKey(firstType, value);
      distribution.set(stringValue, (distribution.get(stringValue) ?? 0) + 1);
      Bounds.update(bounds, firstType, value);
    }

    const coverage = (data.length - nullCount) / data.length;
    const propertyType = firstType ?? 'null';
    const propertyBounds = Bounds.deriveBounds(propertyType, bounds);

    const result: PropertyInfoInterface = {
      'cardinality': distribution.size,
      'coverage': coverage,
      'distribution': distribution,
      'name': path,
      'nullCount': nullCount,
      'type': propertyType
    };
    if (propertyBounds !== undefined) {
      result.bounds = propertyBounds;
    }
    return result;
  }

  private static collectPaths(object: unknown, prefix: string, paths: Set<string>, depth = 0): void {
    if (depth > 3 || Predicates.isNullish(object)) {
      return;
    }

    if (Predicates.isArray(object)) {
      return;
    }

    if (typeof object === 'object') {
      const record = object as Record<string, unknown>;
      const keys = Object.keys(record);

      for (let index = 0; index < keys.length; index++) {
        const key = keys[index]!;
        const path = prefix !== '' ? `${prefix}.${key}` : key;
        const value = record[key];

        if (!Predicates.isNullish(value) && !Predicates.isArray(value) && typeof value !== 'object') {
          paths.add(path);
        }
        else if (typeof value === 'object' && !Predicates.isArray(value)) {
          DataAnalyzer.collectPaths(value, path, paths, depth + 1);
        }
      }
    }
  }

  private static discoverProperties(data: DataRecordInterface[]): Set<string> {
    const paths = new Set<string>();

    if (data.length === 0) {
      return paths;
    }

    const sample = data.slice(0, Math.min(100, data.length));

    for (let index = 0; index < sample.length; index++) {
      DataAnalyzer.collectPaths(sample[index]!, '', paths);
    }

    return paths;
  }

  private static getRecommendedGrouping(properties: Map<string, PropertyInfoInterface>): string[] {
    const groupableProps = Array.from(properties.values())
      .filter((prop) => { const result = prop.cardinality > 0 && prop.coverage >= 0.5;
        return result; });

    if (groupableProps.length === 0) {
      return [];
    }

    const sortedProps = groupableProps.toSorted((first, second) => { const result = first.cardinality - second.cardinality;
      return result; });

    const computedResult = sortedProps.map((prop) => { const result = prop.name; return result; });
    return computedResult;
  }

  private static isGroupable(info: PropertyInfoInterface, options: GroupingOptionsEntity.Type): boolean {
    if (options.excludeProperties?.includes(info.name) === true) {
      return false;
    }

    if (info.coverage < 0.5) {
      return false;
    }

    if (info.cardinality === 0) {
      return false;
    }

    if (info.type === 'object' || info.type === 'array') {
      return false;
    }

    if (info.cardinality > 1000 && info.type === 'string') {
      return false;
    }

    return true;
  }
}
