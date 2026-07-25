const CODE_PATTERN = '**/*.{js,mjs,cjs,ts,tsx}';
const FORMAT_PATTERN = '**/*.{json,jsonc,css,scss,html,md,mdx,yml,yaml}';

const shellQuote = (value) => {
  return `'${value.replaceAll("'", "'\\''")}'`;
};

export default {
  [CODE_PATTERN]: [
    'oxlint --fix --no-error-on-unmatched-pattern',
    'eslint --fix --no-warn-ignored'
  ],
  [FORMAT_PATTERN]: (files) => {
    return `node scripts/lint-staged-format.mjs ${files.map(shellQuote).join(' ')}`;
  }
};
