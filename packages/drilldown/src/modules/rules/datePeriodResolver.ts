import type { DateGranularityValueEntity } from '../../entities/DateGranularityValueEntity.js';
import type { DateGroupValueInterface } from '../../interfaces/GroupValueInterface.js';

import { DrilldownUtilities } from '../DrilldownUtilities.js';

interface DatePeriodKeyFunctionInterface {
  (dateString: string, year: number, month: number, day: number): string
}

interface DatePeriodRangeFunctionInterface {
  (key: string, yearString: string, monthString: string, dayString: string): DateGroupValueInterface
}

const DAY_MS = 86_400_000;

class DateArithmetic {
  static computeDaysFromCivil(year: number, month: number, day: number): number {
    const adjustedYear = year - (month <= 2 ? 1 : 0);
    const era = Math.floor(adjustedYear / 400);
    const yearOfEra = adjustedYear - era * 400;
    const monthPrime = month + (month > 2 ? -3 : 9);
    const dayOfYear = Math.floor((153 * monthPrime + 2) / 5) + day - 1;
    const dayOfEra = yearOfEra * 365 + Math.floor(yearOfEra / 4) - Math.floor(yearOfEra / 100) + dayOfYear;
    const result = era * 146_097 + dayOfEra - 719_468;
    return result;
  }

  static toDayOfWeek(epochMs: number): number {
    const day = Math.floor(epochMs / DAY_MS);
    const result = ((day + 4) % 7 + 7) % 7;
    return result;
  }

  static toEpochMs(year: number, monthIndex: number, day: number): number {
    const result = DateArithmetic.computeDaysFromCivil(year, monthIndex + 1, day) * DAY_MS;
    return result;
  }
}

// 'day' has no transformation (the key IS the date string) and is handled directly by
// `getDatePeriodKey` before consulting this dispatch map — a dispatch entry for it would be a
// pure identity forward with nothing to inline it into.
const datePeriodKeyDispatch: Record<Exclude<DateGranularityValueEntity.Type, 'day'>, DatePeriodKeyFunctionInterface> = {
  'month': (_, year, month) => { const result = `${year}-${String(month + 1).padStart(2, '0')}`; return result; },
  'quarter': (_, year, month) => { const result = `${year}-Q${Math.floor(month / 3) + 1}`; return result; },
  'week': (_, year, month, day) => {
    const epochMs = DateArithmetic.toEpochMs(year, month, day);
    const weekStart = epochMs - DateArithmetic.toDayOfWeek(epochMs) * DAY_MS;
    const result = DrilldownUtilities.isoFromEpochMs(weekStart)?.slice(0, 10) ?? '1970-01-01';
    return result;
  },
  'year': (_, year) => { const result = `${year}`; return result; }
};

const datePeriodRangeDispatch: Record<DateGranularityValueEntity.Type, DatePeriodRangeFunctionInterface> = {
  'day': (_key, yearString, monthString, dayString) => {
    const year = parseInt(yearString, 10);
    const month = parseInt(monthString, 10) - 1;
    const day = parseInt(dayString, 10);

    return {
      'after': DateArithmetic.toEpochMs(year, month, day),
      'before': DateArithmetic.toEpochMs(year, month, day + 1),
      'type': 'date'
    };
  },
  'month': (_, yearString, monthString) => {
    const year = parseInt(yearString, 10);
    const month = parseInt(monthString, 10) - 1;

    return {
      'after': DateArithmetic.toEpochMs(year, month, 1),
      'before': month === 11 ? DateArithmetic.toEpochMs(year + 1, 0, 1) : DateArithmetic.toEpochMs(year, month + 1, 1),
      'type': 'date'
    };
  },
  'quarter': (key) => {
    const quarterParts = key.split('-Q');
    const year = parseInt(quarterParts[0] ?? '1970', 10);
    const quarter = parseInt(quarterParts[1] ?? '1', 10);
    const startMonth = (quarter - 1) * 3;

    return {
      'after': DateArithmetic.toEpochMs(year, startMonth, 1),
      'before': quarter === 4 ? DateArithmetic.toEpochMs(year + 1, 0, 1) : DateArithmetic.toEpochMs(year, startMonth + 3, 1),
      'type': 'date'
    };
  },
  'week': (_key, yearString, monthString, dayString) => {
    const year = parseInt(yearString, 10);
    const month = parseInt(monthString, 10) - 1;
    const day = parseInt(dayString, 10);

    return {
      'after': DateArithmetic.toEpochMs(year, month, day),
      'before': DateArithmetic.toEpochMs(year, month, day + 7),
      'type': 'date'
    };
  },
  'year': (key) => {
    const year = parseInt(key, 10);

    return {
      'after': DateArithmetic.toEpochMs(year, 0, 1),
      'before': DateArithmetic.toEpochMs(year + 1, 0, 1),
      'type': 'date'
    };
  }
};

/**
 * Resolves date period keys and ranges for date grouping operations.
 */
export const datePeriodResolver = {
  /**
   * Converts a period key back to a date range group value.
   * @param key - Period key string
   * @param granularity - The date granularity level
   * @returns DateGroupValueInterface with after/before range
   */
  'datePeriodToRange': function (key: string, granularity: DateGranularityValueEntity.Type): DateGroupValueInterface {
    const parts = key.split('-');
    const yearString = parts[0] ?? '1970';
    const monthString = parts[1] ?? '01';
    const dayString = parts[2] ?? '01';
    const handler = datePeriodRangeDispatch[granularity];
    const result = handler(key, yearString, monthString, dayString);

    return result;
  },

  /**
   * Generates a period key from a date string at the specified granularity.
   * @param dateString - ISO date string (YYYY-MM-DD)
   * @param granularity - The date granularity level
   * @returns Period key string for grouping
   */
  'getDatePeriodKey': function (dateString: string, granularity: DateGranularityValueEntity.Type): string {
    if (granularity === 'day') {
      return dateString;
    }

    const parts = dateString.split('-');
    const yearString = parts[0] ?? '1970';
    const monthString = parts[1] ?? '01';
    const dayString = parts[2] ?? '01';
    const year = parseInt(yearString, 10);
    const month = parseInt(monthString, 10) - 1;
    const day = parseInt(dayString, 10);
    const handler = datePeriodKeyDispatch[granularity];
    const result = handler(dateString, year, month, day);

    return result;
  }
};
