import { DateFormatValidator } from './format/DateFormatValidator.js';
import { DateTimeFormatValidator } from './format/DateTimeFormatValidator.js';
import { DurationFormatValidator } from './format/DurationFormatValidator.js';
import { EmailFormatValidator } from './format/EmailFormatValidator.js';
import { HostnameFormatValidator } from './format/HostnameFormatValidator.js';
import { IdnEmailFormatValidator } from './format/IdnEmailFormatValidator.js';
import { IdnHostnameFormatValidator } from './format/IdnHostnameFormatValidator.js';
import { Ipv4FormatValidator } from './format/Ipv4FormatValidator.js';
import { Ipv6FormatValidator } from './format/Ipv6FormatValidator.js';
import { IriFormatValidator } from './format/IriFormatValidator.js';
import { IriReferenceFormatValidator } from './format/IriReferenceFormatValidator.js';
import { JsonPointerFormatValidator } from './format/JsonPointerFormatValidator.js';
import { RegexFormatValidator } from './format/RegexFormatValidator.js';
import { RelativeJsonPointerFormatValidator } from './format/RelativeJsonPointerFormatValidator.js';
import { TimeFormatValidator } from './format/TimeFormatValidator.js';
import { UriFormatValidator } from './format/UriFormatValidator.js';
import { UriReferenceFormatValidator } from './format/UriReferenceFormatValidator.js';
import { UriTemplateFormatValidator } from './format/UriTemplateFormatValidator.js';
import { UuidFormatValidator } from './format/UuidFormatValidator.js';

interface FormatCheckerInterface {
  (value: string): boolean;
}

/** `Map`-backed `format` dispatch, built once at module load. Unknown formats pass (annotation-only). */
export class FormatValidators {
  private static readonly CHECKERS = new Map<string, FormatCheckerInterface>([
    ['date', DateFormatValidator.test],
    ['date-time', DateTimeFormatValidator.test],
    ['duration', DurationFormatValidator.test],
    ['email', EmailFormatValidator.test],
    ['hostname', HostnameFormatValidator.test],
    ['idn-email', IdnEmailFormatValidator.test],
    ['idn-hostname', IdnHostnameFormatValidator.test],
    ['ipv4', Ipv4FormatValidator.test],
    ['ipv6', Ipv6FormatValidator.test],
    ['iri', IriFormatValidator.test],
    ['iri-reference', IriReferenceFormatValidator.test],
    ['json-pointer', JsonPointerFormatValidator.test],
    ['regex', RegexFormatValidator.test],
    ['relative-json-pointer', RelativeJsonPointerFormatValidator.test],
    ['time', TimeFormatValidator.test],
    ['uri', UriFormatValidator.test],
    ['uri-reference', UriReferenceFormatValidator.test],
    ['uri-template', UriTemplateFormatValidator.test],
    ['uuid', UuidFormatValidator.test]
  ]);

  /** Tests `value` against a declared format. An unrecognised format name is not an assertion failure. */
  public static test(format: string, value: string): boolean {
    const checker = FormatValidators.CHECKERS.get(format);
    const result = checker === undefined || checker(value);
    return result;
  }
}
