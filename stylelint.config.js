/** @type {import('stylelint').Config} */
export default {
  extends: ['stylelint-config-standard', 'stylelint-config-html/astro'],
  ignoreFiles: ['dist/**', 'node_modules/**'],
  rules: {
    // BEM blocks/elements/modifiers (e.g. .cv__section-title, .node--floating).
    'selector-class-pattern': null,
    // Fluid type scale tokens (e.g. --step--1) from tokens.css.
    'custom-property-pattern': null,
    // Scoped Astro sheets often reorder states; specificity warnings are noisy here.
    'no-descending-specificity': null,
    // Astro scoped styles use :global() for cross-boundary selectors.
    'selector-pseudo-class-no-unknown': [
      true,
      {
        ignorePseudoClasses: ['global'],
      },
    ],
    // Keep deliberate vendor prefixes used for Safari / legacy support.
    'property-no-vendor-prefix': [
      true,
      {
        ignoreProperties: [
          '-webkit-user-select',
          '-webkit-text-size-adjust',
          '-webkit-appearance',
          'user-select',
          'appearance',
          'text-size-adjust',
        ],
      },
    ],
    // Plain @import matches the rest of the codebase.
    'import-notation': null,
    // Token values use exact fractions; browsers round at computed-value time.
    'number-max-precision': null,
    // Inline `style="--reveal-delay: …"` attributes are parsed as their own
    // stylesheet, so this rule would demand a blank line inside an HTML
    // attribute. Consecutive custom properties are exempt anyway, which is all
    // tokens.css has.
    'custom-property-empty-line-before': null,
  },
};
