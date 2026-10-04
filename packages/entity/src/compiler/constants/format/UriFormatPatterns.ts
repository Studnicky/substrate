// RFC 3986 (URI) / RFC 3987 (IRI) / RFC 6570 (URI Template) grammar, composed bottom-up
// inside one factory and exposed as a single frozen object; each fragment mirrors one ABNF production.
export const URI_FORMAT_PATTERNS = Object.freeze((() => {
  const decOctet = '(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])';
  const h16Source = '[0-9A-Fa-f]{1,4}';
  const ipv4StrictSource = `${decOctet}\\.${decOctet}\\.${decOctet}\\.${decOctet}`;
  const ipFutureSource = '[vV][0-9A-Fa-f]+\\.[A-Za-z0-9\\-._~!$&\'()*+,;=:]+';

  const pctEncoded = '%[0-9A-Fa-f]{2}';
  const subDelims = '!$&\'()*+,;=';
  const schemeSource = '[A-Za-z][A-Za-z0-9+.\\-]*';

  const asciiUnreserved = 'A-Za-z0-9\\-._~';
  const ucscharRange = '\\u{A0}-\\u{D7FF}\\u{F900}-\\u{FDCF}\\u{FDF0}-\\u{FFEF}\\u{10000}-\\u{1FFFD}'
    + '\\u{20000}-\\u{2FFFD}\\u{30000}-\\u{3FFFD}\\u{40000}-\\u{4FFFD}\\u{50000}-\\u{5FFFD}\\u{60000}-\\u{6FFFD}'
    + '\\u{70000}-\\u{7FFFD}\\u{80000}-\\u{8FFFD}\\u{90000}-\\u{9FFFD}\\u{A0000}-\\u{AFFFD}\\u{B0000}-\\u{BFFFD}'
    + '\\u{C0000}-\\u{CFFFD}\\u{D0000}-\\u{DFFFD}\\u{E1000}-\\u{EFFFD}';
  const iprivateRange = '\\u{E000}-\\u{F8FF}\\u{F0000}-\\u{FFFFD}\\u{100000}-\\u{10FFFD}';

  const uriUnreserved = asciiUnreserved;
  const iriUnreserved = `${asciiUnreserved}${ucscharRange}`;

  const uriPchar = `(?:${pctEncoded}|[${uriUnreserved}${subDelims}:@])`;
  const uriUserinfo = `(?:${pctEncoded}|[${uriUnreserved}${subDelims}:])*`;
  const uriRegname = `(?:${pctEncoded}|[${uriUnreserved}${subDelims}])*`;
  const uriSegment = `${uriPchar}*`;
  const uriSegmentNz = `${uriPchar}+`;
  const uriSegmentNzNc = `(?:${pctEncoded}|[${uriUnreserved}${subDelims}@])+`;
  const uriPathAbempty = `(?:/${uriSegment})*`;
  const uriPathAbsolute = `/(?:${uriSegmentNz}(?:/${uriSegment})*)?`;
  const uriPathNoscheme = `${uriSegmentNzNc}(?:/${uriSegment})*`;
  const uriPathRootless = `${uriSegmentNz}(?:/${uriSegment})*`;
  const uriQuery = `(?:${uriPchar}|[/?])*`;
  const uriFragment = `(?:${uriPchar}|[/?])*`;
  const uriHost = `(?<host>\\[[^\\]]*\\]|${uriRegname})`;
  const uriAuthority = `(?:${uriUserinfo}@)?${uriHost}(?::[0-9]*)?`;
  const uriHierScheme = `(?://${uriAuthority}${uriPathAbempty}|${uriPathAbsolute}|${uriPathRootless}|)`;
  const uriRelativePart = `(?://${uriAuthority}${uriPathAbempty}|${uriPathAbsolute}|${uriPathNoscheme}|)`;
  const uriSuffix = `(?:\\?${uriQuery})?(?:#${uriFragment})?$`;

  const iriPchar = `(?:${pctEncoded}|[${iriUnreserved}${subDelims}:@])`;
  const iriUserinfo = `(?:${pctEncoded}|[${iriUnreserved}${subDelims}:])*`;
  const iriRegname = `(?:${pctEncoded}|[${iriUnreserved}${subDelims}])*`;
  const iriSegment = `${iriPchar}*`;
  const iriSegmentNz = `${iriPchar}+`;
  const iriSegmentNzNc = `(?:${pctEncoded}|[${iriUnreserved}${subDelims}@])+`;
  const iriPathAbempty = `(?:/${iriSegment})*`;
  const iriPathAbsolute = `/(?:${iriSegmentNz}(?:/${iriSegment})*)?`;
  const iriPathNoscheme = `${iriSegmentNzNc}(?:/${iriSegment})*`;
  const iriPathRootless = `${iriSegmentNz}(?:/${iriSegment})*`;
  const iriQuery = `(?:${iriPchar}|[${iprivateRange}]|[/?])*`;
  const iriFragment = `(?:${iriPchar}|[/?])*`;
  const iriHost = `(?<host>\\[[^\\]]*\\]|${iriRegname})`;
  const iriAuthority = `(?:${iriUserinfo}@)?${iriHost}(?::[0-9]*)?`;
  const iriHierScheme = `(?://${iriAuthority}${iriPathAbempty}|${iriPathAbsolute}|${iriPathRootless}|)`;
  const iriRelativePart = `(?://${iriAuthority}${iriPathAbempty}|${iriPathAbsolute}|${iriPathNoscheme}|)`;
  const iriSuffix = `(?:\\?${iriQuery})?(?:#${iriFragment})?$`;

  const templateLiteralChar = `[\\x21\\x23\\x24\\x26-\\x3B\\x3D\\x3F-\\x5B\\x5D\\x5F\\x61-\\x7A\\x7E${ucscharRange}${iprivateRange}]`;
  const templateLiteral = `(?:${pctEncoded}|${templateLiteralChar})`;
  const templateVarchar = `(?:[A-Za-z0-9_]|${pctEncoded})`;
  const templateVarname = `${templateVarchar}(?:\\.?${templateVarchar})*`;
  const templatePrefixLengthDigits = '[1-9][0-9]{0,3}';
  const templatePrefix = `:${templatePrefixLengthDigits}`;
  const templateExplode = '\\*';
  const templateModifier = `(?:${templatePrefix}|${templateExplode})?`;
  const templateVarspec = `${templateVarname}${templateModifier}`;
  const templateVariableList = `${templateVarspec}(?:,${templateVarspec})*`;
  const templateOperator = '[+#./;?&=,!@|]';
  const templateExpression = `\\{(?:${templateOperator})?${templateVariableList}\\}`;

  return {
    'h16Pattern': new RegExp(`^${h16Source}$`, 'u'),
    'ipFuturePattern': new RegExp(`^${ipFutureSource}$`, 'u'),
    'ipv4StrictPattern': new RegExp(`^${ipv4StrictSource}$`, 'u'),
    'iriAbsolutePattern': new RegExp(`^${schemeSource}:${iriHierScheme}${iriSuffix}`, 'u'),
    'iriReferenceRelativePattern': new RegExp(`^${iriRelativePart}${iriSuffix}`, 'u'),
    'uriAbsolutePattern': new RegExp(`^${schemeSource}:${uriHierScheme}${uriSuffix}`, 'u'),
    'uriReferenceRelativePattern': new RegExp(`^${uriRelativePart}${uriSuffix}`, 'u'),
    'uriTemplatePattern': new RegExp(`^(?:${templateLiteral}|${templateExpression})*$`, 'u')
  };
})());
