import type { IdnaLabelInterface } from './internal/IdnaLabelInterface.js';

import { IDN_LABEL_SEPARATOR_PATTERN } from '../constants/format/NetworkFormatPatterns.js';
import { BidiRuleValidator } from './internal/BidiRuleValidator.js';
import { IdnaLabelProcessor } from './internal/IdnaLabelProcessor.js';

/**
 * RFC 5891 internationalized hostname: labels split on every UTS-46 dot variant, each
 * mapped through WHATWG URL's native IDNA processing, then checked against the RFC 5892
 * ContextJ/ContextO rules and RFC 5893 Bidi Rule the URL living standard leaves disabled.
 */
export class IdnHostnameFormatValidator {
  private static readonly HOSTNAME_LENGTH_LIMIT = 253;

  public static test(value: string): boolean {
    if (value.length === 0) {
      return false;
    }
    const rawLabels = value.split(IDN_LABEL_SEPARATOR_PATTERN);
    const processed: IdnaLabelInterface[] = [];
    for (let index = 0; index < rawLabels.length; index += 1) {
      const label = IdnaLabelProcessor.process(rawLabels[index]!);
      if (label === undefined) {
        return false;
      }
      processed.push(label);
    }
    if (!IdnHostnameFormatValidator.isWithinOverallLength(processed)) {
      return false;
    }
    const result = IdnHostnameFormatValidator.isBidiConsistent(IdnHostnameFormatValidator.toLabelCodePoints(processed));
    return result;
  }

  private static toLabelCodePoints(processed: readonly IdnaLabelInterface[]): (readonly number[])[] {
    const labelCodePoints: (readonly number[])[] = [];
    for (let index = 0; index < processed.length; index += 1) {
      labelCodePoints.push(processed[index]!.codePoints);
    }
    return labelCodePoints;
  }

  private static isWithinOverallLength(processed: readonly IdnaLabelInterface[]): boolean {
    const separatorCount = Math.max(processed.length - 1, 0);
    let totalLength = separatorCount;
    for (let index = 0; index < processed.length; index += 1) {
      totalLength += processed[index]!.aceForm.length;
    }
    const result = totalLength <= IdnHostnameFormatValidator.HOSTNAME_LENGTH_LIMIT;
    return result;
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
