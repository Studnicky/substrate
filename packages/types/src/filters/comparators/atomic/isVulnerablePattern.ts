/**
 * Checks if a regex pattern is vulnerable to ReDoS attacks
 */

import { REDOS_VULNERABLE_PATTERNS } from './constants/RedosVulnerablePatterns.js';

export class IsVulnerablePattern {
  static isVulnerablePattern(pattern: string | RegExp): boolean   {
    const patternSource = pattern instanceof RegExp ? pattern.source : String(pattern);

    const result = REDOS_VULNERABLE_PATTERNS.some((vulnerablePattern) => {
      const matched = vulnerablePattern.test(patternSource);
      return matched;
    });

    return result;
  }
}
