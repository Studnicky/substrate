
import type { AlphabeticGroupValueEntity } from '../entities/AlphabeticGroupValueEntity.js';
import type { CidrGroupValueEntity } from '../entities/CidrGroupValueEntity.js';
import type { DateGroupValueEntity } from '../entities/DateGroupValueEntity.js';
import type { GroupValueEntity } from '../entities/GroupValueEntity.js';
import type { RangeGroupValueEntity } from '../entities/RangeGroupValueEntity.js';
import type { SemverGroupValueEntity } from '../entities/SemverGroupValueEntity.js';
import type { SequentialGroupValueEntity } from '../entities/SequentialGroupValueEntity.js';
import type { StringGroupValueEntity } from '../entities/StringGroupValueEntity.js';

import { AlphabeticRangeEntity } from '../entities/AlphabeticRangeEntity.js';
import { CidrRangeEntity } from '../entities/CidrRangeEntity.js';
import { DateRangeEntity } from '../entities/DateRangeEntity.js';
import { RangeEntity } from '../entities/RangeEntity.js';
import { SemverRangeEntity } from '../entities/SemverRangeEntity.js';
import { SequentialRangeEntity } from '../entities/SequentialRangeEntity.js';

/** Type guards for drilldown group values and validated node values. */
export class TypeGuards {
  static isAlphabeticGroupValue(value: GroupValueEntity.Type): value is AlphabeticGroupValueEntity.Type {
    const result = value.type === 'alphabetic';
    return result;
  }

  static isAlphabeticRange(value: unknown): value is AlphabeticRangeEntity.Type {
    const result = AlphabeticRangeEntity.validate(value);
    return result;
  }

  static isCidrGroupValue(value: GroupValueEntity.Type): value is CidrGroupValueEntity.Type {
    const result = value.type === 'cidr';
    return result;
  }

  static isCidrRange(value: unknown): value is CidrRangeEntity.Type {
    const result = CidrRangeEntity.validate(value);
    return result;
  }

  static isDateGroupValue(value: GroupValueEntity.Type): value is DateGroupValueEntity.Type {
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

  static isRangeGroupValue(value: GroupValueEntity.Type): value is RangeGroupValueEntity.Type {
    const result = value.type === 'range';
    return result;
  }

  static isSemverGroupValue(value: GroupValueEntity.Type): value is SemverGroupValueEntity.Type {
    const result = value.type === 'semver';
    return result;
  }

  static isSemverRange(value: unknown): value is SemverRangeEntity.Type {
    const result = SemverRangeEntity.validate(value);
    return result;
  }

  static isSequentialGroupValue(value: GroupValueEntity.Type): value is SequentialGroupValueEntity.Type {
    const result = value.type === 'sequential';
    return result;
  }

  static isSequentialRange(value: unknown): value is SequentialRangeEntity.Type {
    const result = SequentialRangeEntity.validate(value);
    return result;
  }

  static isStringGroupValue(value: GroupValueEntity.Type): value is StringGroupValueEntity.Type {
    const result = value.type === 'string';
    return result;
  }
}
