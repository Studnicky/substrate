import { ACE_PREFIX_PATTERN, LDH_LABEL_PATTERN } from '../constants/format/NetworkFormatPatterns.js';
import { AceLabelDecoder } from './internal/AceLabelDecoder.js';
import { BidiRuleValidator } from './internal/BidiRuleValidator.js';
import { ContextualRuleValidator } from './internal/ContextualRuleValidator.js';

/**
 * RFC 1123 ASCII hostname: LDH labels, with A-labels (`xn--...`) validated against
 * their decoded RFC 5892 ContextJ/ContextO rules and RFC 5893 Bidi Rule.
 */
export class HostnameFormatValidator {
  private static readonly LABEL_LENGTH_LIMIT = 63;
  private static readonly HOSTNAME_LENGTH_LIMIT = 253;

  public static test(value: string): boolean {
    if (value.length === 0 || value.length > HostnameFormatValidator.HOSTNAME_LENGTH_LIMIT) {
      return false;
    }
    const labels = value.split('.');
    const labelCodePoints: number[][] = [];
    for (let index = 0; index < labels.length; index += 1) {
      const codePoints = HostnameFormatValidator.processLabel(labels[index]!);
      if (codePoints === undefined) {
        return false;
      }
      labelCodePoints.push(codePoints);
    }
    const result = HostnameFormatValidator.isBidiConsistent(labelCodePoints);
    return result;
  }

  private static processLabel(label: string): number[] | undefined {
    if (label.length === 0 || label.length > HostnameFormatValidator.LABEL_LENGTH_LIMIT || !LDH_LABEL_PATTERN.test(label)) {
      return undefined;
    }
    if (label.startsWith('-') || label.endsWith('-')) {
      return undefined;
    }
    const codePoints = ACE_PREFIX_PATTERN.test(label) ? AceLabelDecoder.decode(label) : HostnameFormatValidator.toCodePoints(label);
    if (codePoints === undefined || !ContextualRuleValidator.isLabelValid(codePoints)) {
      return undefined;
    }
    return codePoints;
  }

  private static toCodePoints(label: string): number[] {
    const codePoints: number[] = [];
    for (let index = 0; index < label.length; index += 1) {
      codePoints.push(label.codePointAt(index)!);
    }
    return codePoints;
  }

  private static isBidiConsistent(labelCodePoints: readonly (readonly number[])[]): boolean {
    if (!BidiRuleValidator.isDomainBidi(labelCodePoints)) {
      return true;
    }
    for (let index = 0; index < labelCodePoints.length; index += 1) {
      const codePoints = labelCodePoints[index];
      if (codePoints !== undefined && !BidiRuleValidator.isLabelBidiValid(codePoints)) {
        return false;
      }
    }
    return true;
  }
}
