/**
 * @module InclusiveFlagResolver
 * @description Get inclusive flag from condition
 */

/**
 * Get inclusive flag from condition
 */
export class InclusiveFlagResolver {
  /**
   * Get inclusive flag from condition with default
   * @param {Object} condition - condition object
   * @returns {boolean} Whether boundaries are inclusive
   */
  static getInclusiveFlag(condition?: { 'inclusive'?: boolean }): boolean {
    return condition?.inclusive !== false;
  }
}
