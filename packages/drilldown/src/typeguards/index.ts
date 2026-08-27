import type { AlphabeticRangeEntity } from '../entities/AlphabeticRangeEntity.js';
import type { CidrRangeEntity } from '../entities/CidrRangeEntity.js';
import type { DateRangeEntity } from '../entities/DateRangeEntity.js';
import type { OutlierMarkerEntity } from '../entities/OutlierMarkerEntity.js';
import type { RangeEntity } from '../entities/RangeEntity.js';
import type { SemverRangeEntity } from '../entities/SemverRangeEntity.js';
import type { SequentialRangeEntity } from '../entities/SequentialRangeEntity.js';
import type {
  AlphabeticGroupValueInterface,
  CidrGroupValueInterface,
  DateGroupValueInterface,
  RangeGroupValueInterface,
  SemverGroupValueInterface,
  SequentialGroupValueInterface,
  StringGroupValueInterface
} from '../interfaces/GroupValueInterface.js';
import type { GroupValueUnionType } from '../types/index.js';

/**
 * Type guards for the drilldown group-value and range union types.
 */
export class TypeGuards {
  /**
   * Type guard for AlphabeticGroupValueInterface.
   */
  static isAlphabeticGroupValue(value: GroupValueUnionType): value is AlphabeticGroupValueInterface {
    const result = 'start' in value && 'end' in value;
    return result;
  }

  /**
   * Type guard for AlphabeticRangeEntity.Type node values.
   */
  static isAlphabeticRange(value: unknown): value is AlphabeticRangeEntity.Type {
    const result = value !== null
      && typeof value === 'object'
      && 'start' in value
      && 'end' in value
      && !('after' in value)
      && !('before' in value);
    return result;
  }

  /**
   * Type guard for CidrGroupValueInterface.
   */
  static isCidrGroupValue(value: GroupValueUnionType): value is CidrGroupValueInterface {
    const result = 'cidr' in value;
    return result;
  }

  /**
   * Type guard for CidrRangeEntity.Type node values.
   */
  static isCidrRange(value: unknown): value is CidrRangeEntity.Type {
    const result = value !== null && typeof value === 'object' && 'cidr' in value;
    return result;
  }

  /**
   * Type guard for DateGroupValueInterface.
   */
  static isDateGroupValue(value: GroupValueUnionType): value is DateGroupValueInterface {
    const result = 'after' in value && 'before' in value;
    return result;
  }

  /**
   * Type guard for DateRangeEntity.Type node values.
   */
  static isDateRange(value: unknown): value is DateRangeEntity.Type {
    const result = value !== null && typeof value === 'object' && 'after' in value && 'before' in value;
    return result;
  }

  /**
   * Type guard for OutlierMarkerEntity.Type node values.
   */
  static isOutlierMarker(value: unknown): value is OutlierMarkerEntity.Type {
    const result = value !== null && typeof value === 'object' && 'outliers' in value;
    return result;
  }

  /**
   * Type guard for numeric RangeEntity.Type node values.
   */
  static isRange(value: unknown): value is RangeEntity.Type {
    const result = value !== null
      && typeof value === 'object'
      && 'minimum' in value
      && 'maximum' in value
      && !('cidr' in value)
      && !('semver' in value)
      && !('prefix' in value);
    return result;
  }

  /**
   * Type guard for RangeGroupValueInterface.
   */
  static isRangeGroupValue(value: GroupValueUnionType): value is RangeGroupValueInterface {
    const result = 'minimum' in value && 'maximum' in value && !('sequential' in value);
    return result;
  }

  /**
   * Type guard for SemverGroupValueInterface.
   */
  static isSemverGroupValue(value: GroupValueUnionType): value is SemverGroupValueInterface {
    const result = 'semver' in value;
    return result;
  }

  /**
   * Type guard for SemverRangeEntity.Type node values.
   */
  static isSemverRange(value: unknown): value is SemverRangeEntity.Type {
    const result = value !== null && typeof value === 'object' && 'semver' in value;
    return result;
  }

  /**
   * Type guard for SequentialGroupValueInterface.
   */
  static isSequentialGroupValue(value: GroupValueUnionType): value is SequentialGroupValueInterface {
    const result = 'sequential' in value;
    return result;
  }

  /**
   * Type guard for SequentialRangeEntity.Type node values.
   */
  static isSequentialRange(value: unknown): value is SequentialRangeEntity.Type {
    const result = value !== null
      && typeof value === 'object'
      && 'prefix' in value
      && 'minimum' in value
      && 'maximum' in value
      && 'padding' in value;
    return result;
  }

  /**
   * Type guard for StringGroupValueInterface.
   */
  static isStringGroupValue(value: GroupValueUnionType): value is StringGroupValueInterface {
    const result = 'match' in value;
    return result;
  }
}
