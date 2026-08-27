import { Predicates } from '@studnicky/types';

import type { FilterRuleEntity } from '../../entities/FilterRuleEntity.js';
import type { DrilldownRulesEntity } from '../../schema/DrilldownRulesEntity.js';

import { MatcherHandlerLookup } from '../matchers/index.js';

class Filter {
  static validate(filter: FilterRuleEntity.Type, path: string): string[] {
    const errors: string[] = [];

    if (filter.property === '') {
      errors.push(`${path}: missing 'property' field`);
    }

    if (filter.type === 'value' && !Predicates.isArray(filter.values)) {
      errors.push(`${path}: value filter requires 'values' array`);
    }

    return errors;
  }
}

class GroupNodeValidator {
  static validate(node: DrilldownRulesEntity.Type, path: string[], errors: string[]): void {
    const pathString = path.join('.');

    if (node.filter !== undefined) {
      for (let index = 0; index < node.filter.length; index++) {
        const filterItem = node.filter[index];

        if (filterItem !== undefined) {
          const filterErrors = Filter.validate(filterItem, `${pathString}.filter[${index}]`);

          errors.push(...filterErrors);
        }
      }
    }

    if (node.group !== undefined) {
      for (let index = 0; index < node.group.length; index++) {
        const groupRule = node.group[index];

        if (groupRule === undefined) {
          continue;
        }

        const groupPath = `${pathString}.group[${index}]`;

        if (groupRule.property === '') {
          errors.push(`${groupPath}: missing 'property' field`);
        }

        if (groupRule.values !== undefined) {
          for (let valueIndex = 0; valueIndex < groupRule.values.length; valueIndex++) {
            const valueDef = groupRule.values[valueIndex];

            if (valueDef === undefined) {
              continue;
            }

            const valuePath = `${groupPath}.values[${valueIndex}]`;
            const handler = MatcherHandlerLookup.findMatcherHandler(valueDef);

            if (handler !== null) {
              const validationErrors = handler.validate(valueDef, valuePath);

              errors.push(...validationErrors);
            }
            else {
              errors.push(`${valuePath}: must have 'match', 'minimum'/'maximum', 'cidr', 'semver', 'after'/'before', 'sequential', or 'start'/'end' field`);
            }

            if (valueDef.rules !== undefined) {
              const nestedPath = path.slice();

              nestedPath.push(`group[${index}].values[${valueIndex}].rules`);
              GroupNodeValidator.validate(valueDef.rules, nestedPath, errors);
            }
          }
        }
      }
    }
  }
}

/**
 * Validates drilldown rules for structural correctness.
 */
export const ruleValidator = {
  /**
   * Validates drilldown rules and returns validation results.
   * @param rules - The drilldown rules to validate
   * @returns Object with valid boolean and errors array
   */
  'validate': function (rules: DrilldownRulesEntity.Type): { 'errors': string[]
    'valid': boolean; } {
    const errors: string[] = [];

    GroupNodeValidator.validate(rules, ['rules'], errors);

    return {
      'errors': errors,
      'valid': errors.length === 0
    };
  }
};
