/** The default 2020-12 dialect `$id`, and a minimal metaschema naming the Format-Assertion vocabulary that shadows it for the optional-format measurement. */
export const CONFORMANCE_DIALECT = Object.freeze({
  'defaultDialectUri': 'https://json-schema.org/draft/2020-12/schema',
  'formatAssertionMetaschema': Object.freeze({
    '$vocabulary': Object.freeze({ 'https://json-schema.org/draft/2020-12/vocab/format-assertion': true })
  })
});
