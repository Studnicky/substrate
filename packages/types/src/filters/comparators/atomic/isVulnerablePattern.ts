/**
 * Checks if a regex pattern is vulnerable to ReDoS attacks
 */

export class IsVulnerablePattern {
  static isVulnerablePattern(pattern: string | RegExp): boolean   {
    const patternStr = pattern instanceof RegExp ? pattern.source : String(pattern);

    // Simplified ReDoS detection patterns
    const vulnerablePatterns = [
      // (.*)*+ pattern
      /(\(.*\*.*\))\+/,
      // (.+)+ pattern
      /(\(.*\+.*\))\+/,
      // Nested quantifiers like .*.*
      /\*.*\*/,
      // Nested quantifiers like .+.+
      /\+.*\+/,
      // Multiple range quantifiers
      /\{.*,.*\}.*\{.*,.*\}/
    ];

    return vulnerablePatterns.some((vuln) => {return vuln.test(patternStr);});
  }
}
