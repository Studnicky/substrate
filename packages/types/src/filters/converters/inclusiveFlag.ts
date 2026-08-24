/**
 * @module getInclusiveFlag
 * @description Get inclusive flag from condition
 */

/**
 * Get inclusive flag from condition with default
 * @param {Object} condition - condition object
 * @returns {boolean} Whether boundaries are inclusive
 */
function getInclusiveFlag(condition?: { 'inclusive'?: boolean }): boolean {
  return condition?.inclusive !== false;
}

export { getInclusiveFlag };
