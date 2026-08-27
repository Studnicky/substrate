/** Tuning defaults and precompiled regex patterns used throughout the drilldown engine. */
export const DRILLDOWN_DEFAULTS = {
  'dateCapturePattern': new RegExp('^(\\d{4}-\\d{2}-\\d{2})'),
  'datePattern': new RegExp('^\\d{4}-\\d{2}-\\d{2}'),
  'defaultDensityThreshold': 0.8,
  'defaultGroupCount': 5,
  'defaultMaximumStringValues': 50,
  'leadingVPattern': new RegExp('^v', 'i'),
  'maximumPathCacheSize': 1000,
  'minimumPropertyScore': 20,
  'minimumSequentialValues': 5,
  'regexSpecialCharsPattern': new RegExp('[.*+?^${}()|[\\]\\\\]', 'g'),
  'semverDigitPattern': new RegExp('^\\d+\\.\\d+'),
  'semverPrefixPattern': new RegExp('^[\\^~>=<]+'),
  'sequentialPattern': new RegExp('^(.+?)(\\d+)(.*)$'),
  'targetGroupMultiplier': 0.8,
  'typeDetectionSampleSize': 100,
  'typeDetectionThreshold': 0.8
} as const;
