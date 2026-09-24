import { BidiClassifier } from './BidiClassifier.js';

/** RFC 5893 Bidi Rule: applied to every label once any label in the domain is RTL-triggering. */
export class BidiRuleValidator {
  public static isDomainBidi(labelsCodePoints: readonly (readonly number[])[]): boolean {
    for (let labelIndex = 0; labelIndex < labelsCodePoints.length; labelIndex += 1) {
      const label = labelsCodePoints[labelIndex];
      if (label !== undefined && BidiRuleValidator.labelTriggersBidi(label)) {
        return true;
      }
    }
    return false;
  }

  public static isLabelBidiValid(codePoints: readonly number[]): boolean {
    if (codePoints.length === 0) {
      return false;
    }
    const firstClass = BidiClassifier.classify(codePoints[0]!);
    if (firstClass === 'L') {
      const result = BidiRuleValidator.isLtrLabelValid(codePoints);
      return result;
    }
    if (firstClass === 'R' || firstClass === 'AL') {
      const result = BidiRuleValidator.isRtlLabelValid(codePoints);
      return result;
    }
    return false;
  }

  private static labelTriggersBidi(codePoints: readonly number[]): boolean {
    for (let index = 0; index < codePoints.length; index += 1) {
      const codePoint = codePoints[index];
      if (codePoint !== undefined && BidiClassifier.isRtlDomainTrigger(BidiClassifier.classify(codePoint))) {
        return true;
      }
    }
    return false;
  }

  private static isLtrLabelValid(codePoints: readonly number[]): boolean {
    let lastSignificantClass: string | undefined;
    for (let index = 0; index < codePoints.length; index += 1) {
      const bidiClass = BidiClassifier.classify(codePoints[index]!);
      if (bidiClass === 'R' || bidiClass === 'AL' || bidiClass === 'AN') {
        return false;
      }
      if (bidiClass !== 'NSM') {
        lastSignificantClass = bidiClass;
      }
    }
    const result = lastSignificantClass === 'L' || lastSignificantClass === 'EN';
    return result;
  }

  private static isRtlLabelValid(codePoints: readonly number[]): boolean {
    const labelSummary = BidiRuleValidator.summarizeRtlLabel(codePoints);
    if (labelSummary === undefined) {
      return false;
    }
    if (labelSummary.sawAn && labelSummary.sawEn) {
      return false;
    }
    const lastClass = labelSummary.lastSignificantClass;
    const result = lastClass === 'R' || lastClass === 'AL' || lastClass === 'EN' || lastClass === 'AN';
    return result;
  }

  private static summarizeRtlLabel(codePoints: readonly number[]): { 'lastSignificantClass': string | undefined; 'sawAn': boolean; 'sawEn': boolean } | undefined {
    let sawAn = false;
    let sawEn = false;
    let lastSignificantClass: string | undefined;
    for (let index = 0; index < codePoints.length; index += 1) {
      const bidiClass = BidiClassifier.classify(codePoints[index]!);
      if (bidiClass === 'L') {
        return undefined;
      }
      sawAn = sawAn || bidiClass === 'AN';
      sawEn = sawEn || bidiClass === 'EN';
      if (bidiClass !== 'NSM') {
        lastSignificantClass = bidiClass;
      }
    }
    return { 'lastSignificantClass': lastSignificantClass, 'sawAn': sawAn, 'sawEn': sawEn };
  }
}
