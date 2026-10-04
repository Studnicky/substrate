import type { IdnaLabelInterface } from './IdnaLabelInterface.js';

import { ACE_PREFIX_PATTERN, LDH_LABEL_PATTERN } from '../../constants/format/NetworkFormatPatterns.js';
import { AceLabelDecoder } from './AceLabelDecoder.js';
import { ContextualRuleValidator } from './ContextualRuleValidator.js';

const SUFFIX = '.invalidsuffix';

/**
 * Maps a single label (ASCII or Unicode, already split at label boundaries) through
 * WHATWG URL's native UTS-46 IDNA mapping, then applies the structural and canonical
 * checks the URL living standard's own `ToASCII` step does not enforce (CheckHyphens off,
 * CheckBidi off, CheckJoiners off, no per-label length cap, no Punycode canonicality check).
 */
export class IdnaLabelProcessor {
  private static readonly LABEL_LENGTH_LIMIT = 63;

  public static process(rawLabel: string): IdnaLabelInterface | undefined {
    if (rawLabel.length === 0) {
      return undefined;
    }
    const aceForm = IdnaLabelProcessor.toStructurallyValidAceForm(rawLabel);
    if (aceForm === undefined) {
      return undefined;
    }
    const codePoints = ACE_PREFIX_PATTERN.test(aceForm)
      ? AceLabelDecoder.decode(aceForm)
      : IdnaLabelProcessor.toCodePoints(aceForm);
    if (codePoints === undefined || !ContextualRuleValidator.isLabelValid(codePoints)) {
      return undefined;
    }
    return { 'aceForm': aceForm, 'codePoints': codePoints };
  }

  private static toStructurallyValidAceForm(rawLabel: string): string | undefined {
    const aceForm = IdnaLabelProcessor.toAceForm(rawLabel);
    if (aceForm === undefined || aceForm.length === 0 || aceForm.length > IdnaLabelProcessor.LABEL_LENGTH_LIMIT || !LDH_LABEL_PATTERN.test(aceForm)) {
      return undefined;
    }
    if (aceForm.startsWith('-') || aceForm.endsWith('-')) {
      return undefined;
    }
    return aceForm;
  }

  /** Appends a synthetic non-numeric label so the URL host parser never mistakes an all-digit label for an IPv4 literal. */
  private static toAceForm(rawLabel: string): string | undefined {
    try {
      const url = new URL(`http://${rawLabel}${SUFFIX}/`);
      const hostname = url.hostname;
      if (!hostname.endsWith(SUFFIX)) {
        return undefined;
      }
      const candidate = hostname.slice(0, -SUFFIX.length);
      const result = candidate.includes('.') ? undefined : candidate;
      return result;
    } catch {
      return undefined;
    }
  }

  private static toCodePoints(aceForm: string): number[] {
    const codePoints: number[] = [];
    for (let index = 0; index < aceForm.length; index += 1) {
      codePoints.push(aceForm.codePointAt(index)!);
    }
    return codePoints;
  }

}
