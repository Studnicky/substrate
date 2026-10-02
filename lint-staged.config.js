const CODE_PATTERN = "**/*.{js,mjs,cjs,ts,tsx}";
const FORMAT_PATTERN = "**/*.{json,jsonc,css,scss,html,md,mdx,yml,yaml}";

export default {
  [CODE_PATTERN]: [
    "oxlint --fix --no-error-on-unmatched-pattern",
    "eslint --fix --no-warn-ignored",
  ],
  [FORMAT_PATTERN]: "oxfmt --write --no-error-on-unmatched-pattern",
};
