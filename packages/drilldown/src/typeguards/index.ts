import type { DrilldownRulesEntity } from '../schema/DrilldownRulesEntity.js';

import { AlphabeticRangeEntity } from '../entities/AlphabeticRangeEntity.js';
import { CidrRangeEntity } from '../entities/CidrRangeEntity.js';
import { DateRangeEntity } from '../entities/DateRangeEntity.js';
import { RangeEntity } from '../entities/RangeEntity.js';
import { SemverRangeEntity } from '../entities/SemverRangeEntity.js';
import { SequentialRangeEntity } from '../entities/SequentialRangeEntity.js';

/** Type guards for drilldown group values and validated node values. */
export class TypeGuards {
  static isAlphabeticGroupValue(value: DrilldownRulesEntity.GroupValueEntity.Type): value is DrilldownRulesEntity.AlphabeticGroupValueEntity.Type {
    const result = value.type === 'alphabetic';
    return result;
  }

  static isAlphabeticRange(value: unknown): value is AlphabeticRangeEntity.Type {
    const result = AlphabeticRangeEntity.validate(value);
    return result;
  }

  static isCidrGroupValue(value: DrilldownRulesEntity.GroupValueEntity.Type): value is DrilldownRulesEntity.CidrGroupValueEntity.Type {
    const result = value.type === 'cidr';
    return result;
  }

  static isCidrRange(value: unknown): value is CidrRangeEntity.Type {
    const result = CidrRangeEntity.validate(value);
    return result;
  }

  static isDateGroupValue(value: DrilldownRulesEntity.GroupValueEntity.Type): value is DrilldownRulesEntity.DateGroupValueEntity.Type {
    const result = value.type === 'date';
    return result;
  }

  static isDateRange(value: unknown): value is DateRangeEntity.Type {
    const result = DateRangeEntity.validate(value);
    return result;
  }

  static isRange(value: unknown): value is RangeEntity.Type {
    const result = RangeEntity.validate(value);
    return result;
  }

  static isRangeGroupValue(value: DrilldownRulesEntity.GroupValueEntity.Type): value is DrilldownRulesEntity.RangeGroupValueEntity.Type {
    const result = value.type === 'range';
    return result;
  }

  static isSemverGroupValue(value: DrilldownRulesEntity.GroupValueEntity.Type): value is DrilldownRulesEntity.SemverGroupValueEntity.Type {
    const result = value.type === 'semver';
    return result;
  }

  static isSemverRange(value: unknown): value is SemverRangeEntity.Type {
    const result = SemverRangeEntity.validate(value);
    return result;
  }

  static isSequentialGroupValue(value: DrilldownRulesEntity.GroupValueEntity.Type): value is DrilldownRulesEntity.SequentialGroupValueEntity.Type {
    const result = value.type === 'sequential';
    return result;
  }

  static isSequentialRange(value: unknown): value is SequentialRangeEntity.Type {
    const result = SequentialRangeEntity.validate(value);
    return result;
  }

  static isStringGroupValue(value: DrilldownRulesEntity.GroupValueEntity.Type): value is DrilldownRulesEntity.StringGroupValueEntity.Type {
    const result = value.type === 'string';
    return result;
  }
}
